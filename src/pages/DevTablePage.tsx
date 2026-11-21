import React, { useState, useMemo } from 'react';
import { DataTable, DataTableColumnDef } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Zap, Play, RotateCcw, AlertTriangle, Eye, Edit2, Trash2 } from 'lucide-react';

interface MockDemoItem {
  id: string;
  code: string;
  name: string;
  plan: string;
  speedMbps: number;
  monthlyFee: number;
  status: 'Active' | 'Suspended' | 'Pending';
  usageGB: number;
  rating: number;
  city: string;
}

const generateMockItems = (count: number): MockDemoItem[] => {
  const cities = ['Austin', 'Dallas', 'Houston', 'San Antonio', 'Plano'];
  const plans = ['Fiber 500M', 'Fiber 1G', 'Fiber 2G Pro', 'Business 5G'];
  const statuses: ('Active' | 'Suspended' | 'Pending')[] = ['Active', 'Suspended', 'Pending'];

  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    code: `SUB-${1000 + i}`,
    name: `Subscriber ${i + 1}`,
    plan: plans[i % plans.length],
    speedMbps: 500 * ((i % 4) + 1),
    monthlyFee: Number((49.99 + (i % 5) * 20).toFixed(2)),
    status: statuses[i % statuses.length],
    usageGB: Math.round(50 + (i * 37) % 950),
    rating: Number((4.0 + (i % 10) * 0.1).toFixed(1)),
    city: cities[i % cities.length],
  }));
};

export const DevTablePage: React.FC = () => {
  const [rowCount, setRowCount] = useState<number>(240);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isEmpty, setIsEmpty] = useState<boolean>(false);

  const data = useMemo(() => {
    if (isEmpty) return [];
    return generateMockItems(rowCount);
  }, [rowCount, isEmpty]);

  const columns: DataTableColumnDef<MockDemoItem>[] = [
    {
      id: 'code',
      header: 'Code',
      accessorKey: 'code',
      width: 110,
      sortable: true,
      filter: { type: 'text' },
    },
    {
      id: 'name',
      header: 'Subscriber',
      accessorKey: 'name',
      width: 220,
      sortable: true,
      filter: { type: 'text' },
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.original.name} size="sm" />
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {row.original.name}
            </div>
            <div className="text-[11px] text-gray-400 font-mono">
              {row.original.code}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'plan',
      header: 'Plan Tier',
      accessorKey: 'plan',
      width: 160,
      sortable: true,
      filter: {
        type: 'select',
        options: [
          { value: 'Fiber 500M', label: 'Fiber 500M' },
          { value: 'Fiber 1G', label: 'Fiber 1G' },
          { value: 'Fiber 2G Pro', label: 'Fiber 2G Pro' },
          { value: 'Business 5G', label: 'Business 5G' },
        ],
      },
    },
    {
      id: 'monthlyFee',
      header: 'Monthly Fee',
      accessorKey: 'monthlyFee',
      width: 130,
      align: 'right',
      sortable: true,
      aggregate: 'sum',
      cell: ({ getValue }) => `$${Number(getValue()).toFixed(2)}`,
    },
    {
      id: 'usageGB',
      header: 'Data Usage',
      accessorKey: 'usageGB',
      width: 140,
      align: 'right',
      sortable: true,
      aggregate: 'avg',
      cell: ({ getValue }) => `${getValue()} GB`,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      width: 130,
      sortable: true,
      filter: {
        type: 'select',
        options: [
          { value: 'Active', label: 'Active' },
          { value: 'Suspended', label: 'Suspended' },
          { value: 'Pending', label: 'Pending' },
        ],
      },
      cell: ({ getValue }) => (
        <Badge status={getValue() as any} />
      ),
    },
    {
      id: 'city',
      header: 'City Zone',
      accessorKey: 'city',
      width: 140,
      sortable: true,
      filter: {
        type: 'multi',
        options: [
          { value: 'Austin', label: 'Austin' },
          { value: 'Dallas', label: 'Dallas' },
          { value: 'Houston', label: 'Houston' },
          { value: 'San Antonio', label: 'San Antonio' },
          { value: 'Plano', label: 'Plano' },
        ],
      },
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Dev Controller Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/90 dark:border-gray-800 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#F26B3A]" />
            <span>DataTable Benchmark & QA Lab</span>
          </h2>
          <p className="text-xs text-gray-500">
            Interactive playground to test 10k rows virtualization, error states, and filters.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Row Count Selector */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold">
            {[10, 240, 1000, 10000].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setRowCount(n);
                  setIsEmpty(false);
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  rowCount === n && !isEmpty
                    ? 'bg-[#F26B3A] text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                {n >= 1000 ? `${n / 1000}k` : n} Rows
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant={isLoading ? 'primary' : 'outline'}
            onClick={() => setIsLoading(!isLoading)}
          >
            Toggle Loading
          </Button>

          <Button
            size="sm"
            variant={hasError ? 'danger' : 'outline'}
            onClick={() => setHasError(!hasError)}
          >
            Toggle Error
          </Button>

          <Button
            size="sm"
            variant={isEmpty ? 'softOrange' : 'outline'}
            onClick={() => setIsEmpty(!isEmpty)}
          >
            Toggle Empty
          </Button>
        </div>
      </div>

      {/* Main DataTable instance */}
      <DataTable
        columns={columns}
        data={data}
        loading={isLoading}
        error={hasError ? 'Simulated query connection timeout (HTTP 504).' : null}
        onRetry={() => setHasError(false)}
        viewKey="dev_table_benchmark"
        enableImport={true}
        onImport={(imported) => {
          console.log('Imported items:', imported);
        }}
        rowActions={(row) => [
          { label: 'View Profile', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => alert(`View ${row.name}`) },
          { label: 'Edit', icon: <Edit2 className="w-3.5 h-3.5" />, onClick: () => alert(`Edit ${row.name}`) },
          { label: 'Delete', danger: true, icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => alert(`Delete ${row.name}`) },
        ]}
      />
    </div>
  );
};
