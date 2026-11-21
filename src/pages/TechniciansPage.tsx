import React from 'react';
import { Wrench, Calendar, Phone, Mail, Star, MapPin, CheckCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Avatar } from '../components/ui/Avatar';
import { formatDate } from '../lib/utils';

export const TechniciansPage: React.FC = () => {
  const technicians = useStore((s) => s.technicians);
  const schedules = useStore((s) => s.schedules);

  return (
    <div className="space-y-6 pb-12 select-none">
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
          Technicians & Field Installations
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Manage field engineers, ONT splicing schedules, and service dispatch
        </p>
      </div>

      {/* Technicians Roster */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
          Field Engineer Roster ({technicians.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {technicians.map((tech) => (
            <div
              key={tech.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft space-y-3"
            >
              <div className="flex items-center gap-3">
                <Avatar name={tech.name} size="lg" online={tech.status === 'Available' || tech.status === 'On Job'} />
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{tech.name}</h4>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tech.status === 'Available'
                        ? 'bg-emerald-100 text-emerald-700'
                        : tech.status === 'On Job'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {tech.status}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>Coverage Zone: {tech.zone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{tech.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span className="font-bold text-gray-700 dark:text-gray-200">
                    {tech.rating} / 5.0 Rating ({tech.completedToday} done today)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Installations Schedule */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
          Today's Scheduled Installations
        </h3>
        <div className="w-full overflow-x-auto rounded-2xl bg-white dark:bg-[#1C1C1F] border border-gray-200/80 dark:border-gray-800 shadow-soft">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 text-gray-500 font-semibold">
                <th className="py-3.5 px-4">Time Slot</th>
                <th className="py-3.5 px-4">Subscriber</th>
                <th className="py-3.5 px-4">Service Address</th>
                <th className="py-3.5 px-4">Plan</th>
                <th className="py-3.5 px-4">Technician</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {schedules.map((sch) => (
                <tr key={sch.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                  <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-gray-100">
                    {sch.timeSlot}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-gray-800 dark:text-gray-200">{sch.customerName}</div>
                    <div className="text-[11px] text-gray-400">{sch.customerPhone}</div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">{sch.address}</td>
                  <td className="py-3.5 px-4 font-semibold text-[#F26B3A]">{sch.planName}</td>
                  <td className="py-3.5 px-4 text-gray-800 dark:text-gray-200">{sch.technicianName}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        sch.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : sch.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {sch.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
