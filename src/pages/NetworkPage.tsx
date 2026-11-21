import React, { useMemo } from 'react';
import {
  Radio,
  RefreshCw,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Activity,
  Zap,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { NetworkDevice } from '../types';
import { Button } from '../components/ui/Button';
import { DataTable, DataTableColumnDef, RowAction } from '../components/ui/DataTable';

export const NetworkPage: React.FC = () => {
  const devices = useStore((s) => s.devices);
  const rebootDevice = useStore((s) => s.rebootDevice);
  const addToast = useStore((s) => s.addToast);

  const deviceTypeOptions = [
    { value: 'OLT', label: 'Optical Line Terminal (OLT)' },
    { value: 'Core Router', label: 'BGP Core Router' },
    { value: 'Wireless AP', label: 'PTMP Wireless Tower' },
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
        pinned: 'left',
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
                <div className="font-bold text-gray-900 dark:text-gray-100 truncate">
                  {dev.name}
                </div>
                <div className="font-mono text-[11px] text-gray-400">
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
          <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
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
          <span className="text-gray-600 dark:text-gray-300 truncate">
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
          return (
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${dev.status === 'Online'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60'
                }`}
            >
              {dev.status} ({dev.lastPingMs} ms)
            </span>
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
          <span className="font-bold text-gray-800 dark:text-gray-200 tabular-nums">
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
          <span className="font-bold text-[#F26B3A] tabular-nums">
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
          <span className="font-mono text-[11px] text-gray-500">
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
          <span className="text-gray-600 dark:text-gray-400 tabular-nums">
            {row.original.uptimeDays} days
          </span>
        ),
      },
    ],
    []
  );

  const getRowActions = (dev: NetworkDevice): RowAction<NetworkDevice>[] => [
    {
      label: 'Reboot Device',
      icon: <RotateCw className="w-3.5 h-3.5 text-amber-600" />,
      onClick: () => {
        rebootDevice(dev.id);
        addToast({
          type: 'info',
          title: 'Device Reboot Initiated',
          message: `Sent soft reboot signal to ${dev.name} (${dev.ipAddress})`,
        });
      },
    },
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
  ) => (
    <div
      className={`p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border shadow-xs flex flex-col justify-between space-y-4 ${isSelected
        ? 'border-[#F26B3A] bg-[#FFF6F2] dark:bg-orange-950/20'
        : 'border-gray-200/80 dark:border-gray-800 hover:border-gray-300'
        }`}
    >
      <div>
        <div className="flex items-center justify-between">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dev.status === 'Online'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
              }`}
          >
            {dev.status} ({dev.lastPingMs} ms)
          </span>
          <span className="text-[10px] text-gray-400 font-mono">{dev.type}</span>
        </div>

        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-2.5 truncate">
          {dev.name}
        </h3>
        <p className="text-[11px] text-gray-400 font-mono mt-0.5">{dev.ipAddress}</p>
        <p className="text-[11px] text-gray-500 mt-1">{dev.location}</p>

        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Connected Subscribers:</span>
            <span className="font-bold text-gray-800 dark:text-gray-200">
              {dev.connectedClients}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">CPU Load:</span>
            <span className="font-bold text-[#F26B3A]">{dev.cpuLoadPercent}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Firmware:</span>
            <span className="font-mono text-[11px] text-gray-600 dark:text-gray-300">
              {dev.firmwareVersion}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">System Uptime:</span>
            <span className="text-gray-800 dark:text-gray-200 font-medium">
              {dev.uptimeDays} days
            </span>
          </div>
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          rebootDevice(dev.id);
          addToast({
            type: 'info',
            title: 'Device Rebooting',
            message: `Sent reboot command to ${dev.name}`,
          });
        }}
        className="w-full text-xs"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Reboot Device</span>
      </Button>
    </div>
  );

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight">
            Network Infrastructure & OLT Fleet
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Monitor optical line terminals, core BGP routers, and point-to-multipoint wireless towers
          </p>
        </div>
      </div>

      {/* Full-Featured Network Devices DataTable */}
      <DataTable<NetworkDevice>
        columns={columns}
        data={devices}
        rowId={(dev) => dev.id}
        viewKey="network_devices_table"
        rowActions={getRowActions}
        renderExpanded={renderExpanded}
        renderCard={renderCard}
        emptyTitle="No network devices found"
        emptySubtitle="Check device provisioning or network discovery status."
      />
    </div>
  );
};
