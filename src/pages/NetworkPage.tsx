import React from 'react';
import { Radio, RefreshCw, Server, Cpu, HardDrive, Wifi, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';

export const NetworkPage: React.FC = () => {
  const devices = useStore((s) => s.devices);
  const rebootDevice = useStore((s) => s.rebootDevice);

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
            Network Infrastructure & OLT Fleet
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Monitor optical line terminals, core BGP routers, and point-to-multipoint wireless towers
          </p>
        </div>
      </div>

      {/* Network Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {devices.map((dev) => (
          <div
            key={dev.id}
            className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    dev.status === 'Online'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60'
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

              {/* Stats */}
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
              onClick={() => rebootDevice(dev.id)}
              className="w-full text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reboot Device</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
