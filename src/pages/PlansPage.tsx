import React, { useState, useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Wifi,
  Plus,
  Edit2,
  Trash2,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Layers,
  Star,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { Can, useCan } from '../lib/permissions';
import { Plan, PlanBandwidthTier, ConnectionType } from '../types';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Field, Input, Textarea, FormSectionTitle } from '../components/ui/Field';
import { Combobox, ComboboxOption } from '../components/ui/Combobox';
import { DataTable, DataTableColumnDef, RowAction } from '../components/ui/DataTable';

interface AccountItem {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
}

const createBlankTier = (index: number, isDefault = false): PlanBandwidthTier => ({
  label: '',
  downloadSpeed: '' as any,
  uploadSpeed: '' as any,
  price: '' as any,
  costing: '' as any,
  durationDays: '' as any,
  durationLabel: '',
  dataCapGB: null,
  description: '',
  sortOrder: index,
  isDefault,
  isActive: true,
});

function getPlanTiers(plan: Plan): PlanBandwidthTier[] {
  if (plan.bandwidthTiers && plan.bandwidthTiers.length > 0) {
    return plan.bandwidthTiers;
  }
  return [
    {
      label: `${plan.speedMbps} Mbps`,
      downloadSpeed: plan.speedMbps,
      uploadSpeed: plan.uploadMbps,
      price: plan.monthlyPrice,
      costing: plan.costing ?? 0,
      durationDays: plan.durationDays ?? 30,
      durationLabel: `${plan.durationDays ?? 30} Days`,
      dataCapGB: plan.dataCapGB,
      description: plan.description || '',
      isDefault: true,
      isActive: true,
    },
  ];
}

export const PlansPage: React.FC = () => {
  const currency = useStore((s) => s.currency);
  const addToast = useStore((s) => s.addToast);
  const canCreatePlan = useCan('packages.create');
  const canEditPlan = useCan('packages.edit');
  const canDeletePlan = useCan('packages.delete');

  const plansQuery = useQuery<Plan[], Error>({
    queryKey: ['packages'],
    queryFn: () => api.packages.list(),
    placeholderData: keepPreviousData,
  });

  const accountsQuery = useQuery<AccountItem[], Error>({
    queryKey: ['accounting', 'accounts'],
    queryFn: () => api.accounting.getAccounts(),
    staleTime: 5 * 60 * 1000,
  });

  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<ConnectionType>('Fiber');
  const [installationFee, setInstallationFee] = useState<number | ''>(0);
  const [description, setDescription] = useState('');
  const [isPopular, setIsPopular] = useState(false);

  // Accounting Set Codes
  const [revenueAccountCode, setRevenueAccountCode] = useState('4010');
  const [receivableAccountCode, setReceivableAccountCode] = useState('1100');
  const [costAccountCode, setCostAccountCode] = useState('5100');
  const [deferredRevenueAccountCode, setDeferredRevenueAccountCode] = useState('');
  const [taxAccountCode, setTaxAccountCode] = useState('2200');

  // Bandwidth Tiers Table State
  const [tiers, setTiers] = useState<PlanBandwidthTier[]>([createBlankTier(0, true)]);

  const connectionTypeOptions: ComboboxOption[] = [
    { value: 'Fiber', label: 'Fiber Optic' },
    { value: 'Wireless', label: 'Fixed Wireless' },
    { value: 'DSL', label: 'DSL Copper' },
  ];

  // User Request 1: "remove detail line" -> Clean single-line account labels without extra description line
  const accountOptionsByType = useMemo(() => {
    const mapOption = (acc: AccountItem): ComboboxOption => ({
      value: acc.code,
      label: `${acc.code} — ${acc.name}`,
      shortLabel: `${acc.code} ${acc.name}`,
      group: acc.type,
    });
    const all = accounts.map(mapOption);
    const sortByPreferred = (preferredTypes: AccountItem['type'][]) => {
      const preferred = accounts
        .filter((a) => preferredTypes.includes(a.type))
        .map(mapOption);
      const others = accounts
        .filter((a) => !preferredTypes.includes(a.type))
        .map(mapOption);
      return preferred.length > 0 ? [...preferred, ...others] : all;
    };

    return {
      revenue: sortByPreferred(['REVENUE']),
      receivable: sortByPreferred(['ASSET']),
      cost: sortByPreferred(['EXPENSE']),
      liability: sortByPreferred(['LIABILITY']),
    };
  }, [accounts]);

  // Handle Add Plan (All empty by default except accounting presets)
  const handleOpenAdd = () => {
    setEditingPlanId(null);
    setName('');
    setType('Fiber');
    setInstallationFee(0);
    setDescription('');
    setIsPopular(false);
    // User Request 3: Blank tier with placeholder days/durationLabel
    setTiers([createBlankTier(0, true)]);
    // Only accounting presets populated as requested
    setRevenueAccountCode('4010');
    setReceivableAccountCode('1100');
    setCostAccountCode('5100');
    setDeferredRevenueAccountCode('');
    setTaxAccountCode('2200');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlanId(plan.id);
    setName(plan.name);
    setType(plan.type);
    setInstallationFee(plan.installationFee ?? 0);
    setDescription(plan.description || '');
    setIsPopular(Boolean(plan.isPopular));

    const existingTiers = getPlanTiers(plan).map((t, idx) => ({
      ...t,
      label: t.label || `${t.downloadSpeed} Mbps`,
      downloadSpeed: t.downloadSpeed,
      uploadSpeed: t.uploadSpeed,
      price: Number(t.price ?? 0),
      costing: Number(t.costing ?? 0),
      durationDays: t.durationDays ?? 30,
      durationLabel: t.durationLabel || `${t.durationDays ?? 30} Days`,
      dataCapGB: t.dataCapGB ?? t.dataAllowanceGB ?? null,
      description: t.description || '',
      sortOrder: idx,
      isDefault: Boolean(t.isDefault),
      isActive: t.isActive !== false,
    }));
    if (existingTiers.length > 0 && !existingTiers.some((t) => t.isDefault)) {
      existingTiers[0].isDefault = true;
    }
    setTiers(existingTiers);

    setRevenueAccountCode(plan.revenueAccountCode || (plan.type === 'Wireless' ? '4020' : '4010'));
    setReceivableAccountCode(plan.receivableAccountCode || '1100');
    setCostAccountCode(plan.costAccountCode || '5100');
    setDeferredRevenueAccountCode(plan.deferredRevenueAccountCode || '');
    setTaxAccountCode(plan.taxAccountCode || '2200');
    setIsModalOpen(true);
  };

  const handleTypeChange = (nextType: ConnectionType) => {
    setType(nextType);
    if (!editingPlanId) {
      if (nextType === 'Wireless' && revenueAccountCode === '4010') {
        setRevenueAccountCode('4020');
      } else if (nextType === 'Fiber' && revenueAccountCode === '4020') {
        setRevenueAccountCode('4010');
      }
    }
  };

  const handleAddTier = () => {
    setTiers((prev) => [
      ...prev,
      createBlankTier(prev.length, prev.length === 0),
    ]);
  };

  const handleUpdateTier = (index: number, patch: Partial<PlanBandwidthTier>) => {
    setTiers((prev) =>
      prev.map((tier, idx) => {
        if (idx !== index) {
          return patch.isDefault ? { ...tier, isDefault: false } : tier;
        }
        const next = { ...tier, ...patch };
        if (patch.durationDays !== undefined && patch.durationLabel === undefined && (patch.durationDays as any) !== '') {
          const days = Number(patch.durationDays);
          if (days > 0) {
            next.durationLabel =
              days === 30 ? '30 Days' : days === 90 ? '3 Months' : days === 180 ? '6 Months' : days === 365 ? '1 Year' : `${days} Days`;
          }
        }
        return next;
      })
    );
  };

  // User Request 5: Switch position up/down so user can arrange tiers
  const handleMoveTier = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tiers.length) return;
    setTiers((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next.map((t, idx) => ({ ...t, sortOrder: idx }));
    });
  };

  const handleRemoveTier = (index: number) => {
    if (tiers.length <= 1) return;
    setTiers((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length > 0 && !next.some((t) => t.isDefault)) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next.map((t, idx) => ({ ...t, sortOrder: idx }));
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Plan name is required.' });
      return;
    }
    if (tiers.length === 0) {
      addToast({
        type: 'error',
        title: 'Bandwidth Tier Required',
        message: 'Add at least one bandwidth tier to the plan.',
      });
      return;
    }

    // Validate tier numbers
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      if (!t.downloadSpeed || Number(t.downloadSpeed) <= 0) {
        addToast({
          type: 'error',
          title: 'Validation Error',
          message: `Tier #${i + 1} requires a valid download speed (Mbps).`,
        });
        return;
      }
      if ((t.price as any) === '' || isNaN(Number(t.price)) || Number(t.price) < 0) {
        addToast({
          type: 'error',
          title: 'Validation Error',
          message: `Tier #${i + 1} requires a valid selling price.`,
        });
        return;
      }
    }

    const defaultTier = tiers.find((t) => t.isDefault) || tiers[0];
    const payload = {
      name: name.trim(),
      technology: type.toUpperCase(),
      type,
      downloadSpeed: Number(defaultTier.downloadSpeed),
      uploadSpeed: Number(defaultTier.uploadSpeed || Math.max(5, Math.round(Number(defaultTier.downloadSpeed) / 2))),
      speedMbps: Number(defaultTier.downloadSpeed),
      uploadMbps: Number(defaultTier.uploadSpeed || Math.max(5, Math.round(Number(defaultTier.downloadSpeed) / 2))),
      monthlyPrice: Number(defaultTier.price),
      installationFee: Number(installationFee) || 0,
      dataAllowanceGB: defaultTier.dataCapGB === undefined || (defaultTier.dataCapGB as any) === '' ? null : Number(defaultTier.dataCapGB),
      dataCapGB: defaultTier.dataCapGB === undefined || (defaultTier.dataCapGB as any) === '' ? null : Number(defaultTier.dataCapGB),
      description: description.trim(),
      isPopular,
      revenueAccountCode: revenueAccountCode || null,
      receivableAccountCode: receivableAccountCode || null,
      costAccountCode: costAccountCode || null,
      deferredRevenueAccountCode: deferredRevenueAccountCode || null,
      taxAccountCode: taxAccountCode || null,
      bandwidthTiers: tiers.map((t, idx) => {
        const days = (t.durationDays as any) !== '' && !isNaN(Number(t.durationDays)) && Number(t.durationDays) > 0 ? Number(t.durationDays) : 30;
        const durationLabel = (t.durationLabel || '').trim() || `${days} Days`;
        return {
          ...(t.id ? { id: t.id } : {}),
          label: (t.label || '').trim() || `${t.downloadSpeed} Mbps`,
          downloadSpeed: Number(t.downloadSpeed),
          uploadSpeed: Number(t.uploadSpeed || Math.max(5, Math.round(Number(t.downloadSpeed) / 2))),
          price: Number(t.price),
          costing: Number(t.costing || 0),
          durationDays: days,
          durationLabel,
          dataAllowanceGB: t.dataCapGB === undefined || (t.dataCapGB as any) === '' ? null : Number(t.dataCapGB),
          description: (t.description || '').trim(),
          sortOrder: idx,
          isDefault: Boolean(t.isDefault),
          // User Request 6: Enable / disable status persisted
          isActive: t.isActive !== false,
        };
      }),
    };

    setIsSaving(true);
    try {
      if (editingPlanId) {
        await api.packages.update(editingPlanId, payload);
        addToast({
          type: 'success',
          title: 'Plan Updated',
          message: `Updated ${tiers.length} bandwidth tier(s) and accounting set for ${name}`,
        });
      } else {
        await api.packages.create(payload);
        addToast({
          type: 'success',
          title: 'Plan Created',
          message: `Created ${name} with ${tiers.length} bandwidth tier(s)`,
        });
      }
      setIsModalOpen(false);
      plansQuery.refetch();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err?.message || 'Unable to save plan changes.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const columns: DataTableColumnDef<Plan>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Plan name',
        accessorKey: 'name',
        width: 230,
        sortable: true,
        pinned: 'left',
        priority: 1,
        filter: { type: 'text', placeholder: 'Search plan...' },
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-900 dark:text-gray-100 truncate">{p.name}</span>
                {p.isPopular && (
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                )}
              </div>
              <div className="text-[11px] text-gray-400 truncate">
                {p.description || 'High-speed broadband connectivity'}
              </div>
            </div>
          );
        },
      },
      {
        id: 'type',
        header: 'Medium',
        accessorKey: 'type',
        width: 115,
        sortable: true,
        priority: 1,
        filter: {
          type: 'select',
          options: [
            { value: 'Fiber', label: 'Fiber' },
            { value: 'Wireless', label: 'Wireless' },
            { value: 'DSL', label: 'DSL' },
          ],
        },
        cell: ({ row }) => {
          const p = row.original;
          const color = p.type === 'Fiber' ? 'accent' : p.type === 'Wireless' ? 'warning' : 'default';
          return (
            <Chip size="sm" color={color} className="uppercase font-semibold tracking-wide">
              {p.type}
            </Chip>
          );
        },
      },
      {
        id: 'bandwidthTiers',
        header: 'Bandwidth Tiers',
        accessorFn: (p) => getPlanTiers(p).map((t) => `${t.downloadSpeed} Mbps`).join(', '),
        width: 220,
        priority: 1,
        cell: ({ row }) => {
          const planTiers = getPlanTiers(row.original);
          return (
            <div className="flex flex-wrap items-center gap-1">
              {planTiers.slice(0, 3).map((tier, idx) => (
                <span
                  key={tier.id || idx}
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums border ${tier.isActive === false
                      ? 'bg-zinc-100 text-zinc-400 border-zinc-200 line-through dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700'
                      : tier.isDefault
                        ? 'bg-[#FFF3EE] text-[#C94B22] border-[#FAD4C5] dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/50'
                        : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                    }`}
                >
                  {tier.downloadSpeed}M
                </span>
              ))}
              {planTiers.length > 3 && (
                <span className="text-[11px] font-medium text-gray-400">
                  +{planTiers.length - 3}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'monthlyPrice',
        header: 'Price Range',
        accessorKey: 'monthlyPrice',
        width: 150,
        align: 'right',
        sortable: true,
        priority: 1,
        aggregate: 'avg',
        filter: { type: 'range', min: 0, max: 500 },
        cell: ({ row }) => {
          const planTiers = getPlanTiers(row.original);
          const prices = planTiers.map((t) => t.price);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          return (
            <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {minPrice === maxPrice
                ? `${currency}${minPrice.toFixed(2)}`
                : `${currency}${minPrice.toFixed(0)} – ${currency}${maxPrice.toFixed(0)}`}
            </span>
          );
        },
      },
      {
        id: 'costing',
        header: 'Costing',
        accessorFn: (p) => {
          const costs = getPlanTiers(p).map((t) => t.costing ?? 0);
          return Math.min(...costs);
        },
        width: 140,
        align: 'right',
        sortable: true,
        priority: 2,
        cell: ({ row }) => {
          const costs = getPlanTiers(row.original).map((t) => t.costing ?? 0);
          const minCost = Math.min(...costs);
          const maxCost = Math.max(...costs);
          return (
            <span className="font-medium text-gray-600 dark:text-gray-300 tabular-nums">
              {minCost === maxCost
                ? `${currency}${minCost.toFixed(2)}`
                : `${currency}${minCost.toFixed(0)} – ${currency}${maxCost.toFixed(0)}`}
            </span>
          );
        },
      },
      {
        id: 'durationDays',
        header: 'Duration',
        accessorFn: (p) => getPlanTiers(p)[0]?.durationDays ?? 30,
        width: 125,
        sortable: true,
        priority: 2,
        cell: ({ row }) => {
          const durations = Array.from(
            new Set(getPlanTiers(row.original).map((t) => t.durationLabel || `${t.durationDays ?? 30} Days`))
          );
          return (
            <span className="text-xs font-medium text-[var(--text)] truncate block">
              {durations.length === 1 ? durations[0] : `${durations[0]} (+${durations.length - 1})`}
            </span>
          );
        },
      },
      {
        id: 'accountingSet',
        header: 'Accounting Set',
        accessorFn: (p) => p.revenueAccountCode || '',
        width: 190,
        priority: 2,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                REV {p.revenueAccountCode || '—'}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                AR {p.receivableAccountCode || '—'}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                COST {p.costAccountCode || '—'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'subscribersCount',
        header: 'Subscribers',
        accessorKey: 'subscribersCount',
        width: 120,
        align: 'right',
        sortable: true,
        priority: 1,
        aggregate: 'sum',
        cell: ({ row }) => (
          <span className="font-bold text-gray-800 dark:text-gray-200 tabular-nums">
            {row.original.subscribersCount || 0}
          </span>
        ),
      },
    ],
    [currency]
  );

  const getRowActions = (p: Plan): RowAction<Plan>[] => [
    ...(canEditPlan
      ? [
        {
          label: 'Edit Plan',
          icon: <Edit2 className="w-3.5 h-3.5" />,
          onClick: () => handleOpenEdit(p),
        },
      ]
      : []),
    ...(canDeletePlan
      ? [
        {
          label: 'Delete Plan',
          icon: <Trash2 className="w-3.5 h-3.5" />,
          danger: true,
          onClick: async () => {
            try {
              await api.packages.delete(p.id);
              addToast({
                type: 'info',
                title: 'Plan Removed',
                message: `Removed ${p.name} from catalog`,
              });
              plansQuery.refetch();
            } catch (err: any) {
              addToast({
                type: 'error',
                title: 'Delete Failed',
                message: err?.message || 'Unable to remove plan.',
              });
            }
          },
        },
      ]
      : []),
  ];

  // User Request: "remove accouting config just show all children of package"
  const renderExpanded = (p: Plan) => {
    const planTiers = getPlanTiers(p);
    return (
      <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-[#161618] border border-gray-200/60 dark:border-gray-800 text-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--brand)]" />
            <span className="font-bold text-[var(--text)]">
              Bandwidth Tiers ({planTiers.length}) • {p.name}
            </span>
          </div>
          <span className="text-[11px] text-gray-400">
            Subscribers enrolled: {p.subscribersCount || 0}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200/70 dark:border-gray-800 bg-white dark:bg-[#1C1C1F]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200/70 dark:border-gray-800 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <th className="py-2.5 px-3">Tier Label</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Bandwidth</th>
                <th className="py-2.5 px-3 text-right">Selling Price</th>
                <th className="py-2.5 px-3 text-right">Costing</th>
                <th className="py-2.5 px-3 text-right">Margin</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Data Cap</th>
                <th className="py-2.5 px-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {planTiers.map((tier, idx) => {
                const margin = (tier.price || 0) - (tier.costing || 0);
                return (
                  <tr key={tier.id || idx} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                    <td className="py-2 px-3 font-semibold text-[var(--text)]">
                      <span>{tier.label || `${tier.downloadSpeed} Mbps`}</span>
                      {tier.isDefault && (
                        <Chip size="sm" color="accent" className="ml-2">
                          Default
                        </Chip>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <Chip size="sm" color={tier.isActive !== false ? 'success' : 'default'}>
                        {tier.isActive !== false ? 'Active' : 'Disabled'}
                      </Chip>
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-[var(--text)]">
                      {tier.downloadSpeed}↓ / {tier.uploadSpeed}↑ Mbps
                    </td>
                    <td className="py-2 px-3 text-right font-bold tabular-nums text-[var(--text)]">
                      {currency}{Number(tier.price).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-gray-500">
                      {currency}{Number(tier.costing || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {currency}{margin.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-[var(--text-muted)]">
                      {tier.durationLabel || `${tier.durationDays || 30} Days`}
                    </td>
                    <td className="py-2 px-3 text-[var(--text-muted)]">
                      {tier.dataCapGB ? `${tier.dataCapGB} GB` : 'Unlimited'}
                    </td>
                    <td className="py-2 px-3 text-[var(--text-muted)] max-w-[220px] truncate">
                      {tier.description || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCard = (
    p: Plan,
    isSelected: boolean,
    _onSelect: () => void,
    actionMenu?: React.ReactNode
  ) => {
    const planTiers = getPlanTiers(p);
    const prices = planTiers.map((t) => t.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    return (
      <div
        className={`flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border shadow-xs transition-all min-w-0 ${isSelected
            ? 'border-[#F26B3A] bg-[#FFF6F2] dark:bg-orange-950/20'
            : 'border-gray-200/80 dark:border-gray-800 hover:border-gray-300'
          }`}
      >
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Chip
                size="sm"
                color={p.type === 'Fiber' ? 'accent' : p.type === 'Wireless' ? 'warning' : 'default'}
                className="uppercase font-semibold tracking-wide shrink-0"
              >
                {p.type}
              </Chip>
              <span className="text-[11px] font-medium text-gray-400 truncate">
                {planTiers.length} {planTiers.length === 1 ? 'tier' : 'tiers'}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">{actionMenu}</div>
          </div>

          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-2 truncate">
            {p.name}
          </h3>
          <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
            {p.description || 'High-speed broadband connectivity.'}
          </p>

          {/* Price */}
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[24px] font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {minPrice === maxPrice
                ? `${currency}${minPrice.toFixed(2)}`
                : `${currency}${minPrice.toFixed(0)} – ${currency}${maxPrice.toFixed(0)}`}
            </span>
            <span className="text-xs text-gray-400">/cycle</span>
          </div>

          {/* Multi-Bandwidth Tiers */}
          <div className="mt-3 space-y-1.5">
            {planTiers.slice(0, 4).map((tier, idx) => (
              <div
                key={tier.id || idx}
                className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <ArrowDown className="w-3 h-3 text-[#F26B3A] shrink-0" />
                  <span className={`font-semibold tabular-nums ${tier.isActive === false ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {tier.downloadSpeed}M
                  </span>
                  <span className="text-gray-400 truncate">
                    • {tier.durationLabel || `${tier.durationDays || 30}d`}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 tabular-nums">
                  <span className="text-[11px] text-gray-400">
                    Cost {currency}{Number(tier.costing || 0).toFixed(0)}
                  </span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {currency}{Number(tier.price).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            {planTiers.length > 4 && (
              <div className="text-[11px] text-gray-400 text-center pt-0.5">
                +{planTiers.length - 4} more bandwidth tier(s)
              </div>
            )}
          </div>

          {/* Accounting Set Pills */}
          <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-1.5 text-[10px] font-mono">
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              REV {p.revenueAccountCode || '—'}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
              AR {p.receivableAccountCode || '—'}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              COST {p.costAccountCode || '—'}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
          <span>Subscribers</span>
          <span className="font-bold text-gray-700 dark:text-gray-300 tabular-nums">
            {p.subscribersCount || 0} active
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight">
            Internet Plans Catalog
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Configure multi-bandwidth tiers, costing, duration cycles, and accounting account sets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => plansQuery.refetch()}
            disabled={plansQuery.isFetching}
            className="h-8 px-3 text-[12px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${plansQuery.isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Can permission="packages.create">
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              className="h-8 px-3 text-[12px]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>Add New Plan</span>
            </Button>
          </Can>
        </div>
      </div>

      {/* Plans DataTable */}
      <DataTable<Plan>
        columns={columns}
        data={plans}
        loading={plansQuery.isLoading}
        fetching={plansQuery.isFetching}
        error={plansQuery.error ? 'Unable to load internet plans.' : null}
        onRetry={() => plansQuery.refetch()}
        onRefresh={() => plansQuery.refetch()}
        rowId={(p) => p.id}
        viewKey="plans_catalog_table"
        enableRowReorder={true}
        rowActions={getRowActions}
        renderExpanded={renderExpanded}
        renderCard={renderCard}
        noDataTitle="No internet plans configured"
        noDataDescription="Create broadband plans with bandwidth tiers and accounting sets to begin provisioning."
        emptyTitle="No matching internet plans"
        emptySubtitle="Adjust your search or clear active column filters."
        emptyActionPermission="packages.create"
        onAddNew={canCreatePlan ? handleOpenAdd : undefined}
        addNewLabel="Add New Plan"
      />

      {/* User Request 4: "make modal bigger than so it dont overflow x" -> size="4xl" */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="4xl"
        title={editingPlanId ? 'Edit Plan, Bandwidth Tiers & Accounting Set' : 'Add New Internet Plan'}
        subtitle="Define multiple bandwidth options with price, costing, duration, and Chart of Accounts mapping"
        icon={<Wifi className="w-5 h-5 text-[#F26B3A]" />}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Request 2: "accouting section should be under plan profile section" */}
          {/* Section 1: Plan Profile */}
          <div className="space-y-3">
            <FormSectionTitle>Plan Profile & Characteristics</FormSectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Plan Name" required className="sm:col-span-1">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Home Fiber Multi-Speed"
                  required
                />
              </Field>
              <Field label="Medium / Connection Type" required>
                <Combobox
                  options={connectionTypeOptions}
                  value={type}
                  onChange={(val) => handleTypeChange(val as ConnectionType)}
                  searchable={false}
                  clearable={false}
                  size="md"
                />
              </Field>
              <Field label={`Installation Fee (${currency})`}>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={installationFee}
                  onChange={(e) => setInstallationFee(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <Field label="Plan Description" className="sm:col-span-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Flexible FTTH broadband package with multiple speed options..."
                  rows={2}
                />
              </Field>
              <div className="pt-6">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-[var(--text)] select-none">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="rounded border-gray-300 text-[#F26B3A] focus:ring-[#F26B3A]"
                  />
                  <span className="font-medium">Highlight as Popular Plan</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Accounting Set (Under Plan Profile Section) */}
          <div className="pt-2 border-t border-[var(--border)] space-y-3">
            <FormSectionTitle>Accounting Set (Chart of Accounts Mapping)</FormSectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Revenue Account" required>
                <Combobox
                  options={accountOptionsByType.revenue}
                  value={revenueAccountCode}
                  onChange={setRevenueAccountCode}
                  placeholder="Select revenue GL..."
                  groupBy={true}
                  size="md"
                  popoverWidth="min(460px, calc(100vw - 24px))"
                />
              </Field>
              <Field label="Accounts Receivable (AR)" required>
                <Combobox
                  options={accountOptionsByType.receivable}
                  value={receivableAccountCode}
                  onChange={setReceivableAccountCode}
                  placeholder="Select AR GL..."
                  groupBy={true}
                  size="md"
                  popoverWidth="min(460px, calc(100vw - 24px))"
                />
              </Field>
              <Field label="Cost / COGS Account">
                <Combobox
                  options={accountOptionsByType.cost}
                  value={costAccountCode}
                  onChange={setCostAccountCode}
                  placeholder="Select cost GL..."
                  groupBy={true}
                  size="md"
                  popoverWidth="min(460px, calc(100vw - 24px))"
                />
              </Field>
              <Field label="Deferred / Unearned Revenue">
                <Combobox
                  options={accountOptionsByType.liability}
                  value={deferredRevenueAccountCode}
                  onChange={setDeferredRevenueAccountCode}
                  placeholder="Optional deferred GL..."
                  groupBy={true}
                  size="md"
                  popoverWidth="min(460px, calc(100vw - 24px))"
                />
              </Field>
              <Field label="Tax / VAT Payable Account">
                <Combobox
                  options={accountOptionsByType.liability}
                  value={taxAccountCode}
                  onChange={setTaxAccountCode}
                  placeholder="Select tax GL..."
                  groupBy={true}
                  size="md"
                  popoverWidth="min(460px, calc(100vw - 24px))"
                />
              </Field>
            </div>
          </div>

          {/* Section 3: Bandwidth Tiers Table */}
          <div className="pt-2 border-t border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between">
              <FormSectionTitle>Bandwidth Tiers ({tiers.length})</FormSectionTitle>
              <Button type="button" variant="outline" size="sm" onClick={handleAddTier}>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Bandwidth Tier</span>
              </Button>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {/* User Request 5: Order / Move */}
                    <th className="py-2.5 px-1.5 text-center w-12" title="Reorder tier position">Move</th>
                    {/* User Request 6: Enable / Disable Status */}
                    <th className="py-2.5 px-2 text-center w-20" title="Tier status enable/disable">Status</th>
                    <th className="py-2.5 px-1.5 text-center w-12" title="Default selection for subscribers">Default</th>
                    <th className="py-2.5 px-2 min-w-[120px]">Tier Label</th>
                    <th className="py-2.5 px-2 min-w-[85px]">Down (Mbps)*</th>
                    <th className="py-2.5 px-2 min-w-[85px]">Up (Mbps)</th>
                    <th className="py-2.5 px-2 min-w-[95px]">Price ({currency})*</th>
                    <th className="py-2.5 px-2 min-w-[90px]">Cost ({currency})</th>
                    <th className="py-2.5 px-2 min-w-[100px] text-right">Margin</th>
                    {/* User Request 3: Days placeholder */}
                    <th className="py-2.5 px-2 min-w-[75px]">Days</th>
                    {/* User Request 3: Duration label placeholder */}
                    <th className="py-2.5 px-2 min-w-[100px]">Duration Label</th>
                    <th className="py-2.5 px-2 min-w-[80px]">Cap (GB)</th>
                    <th className="py-2.5 px-2 min-w-[140px]">Description</th>
                    <th className="py-2.5 px-1.5 text-center w-9"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {tiers.map((tier, idx) => {
                    const priceNum = Number(tier.price) || 0;
                    const costNum = Number(tier.costing) || 0;
                    const margin = priceNum - costNum;
                    const marginPct = priceNum > 0 ? Math.round((margin / priceNum) * 100) : 0;
                    const isRowDisabled = tier.isActive === false;
                    return (
                      <tr
                        key={tier.id || `tier-table-row-${idx}`}
                        className={`transition-colors ${isRowDisabled
                            ? 'opacity-65 bg-gray-50/50 dark:bg-zinc-900/40'
                            : tier.isDefault
                              ? 'bg-[#FFF9F6] dark:bg-orange-950/10'
                              : 'hover:bg-[var(--surface-hover)]'
                          }`}
                      >
                        {/* User Request 5: Move Up / Down Buttons */}
                        <td className="py-2 px-1 text-center align-middle whitespace-nowrap">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveTier(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-20 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveTier(idx, 'down')}
                              disabled={idx === tiers.length - 1}
                              className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-20 disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* User Request 6: Enable / Disable Status */}
                        <td className="py-2 px-2 text-center align-middle whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleUpdateTier(idx, { isActive: !tier.isActive })}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${tier.isActive !== false
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60'
                                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                              }`}
                            title={tier.isActive !== false ? 'Active (click to disable)' : 'Disabled (click to enable)'}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${tier.isActive !== false ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                            {tier.isActive !== false ? 'Active' : 'Disabled'}
                          </button>
                        </td>

                        <td className="py-2 px-1.5 text-center align-middle">
                          <input
                            type="radio"
                            name="defaultBandwidthTier"
                            checked={Boolean(tier.isDefault)}
                            onChange={() => handleUpdateTier(idx, { isDefault: true })}
                            className="text-[#F26B3A] focus:ring-[#F26B3A] cursor-pointer"
                            title="Set as default tier"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={tier.label}
                            onChange={(e) => handleUpdateTier(idx, { label: e.target.value })}
                            placeholder="e.g. 15 Mbps"
                            className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:border-[#F26B3A] focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min={1}
                            value={tier.downloadSpeed ?? ''}
                            onChange={(e) =>
                              handleUpdateTier(idx, {
                                downloadSpeed: e.target.value === '' ? ('' as any) : Number(e.target.value),
                              })
                            }
                            placeholder="15"
                            required
                            className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-mono focus:border-[#F26B3A] focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min={1}
                            value={tier.uploadSpeed ?? ''}
                            onChange={(e) =>
                              handleUpdateTier(idx, {
                                uploadSpeed: e.target.value === '' ? ('' as any) : Number(e.target.value),
                              })
                            }
                            placeholder="8"
                            className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-mono focus:border-[#F26B3A] focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={tier.price ?? ''}
                            onChange={(e) =>
                              handleUpdateTier(idx, {
                                price: e.target.value === '' ? ('' as any) : Number(e.target.value),
                              })
                            }
                            placeholder="18.00"
                            required
                            className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-semibold font-mono focus:border-[#F26B3A] focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={tier.costing ?? ''}
                            onChange={(e) =>
                              handleUpdateTier(idx, {
                                costing: e.target.value === '' ? ('' as any) : Number(e.target.value),
                              })
                            }
                            placeholder="7.00"
                            className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-mono focus:border-[#F26B3A] focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2 text-right align-middle whitespace-nowrap">
                          <span
                            className={`text-[11px] font-bold tabular-nums ${margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                              }`}
                          >
                            {currency}{margin.toFixed(2)}
                            <span className="text-[10px] text-[var(--text-muted)] font-normal ml-1">
                              ({marginPct}%)
                            </span>
                          </span>
                        </td>
                        {/* User Request 3: Days placeholder instead of init value */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min={1}
                            value={tier.durationDays ?? ''}
                            onChange={(e) =>
                              handleUpdateTier(idx, {
                                durationDays: e.target.value === '' ? ('' as any) : Number(e.target.value),
                              })
                            }
                            placeholder="30"
                            className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-mono focus:border-[#F26B3A] focus:outline-none"
                          />
                        </td>
                        {/* User Request 3: Duration label placeholder instead of init value */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={tier.durationLabel ?? ''}
                            onChange={(e) => handleUpdateTier(idx, { durationLabel: e.target.value })}
                            placeholder="30 Days"
                            className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:border-[#F26B3A] focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min={0}
                            value={tier.dataCapGB ?? ''}
                            onChange={(e) =>
                              handleUpdateTier(idx, {
                                dataCapGB: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                            placeholder="Unltd"
                            className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-mono focus:border-[#F26B3A] focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={tier.description ?? ''}
                            onChange={(e) => handleUpdateTier(idx, { description: e.target.value })}
                            placeholder="Short note..."
                            className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:border-[#F26B3A] focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-1.5 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => handleRemoveTier(idx)}
                            disabled={tiers.length <= 1}
                            className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete tier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <ModalFooter
            onCancel={() => setIsModalOpen(false)}
            cancelText="Cancel"
            submitText={editingPlanId ? 'Save Changes' : 'Create Plan'}
            onSubmit={handleSubmit}
            isSubmitting={isSaving}
          />
        </form>
      </Modal>
    </div>
  );
};
