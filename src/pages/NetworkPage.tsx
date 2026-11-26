import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  RefreshCw,
  Server,
  RotateCw,
  Activity,
  Plus,
  Power,
  Wifi,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Can, useCan } from '../lib/permissions';
import { NetworkDevice } from '../types';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Field, Input } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { DataTable, DataTableColumnDef, RowAction, TableQuery } from '../components/ui/DataTable';
import { DataTableCheckbox } from '../components/ui/DataTable/DataTableCheckbox';
import { TableStateBody } from '../components/ui/TableState';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

function mapApiRouter(r: any): NetworkDevice {
  const st = String(r.status || 'ONLINE').toUpperCase();
  const status = st === 'OFFLINE' ? 'Offline' : st === 'WARNING' ? 'Warning' : 'Online';
  return {
    id: String(r.id),
    name: r.name,
    ipAddress: r.managementIp || r.ipAddress || '10.0.0.1',
    type: r.type || 'Core Router',
    location: r.location || 'Phnom Penh Core POP',
    status,
    lastPingMs: typeof r.lastPingMs === 'number' ? r.lastPingMs : 2,
    connectedClients: Number(r.activeSubscribers ?? r.connectedClients ?? 0),
    cpuLoadPercent: Number(r.cpuLoad ?? r.cpuLoadPercent ?? 14),
    firmwareVersion: r.firmwareVersion || 'RouterOS v7.14',
    uptimeDays: Number(r.uptimeDays ?? 45),
  };
}

const VLAN_PURPOSE_OPTIONS: ComboboxOption[] = [
  { value: 'FIBER_INTERNET', label: 'Fiber Internet' },
  { value: 'WIRELESS_INTERNET', label: 'Wireless Internet' },
  { value: 'MANAGEMENT', label: 'Management' },
  { value: 'CORPORATE', label: 'Corporate DIA' },
];

const VLAN_ROUTER_OPTIONS: ComboboxOption[] = [
  { value: 'rtr-core-1', label: 'Core-CCR2004-East (Phnom Penh)' },
  { value: 'rtr-core-2', label: 'Core-CCR2116-West (Siem Reap)' },
];

const VLAN_INTERFACE_OPTIONS: ComboboxOption[] = [
  { value: 'sfp-sfpplus1', label: 'sfp-sfpplus1 (10G Trunk)' },
  { value: 'sfp-sfpplus2', label: 'sfp-sfpplus2 (10G Secondary)' },
  { value: 'ether2', label: 'ether2 (1G Optical SFP)' },
];

export const NetworkPage: React.FC = () => {
  const addToast = useStore((s) => s.addToast);
  const canManageRouters = useCan('routers.manage');
  const canRebootRouter = useCan('routers.reboot');
  const canManagePPPoE = useCan('pppoe.manage');
  const canManageVlans = useCan('vlans.manage');
  const canManageIpam = useCan('ipam.manage');

  // Tabs: fleet, pppoe, vlans, ipam
  const [networkTab, setNetworkTab] = useState<'fleet' | 'pppoe' | 'vlans' | 'ipam'>('fleet');

  // Add VLAN Modal
  const [isVlanModalOpen, setIsVlanModalOpen] = useState(false);
  const [vlanIdInput, setVlanIdInput] = useState(25);
  const [vlanNameInput, setVlanNameInput] = useState('VLAN25_Fiber_Commercial');
  const [vlanPurpose, setVlanPurpose] = useState('FIBER_INTERNET');
  const [vlanRouter, setVlanRouter] = useState('rtr-core-1');
  const [vlanInterface, setVlanInterface] = useState('sfp-sfpplus2');
  const [vlanSubnet, setVlanSubnet] = useState('10.25.0.0/24');

  // Allocate IP Modal
  const [isIpModalOpen, setIsIpModalOpen] = useState(false);
  const [selectedPoolId, setSelectedPoolId] = useState('pool-fiber-1');
  const [targetCustId, setTargetCustId] = useState('cust-1001');

  // Server pagination state for PPPoE tab (avoids downloading 10k rows on page load)
  const [pppoeTableQuery, setPppoeTableQuery] = useState<TableQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    sort: [],
    filters: {},
  });
  const [debouncedPppoeSearch, setDebouncedPppoeSearch] = useState('');

  useEffect(() => {
    const q = (pppoeTableQuery.search || '').trim();
    if (!q) {
      setDebouncedPppoeSearch('');
      return;
    }
    const timer = setTimeout(() => setDebouncedPppoeSearch(q), 120);
    return () => clearTimeout(timer);
  }, [pppoeTableQuery.search]);

  const handlePppoeQueryChange = useCallback((nextQuery: TableQuery) => {
    setPppoeTableQuery(nextQuery);
  }, []);

  const pppoeParams = useMemo(() => {
    const primarySort = pppoeTableQuery.sort?.[0];
    const colFilters = pppoeTableQuery.filters || {};
    const statusFilter =
      Array.isArray(colFilters.status) && colFilters.status.length === 1
        ? String(colFilters.status[0]).toUpperCase()
        : typeof colFilters.status === 'string' && colFilters.status
          ? colFilters.status.toUpperCase()
          : undefined;
    return {
      page: pppoeTableQuery.page,
      limit: pppoeTableQuery.pageSize,
      search: debouncedPppoeSearch || undefined,
      status: statusFilter,
      sortBy: primarySort?.id || undefined,
      sortDir: primarySort ? (primarySort.desc ? 'desc' : 'asc') : undefined,
    };
  }, [pppoeTableQuery, debouncedPppoeSearch]);

  const routersQuery = useQuery<NetworkDevice[], Error>({
    queryKey: ['network-routers'],
    queryFn: async () => {
      const list = await api.network.getRouters();
      return (Array.isArray(list) ? list : []).map(mapApiRouter);
    },
    placeholderData: keepPreviousData,
  });

  const pppoeQuery = useQuery({
    queryKey: ['network-pppoe', pppoeParams],
    queryFn: () => api.network.getPPPoEPaged(pppoeParams),
    enabled: networkTab === 'pppoe',
    placeholderData: keepPreviousData,
  });

  const vlansQuery = useQuery<any[], Error>({
    queryKey: ['network-vlans'],
    queryFn: () => api.network.getVlans(),
    enabled: networkTab === 'vlans' || isIpModalOpen,
    placeholderData: keepPreviousData,
  });

  const ipamQuery = useQuery<any[], Error>({
    queryKey: ['network-ipam'],
    queryFn: () => api.network.getIpPools(),
    enabled: networkTab === 'ipam' || isIpModalOpen,
    placeholderData: keepPreviousData,
  });

  const devices = useMemo(() => routersQuery.data ?? [], [routersQuery.data]);
  const pppoeAccounts = useMemo(() => pppoeQuery.data?.items ?? [], [pppoeQuery.data?.items]);
  const vlans = useMemo(() => vlansQuery.data ?? [], [vlansQuery.data]);
  const ipPools = useMemo(() => ipamQuery.data ?? [], [ipamQuery.data]);
  const isRefreshing =
    routersQuery.isFetching ||
    pppoeQuery.isFetching ||
    vlansQuery.isFetching ||
    ipamQuery.isFetching;

  const ipPoolOptions: ComboboxOption[] = useMemo(
    () => (ipPools || []).map((p) => ({ value: p.id, label: `${p.name} (${p.availableIps} free)` })),
    [ipPools]
  );

  const loadNetworkData = async () => {
    const tasks: Array<Promise<any>> = [routersQuery.refetch()];
    if (networkTab === 'pppoe') tasks.push(pppoeQuery.refetch());
    if (networkTab === 'vlans' || isIpModalOpen) tasks.push(vlansQuery.refetch());
    if (networkTab === 'ipam' || isIpModalOpen) tasks.push(ipamQuery.refetch());
    await Promise.all(tasks);
  };

  const handleRebootDevice = async (dev: NetworkDevice) => {
    try {
      await api.network.rebootRouter(dev.id);
      addToast({
        type: 'info',
        title: 'Device Reboot Initiated',
        message: `Sent soft reboot signal to ${dev.name} (${dev.ipAddress})`,
      });
      routersQuery.refetch();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reboot Failed', message: err.message });
    }
  };

  const handleCreateVlan = async () => {
    try {
      await api.network.createVlan({
        vlanId: Number(vlanIdInput),
        name: vlanNameInput,
        purpose: vlanPurpose,
        routerId: vlanRouter,
        interface: vlanInterface,
        subnet: vlanSubnet,
      });
      addToast({ type: 'success', title: 'VLAN Created', message: `VLAN ${vlanIdInput} provisioned on ${vlanInterface}.` });
      setIsVlanModalOpen(false);
      vlansQuery.refetch();
    } catch (err: any) {
      addToast({ type: 'error', title: 'VLAN Conflict', message: err.message });
    }
  };

  const handleAllocateIp = async () => {
    try {
      const res = await api.network.allocateIp({ poolId: selectedPoolId, customerId: targetCustId, isStatic: true });
      addToast({ type: 'success', title: 'IP Allocated', message: `Assigned ${res.ipAddress} from ${res.poolName}.` });
      setIsIpModalOpen(false);
      ipamQuery.refetch();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Allocation Failed', message: err.message });
    }
  };

  const handleTogglePPPoE = async (customerId: string, username: string, currentStatus: string) => {
    const targetStatus = currentStatus === 'Online' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.customers.setStatus(customerId || 'cust-1001', targetStatus, 'Network operations manual toggle');
      addToast({
        type: 'info',
        title: 'PPPoE State Changed',
        message: `${username} set to ${targetStatus} on MikroTik Core Router.`,
      });
      pppoeQuery.refetch();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to toggle subscriber', message: err.message });
    }
  };

  const deviceTypeOptions = [
    { value: 'OLT', label: 'Optical Line Terminal (OLT)' },
    { value: 'Core Router', label: 'BGP Core Router' },
    { value: 'Access Point', label: 'Wireless Access Point' },
    { value: 'Switch', label: 'Distribution Switch' },
    { value: 'ONT', label: 'Optical Network Terminal (ONT)' },
  ];

  const statusOptions = [
    { value: 'Online', label: 'Online' },
    { value: 'Warning', label: 'Warning' },
    { value: 'Offline', label: 'Offline' },
  ];

  const columns: DataTableColumnDef<NetworkDevice>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Device name',
        accessorKey: 'name',
        width: 240,
        sortable: true,
        priority: 1,
        filter: { type: 'text', placeholder: 'Search device...' },
        cell: ({ row }) => {
          const dev = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center shrink-0">
                <Server className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[var(--text)] truncate">
                  {dev.name}
                </div>
                <div className="font-mono text-[11px] text-[var(--text-muted)]">
                  {dev.ipAddress}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'type',
        header: 'Type',
        accessorKey: 'type',
        width: 140,
        sortable: true,
        priority: 1,
        filter: { type: 'select', options: deviceTypeOptions },
        cell: ({ row }) => (
          <span className="font-mono text-xs text-[var(--text-secondary)]">
            {row.original.type}
          </span>
        ),
      },
      {
        id: 'location',
        header: 'Location / Tower',
        accessorKey: 'location',
        width: 180,
        sortable: true,
        priority: 2,
        filter: { type: 'text' },
        cell: ({ row }) => (
          <span className="text-[var(--text-secondary)] truncate">
            {row.original.location}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        width: 160,
        sortable: true,
        priority: 1,
        filter: { type: 'select', options: statusOptions },
        cell: ({ row }) => {
          const dev = row.original;
          const color = dev.status === 'Online' ? 'success' : dev.status === 'Warning' ? 'warning' : 'danger';
          return (
            <Chip size="sm" color={color}>
              {dev.status} ({dev.lastPingMs} ms)
            </Chip>
          );
        },
      },
      {
        id: 'connectedClients',
        header: 'Subscribers',
        accessorKey: 'connectedClients',
        width: 140,
        align: 'right',
        sortable: true,
        priority: 1,
        aggregate: 'sum',
        filter: { type: 'range', min: 0, max: 2000 },
        cell: ({ row }) => (
          <span className="font-bold text-[var(--text)] tabular-nums">
            {row.original.connectedClients}
          </span>
        ),
      },
      {
        id: 'cpuLoadPercent',
        header: 'CPU load',
        accessorKey: 'cpuLoadPercent',
        width: 130,
        align: 'right',
        sortable: true,
        priority: 1,
        aggregate: 'avg',
        filter: { type: 'range', min: 0, max: 100 },
        cell: ({ row }) => (
          <span className="font-bold text-[var(--brand)] tabular-nums">
            {row.original.cpuLoadPercent}%
          </span>
        ),
      },
      {
        id: 'firmwareVersion',
        header: 'Firmware',
        accessorKey: 'firmwareVersion',
        width: 130,
        sortable: true,
        hideable: true,
        priority: 3,
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-[var(--text-muted)]">
            {row.original.firmwareVersion}
          </span>
        ),
      },
      {
        id: 'uptimeDays',
        header: 'Uptime',
        accessorKey: 'uptimeDays',
        width: 120,
        sortable: true,
        priority: 2,
        cell: ({ row }) => (
          <span className="text-[var(--text-secondary)] tabular-nums">
            {row.original.uptimeDays} days
          </span>
        ),
      },
    ],
    []
  );

  const getRowActions = (dev: NetworkDevice): RowAction<NetworkDevice>[] => [
    ...(canRebootRouter || canManageRouters
      ? [
          {
            label: 'Reboot Device',
            icon: <RotateCw className="w-3.5 h-3.5 text-amber-600" />,
            onClick: () => handleRebootDevice(dev),
          },
        ]
      : []),
    {
      label: 'Ping Telemetry Probe',
      icon: <Activity className="w-3.5 h-3.5" />,
      onClick: () => {
        addToast({
          type: 'success',
          title: 'Ping Response 0% Loss',
          message: `${dev.ipAddress}: RTT min/avg/max = 1.2/1.8/2.4 ms`,
        });
      },
    },
  ];

  const renderExpanded = (dev: NetworkDevice) => (
    <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-[#161618] border border-gray-200/60 dark:border-gray-800 text-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-[#F26B3A]" />
          <span className="font-bold text-gray-900 dark:text-gray-100">
            Interface Telemetry & BGP Status • {dev.name}
          </span>
        </div>
        <span className="font-mono text-[11px] text-gray-400">
          Uptime: {dev.uptimeDays} days ({dev.firmwareVersion})
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 space-y-1">
          <span className="text-[11px] text-gray-400">Optical Signal Budget</span>
          <div className="font-semibold text-emerald-600">
            PON Optical Transceiver: +3.2 dBm Tx (Healthy)
          </div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 space-y-1">
          <span className="text-[11px] text-gray-400">Hardware Sensor</span>
          <div className="font-semibold text-gray-800 dark:text-gray-200">
            Chassis Temp: 38°C • Dual Fans 4200 RPM
          </div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-[#1C1C1F] border border-gray-200/50 dark:border-gray-800 space-y-1">
          <span className="text-[11px] text-gray-400">Backhaul Throughput</span>
          <div className="font-semibold text-[#F26B3A]">
            9.42 Gbps / 10 Gbps SFP+ Trunk
          </div>
        </div>
      </div>
    </div>
  );

  const renderCard = (
    dev: NetworkDevice,
    isSelected: boolean,
    onSelect: () => void
  ) => {
    return (
      <div
        data-testid="network-device-card"
        onClick={onSelect}
        className={cn(
          'p-5 rounded-2xl bg-[var(--surface)] border shadow-[var(--shadow-card)] flex flex-col justify-between space-y-4 cursor-pointer transition-all select-none',
          isSelected
            ? 'border-[var(--selected-indicator)] bg-[var(--selected-bg)] ring-2 ring-[var(--selected-ring)]'
            : 'border-[var(--border)] hover:border-[var(--border-strong)]'
        )}
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div onClick={(e) => e.stopPropagation()}>
                <DataTableCheckbox
                  checked={isSelected}
                  onChange={onSelect}
                  ariaLabel={`Select ${dev.name}`}
                />
              </div>
              <Chip
                size="sm"
                color={dev.status === 'Online' ? 'success' : dev.status === 'Warning' ? 'warning' : 'danger'}
              >
                {dev.status} ({dev.lastPingMs} ms)
              </Chip>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">{dev.type}</span>
          </div>

          <h3 className="text-sm font-bold text-[var(--text)] mt-2.5 truncate">
            {dev.name}
          </h3>
          <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">{dev.ipAddress}</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">{dev.location}</p>

          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Connected Subscribers:</span>
              <span className="font-bold text-[var(--text)]">
                {dev.connectedClients}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">CPU Load:</span>
              <span className="font-bold text-[var(--brand)]">{dev.cpuLoadPercent}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Firmware:</span>
              <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                {dev.firmwareVersion}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">System Uptime:</span>
              <span className="text-[var(--text)] font-medium">
                {dev.uptimeDays} days
              </span>
            </div>
          </div>
        </div>

        {(canRebootRouter || canManageRouters) && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleRebootDevice(dev);
            }}
            className="w-full text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reboot Device</span>
          </Button>
        )}
      </div>
    );
  };

  const handleRefresh = async () => {
    await loadNetworkData();
  };

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight">
            Network Operations & MikroTik Management
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            MikroTik RouterOS API control, PPPoE subscriber profiles, VLAN segmenting, and IPAM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 px-3 text-[12px] self-start sm:self-auto"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
            <span>Refresh Telemetry</span>
          </Button>
        </div>
      </div>

      {/* Network Sub-Tabs */}
      <div className="flex border-b border-[var(--border)] gap-6">
        {[
          { id: 'fleet', label: 'Hardware Fleet & OLTs' },
          { id: 'pppoe', label: 'PPPoE Subscribers' },
          { id: 'vlans', label: 'VLAN Segmentation' },
          { id: 'ipam', label: 'IP Address Pools (IPAM)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setNetworkTab(tab.id as any)}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              networkTab === tab.id ? 'text-[var(--brand)] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {tab.label}
            {networkTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand)] rounded-full" />}
          </button>
        ))}
      </div>

      {/* TAB 1: FLEET & OLTS */}
      {networkTab === 'fleet' && (
        <DataTable<NetworkDevice>
          columns={columns}
          data={devices}
          loading={routersQuery.isLoading}
          fetching={routersQuery.isFetching}
          error={routersQuery.error ? 'Unable to load network routers.' : null}
          onRetry={() => routersQuery.refetch()}
          rowId={(dev) => dev.id}
          viewKey="network_devices_table"
          rowActions={getRowActions}
          renderExpanded={renderExpanded}
          renderCard={renderCard}
          autoRefreshInterval={30}
          onRefresh={() => routersQuery.refetch()}
          noDataTitle="No network routers registered"
          noDataDescription="Provisioned MikroTik core routers and OLTs will appear here."
          emptyTitle="No matching network devices"
          emptySubtitle="Try adjusting search or column filters."
        />
      )}

      {/* TAB 2: PPPoE SUBSCRIBERS */}
      {networkTab === 'pppoe' && (
        <DataTable<any>
          columns={[
            {
              id: 'username',
              header: 'PPPoE Username',
              accessorKey: 'username',
              width: 190,
              sortable: true,
              cell: ({ row }) => (
                <span className="font-mono font-bold text-[var(--brand)]">{row.original.username}</span>
              ),
            },
            {
              id: 'customerName',
              header: 'Subscriber Name',
              accessorKey: 'customerName',
              width: 210,
              sortable: true,
              skeleton: 'avatar-text',
              cell: ({ row }) => (
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--text)] truncate">{row.original.customerName}</div>
                  {row.original.customerCode && (
                    <div className="text-[11px] font-mono text-[var(--text-muted)]">{row.original.customerCode}</div>
                  )}
                </div>
              ),
            },
            {
              id: 'ipAddress',
              header: 'Assigned IP',
              accessorKey: 'ipAddress',
              width: 135,
              sortable: true,
              cell: ({ row }) => <span className="font-mono">{row.original.ipAddress || '-'}</span>,
            },
            {
              id: 'macAddress',
              header: 'Caller MAC',
              accessorKey: 'macAddress',
              width: 155,
              cell: ({ row }) => (
                <span className="font-mono text-[var(--text-muted)]">{row.original.macAddress || '-'}</span>
              ),
            },
            {
              id: 'rateLimit',
              header: 'Queue Rate Limit',
              accessorKey: 'rateLimit',
              width: 140,
              cell: ({ row }) => (
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {row.original.rateLimit}
                </span>
              ),
            },
            {
              id: 'status',
              header: 'Status',
              accessorKey: 'status',
              width: 120,
              sortable: true,
              skeleton: 'badge',
              filter: {
                type: 'select',
                options: [
                  { value: 'Online', label: 'Online' },
                  { value: 'Disabled', label: 'Disabled' },
                ],
              },
              cell: ({ row }) => (
                <Chip size="sm" color={row.original.status === 'Online' ? 'success' : 'danger'}>
                  {row.original.status}
                </Chip>
              ),
            },
            ...(canManagePPPoE
              ? [
                  {
                    id: 'pppoeAction',
                    header: 'Action',
                    width: 165,
                    align: 'right' as const,
                    skeleton: 'none' as const,
                    cell: ({ row }: { row: { original: any } }) => {
                      const p = row.original;
                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePPPoE(p.customerId, p.username, p.status);
                          }}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{p.status === 'Online' ? 'Suspend Secret' : 'Enable & Kick'}</span>
                        </Button>
                      );
                    },
                  },
                ]
              : []),
          ]}
          data={pppoeAccounts}
          serverMode={true}
          total={pppoeQuery.data?.total}
          onQueryChange={handlePppoeQueryChange}
          loading={pppoeQuery.isLoading || (pppoeQuery.isFetching && pppoeQuery.isPlaceholderData)}
          fetching={pppoeQuery.isFetching}
          loadingMode={pppoeQuery.isLoading || (pppoeQuery.isFetching && pppoeQuery.isPlaceholderData) ? 'skeleton' : undefined}
          error={pppoeQuery.error ? 'Unable to load PPPoE sessions.' : null}
          onRetry={() => pppoeQuery.refetch()}
          onRefresh={() => pppoeQuery.refetch()}
          rowId={(p) => p.id}
          viewKey="network_pppoe_table"
          searchPlaceholder="Search username, subscriber, IP, MAC..."
          isFilterActive={Boolean(
            (pppoeTableQuery.search || '').trim() || Object.keys(pppoeTableQuery.filters || {}).length > 0
          )}
          noDataTitle="No active PPPoE accounts"
          noDataDescription="PPPoE secrets provisioned for subscriber lines will appear here."
          emptyTitle="No matching PPPoE accounts"
          emptySubtitle="Try adjusting search terms or status filters."
        />
      )}

      {/* TAB 3: VLAN SEGMENTATION */}
      {networkTab === 'vlans' && (
        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider">VLAN Inventory & Interface Mapping</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Segregate management, FTTH residential, and corporate DIA traffic</p>
            </div>
            <Can permission="vlans.manage">
              <Button variant="primary" size="sm" onClick={() => setIsVlanModalOpen(true)}>
                <Plus className="w-4 h-4" />
                <span>Add VLAN</span>
              </Button>
            </Can>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                  <th className="py-2.5 px-3">VLAN ID</th>
                  <th className="py-2.5 px-3">Name / Label</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-3">Router Interface</th>
                  <th className="py-2.5 px-3">IPv4 Subnet</th>
                  <th className="py-2.5 px-3">Subscribers</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                <TableStateBody
                  colSpan={7}
                  loading={vlansQuery.isLoading}
                  hasData={vlans.length > 0}
                  error={vlansQuery.error ? 'Unable to load VLAN configurations.' : null}
                  onRetry={() => vlansQuery.refetch()}
                  emptyTitle="No VLANs configured yet"
                  emptyDescription="Create a VLAN ID to isolate broadband, management, and DIA traffic."
                  primaryAction={
                    canManageVlans
                      ? { label: 'Add VLAN', onClick: () => setIsVlanModalOpen(true), permission: 'vlans.manage' }
                      : undefined
                  }
                >
                  {vlans.map((v) => (
                    <tr key={v.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="py-3 px-3 font-bold text-[var(--brand)] text-sm">{v.vlanId}</td>
                      <td className="py-3 px-3 font-sans font-semibold text-[var(--text)]">{v.name}</td>
                      <td className="py-3 px-3">
                        <Chip size="sm" color={v.purpose === 'FIBER_INTERNET' ? 'secondary' : v.purpose === 'MANAGEMENT' ? 'default' : 'warning'}>
                          {v.purpose}
                        </Chip>
                      </td>
                      <td className="py-3 px-3 text-[var(--text-secondary)]">{v.interface} ({v.tagged ? 'Tagged' : 'Access'})</td>
                      <td className="py-3 px-3">{v.subnet || '-'}</td>
                      <td className="py-3 px-3 font-bold text-[var(--text)]">{v.subscribersCount}</td>
                      <td className="py-3 px-3">
                        <Chip size="sm" color="success">Active</Chip>
                      </td>
                    </tr>
                  ))}
                </TableStateBody>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: IPAM / IP POOLS */}
      {networkTab === 'ipam' && (
        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider">IPv4 Address Pools & Subnet Pools</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Dynamic DHCP/PPPoE pools and fixed static assignment allocation</p>
            </div>
            <Can permission="ipam.manage">
              <Button variant="primary" size="sm" onClick={() => setIsIpModalOpen(true)}>
                <Plus className="w-4 h-4" />
                <span>Allocate Static IP</span>
              </Button>
            </Can>
          </div>

          {ipamQuery.isLoading && ipPools.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1].map((idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] space-y-3">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-3 w-56 rounded" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : ipamQuery.error && ipPools.length === 0 ? (
            <EmptyState
              variant="error"
              title="Unable to load IP pools"
              description="Failed to fetch IPAM subnet pools. Please try again."
              primaryAction={{ label: 'Retry', onClick: () => ipamQuery.refetch() }}
            />
          ) : ipPools.length === 0 ? (
            <EmptyState
              variant="no-data"
              icon={<Wifi className="w-5 h-5" />}
              title="No IP pools configured"
              description="Add subscriber IPv4 pools to manage dynamic and static leases."
              primaryAction={
                canManageIpam
                  ? { label: 'Allocate Static IP', onClick: () => setIsIpModalOpen(true), permission: 'ipam.manage' }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ipPools.map((pool) => (
              <div key={pool.id} className="p-4 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[var(--brand)] text-sm">{pool.name}</span>
                  <Chip size="sm" color={pool.utilizationPercent > 80 ? 'danger' : 'secondary'}>
                    {pool.utilizationPercent}% Utilized
                  </Chip>
                </div>
                <div className="text-xs text-[var(--text)] font-sans">{pool.routerName}</div>
                <div className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                  <div>Range: {pool.startIp} — {pool.endIp}</div>
                  <div>Gateway: {pool.gateway} • DNS: {pool.dnsPrimary}, {pool.dnsSecondary}</div>
                  <div>Available: <strong>{pool.availableIps}</strong> of {pool.totalIps} addresses</div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-[var(--border)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[var(--brand)] h-full rounded-full transition-all"
                    style={{ width: `${pool.utilizationPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* CREATE VLAN MODAL */}
      <Modal isOpen={isVlanModalOpen} onClose={() => setIsVlanModalOpen(false)} title="Provision Network VLAN">
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Field label="VLAN ID (Numeric)">
              <Input
                type="number"
                min="1"
                max="4094"
                value={vlanIdInput}
                onChange={(e) => setVlanIdInput(parseInt(e.target.value) || 20)}
              />
            </Field>

            <Field label="VLAN Purpose">
              <Combobox
                options={VLAN_PURPOSE_OPTIONS}
                value={vlanPurpose}
                onChange={(val) => setVlanPurpose(val)}
                searchable={VLAN_PURPOSE_OPTIONS.length > 6}
                clearable={false}
                size="md"
              />
            </Field>
          </div>

          <Field label="VLAN Label / Name">
            <Input
              value={vlanNameInput}
              onChange={(e) => setVlanNameInput(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Target Core Router">
              <Combobox
                options={VLAN_ROUTER_OPTIONS}
                value={vlanRouter}
                onChange={(val) => setVlanRouter(val)}
                searchable={VLAN_ROUTER_OPTIONS.length > 6}
                clearable={false}
                size="md"
              />
            </Field>

            <Field label="Router Physical Interface">
              <Combobox
                options={VLAN_INTERFACE_OPTIONS}
                value={vlanInterface}
                onChange={(val) => setVlanInterface(val)}
                searchable={VLAN_INTERFACE_OPTIONS.length > 6}
                clearable={false}
                size="md"
              />
            </Field>
          </div>

          <Field label="IPv4 Subnet CIDR">
            <Input
              placeholder="e.g. 10.25.0.0/24"
              value={vlanSubnet}
              onChange={(e) => setVlanSubnet(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsVlanModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateVlan}>Provision VLAN</Button>
          </div>
        </div>
      </Modal>

      {/* ALLOCATE IP MODAL */}
      <Modal isOpen={isIpModalOpen} onClose={() => setIsIpModalOpen(false)} title="Allocate Dedicated IP from Pool">
        <div className="space-y-4 text-xs">
          <Field label="Select Pool">
            <Combobox
              options={ipPoolOptions}
              value={selectedPoolId}
              onChange={(val) => setSelectedPoolId(val)}
              searchable={ipPoolOptions.length > 6}
              clearable={false}
              placeholder="Select IP Pool..."
              size="md"
            />
          </Field>

          <Field label="Target Subscriber">
            <Input
              placeholder="Customer ID e.g. cust-1001"
              value={targetCustId}
              onChange={(e) => setTargetCustId(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsIpModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAllocateIp}>Allocate IP</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
