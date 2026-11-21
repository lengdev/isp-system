import React, { useState, useEffect } from 'react';
import { Zap, Play, CheckCircle2, RotateCcw, ArrowDown, ArrowUp, Activity } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export const SpeedTestModal: React.FC = () => {
  const modalState = useStore((s) => s.modalState.speedTest);
  const closeModal = useStore((s) => s.closeModal);
  const customers = useStore((s) => s.customers);

  const customer = modalState.customerId ? customers.find((c) => c.id === modalState.customerId) : null;

  const [testingStage, setTestingStage] = useState<'idle' | 'ping' | 'download' | 'upload' | 'done'>('idle');
  const [ping, setPing] = useState(12);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [jitter, setJitter] = useState(1.2);

  const targetDown = customer ? customer.monthlyPrice > 70 ? 492 : 285 : 320;
  const targetUp = Math.round(targetDown * 0.45);

  const startTest = () => {
    setTestingStage('ping');
    setDownloadSpeed(0);
    setUploadSpeed(0);

    // Simulate ping phase
    setTimeout(() => {
      setPing(Math.floor(9 + Math.random() * 8));
      setJitter(Number((1.1 + Math.random() * 0.8).toFixed(1)));
      setTestingStage('download');

      // Simulate download phase
      let currentDown = 0;
      const downInterval = setInterval(() => {
        currentDown += Math.floor(Math.random() * 45) + 30;
        if (currentDown >= targetDown) {
          setDownloadSpeed(targetDown);
          clearInterval(downInterval);
          setTestingStage('upload');

          // Simulate upload phase
          let currentUp = 0;
          const upInterval = setInterval(() => {
            currentUp += Math.floor(Math.random() * 30) + 18;
            if (currentUp >= targetUp) {
              setUploadSpeed(targetUp);
              clearInterval(upInterval);
              setTestingStage('done');
            } else {
              setUploadSpeed(currentUp);
            }
          }, 60);
        } else {
          setDownloadSpeed(currentDown);
        }
      }, 60);
    }, 600);
  };

  useEffect(() => {
    if (modalState.isOpen) {
      setTestingStage('idle');
      setDownloadSpeed(0);
      setUploadSpeed(0);
    }
  }, [modalState.isOpen]);

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={() => closeModal('speedTest')}
      title={
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#F26B3A]" />
          <span>Diagnostic Line Speed Test</span>
        </div>
      }
      subtitle={customer ? `Probing line for ${customer.fullName} (${customer.ipAddress})` : 'Live Speed Test'}
      size="md"
    >
      <div className="space-y-6 text-xs text-center select-none">
        {/* Animated Gauge Display */}
        <div className="relative py-6 flex flex-col items-center justify-center">
          <div className="w-48 h-48 rounded-full border-8 border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Spinning radar during active test */}
            {testingStage !== 'idle' && testingStage !== 'done' && (
              <div className="absolute inset-0 border-t-8 border-[#F26B3A] rounded-full animate-spin" />
            )}

            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              {testingStage === 'ping'
                ? 'Testing Latency'
                : testingStage === 'download'
                ? 'Downloading Test Packet'
                : testingStage === 'upload'
                ? 'Uploading Test Packet'
                : testingStage === 'done'
                ? 'Line Test Complete'
                : 'Ready to Test'}
            </span>

            <div className="text-4xl font-black text-gray-900 dark:text-gray-100 mt-1">
              {testingStage === 'upload' || testingStage === 'done' ? uploadSpeed : downloadSpeed}
            </div>
            <span className="text-xs font-bold text-[#F26B3A]">Mbps</span>
          </div>
        </div>

        {/* 3 Metric Tiles */}
        <div className="grid grid-cols-3 gap-3">
          {/* Latency */}
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#1E1E22] border border-gray-200/80 dark:border-gray-800">
            <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase font-bold mb-1">
              <Activity className="w-3 h-3 text-blue-500" />
              <span>Ping / Latency</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {testingStage === 'idle' ? '--' : `${ping} ms`}
            </div>
            <span className="text-[10px] text-gray-400">Jitter: {jitter} ms</span>
          </div>

          {/* Download */}
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#1E1E22] border border-gray-200/80 dark:border-gray-800">
            <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase font-bold mb-1">
              <ArrowDown className="w-3 h-3 text-[#F26B3A]" />
              <span>Download</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {testingStage === 'idle' ? '--' : `${downloadSpeed} Mbps`}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold">99.4% of Plan</span>
          </div>

          {/* Upload */}
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#1E1E22] border border-gray-200/80 dark:border-gray-800">
            <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase font-bold mb-1">
              <ArrowUp className="w-3 h-3 text-blue-500" />
              <span>Upload</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {testingStage === 'idle' ? '--' : `${uploadSpeed} Mbps`}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold">Optical Symmetrical</span>
          </div>
        </div>

        {/* Start / Rerun button */}
        <div className="flex justify-center pt-2">
          {testingStage === 'idle' ? (
            <Button size="md" variant="primary" onClick={startTest}>
              <Play className="w-4 h-4 fill-white" />
              <span>Start Speed Test</span>
            </Button>
          ) : testingStage === 'done' ? (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Line Status: Grade A+ (Optimal Performance)</span>
              </div>
              <div>
                <Button size="sm" variant="outline" onClick={startTest}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Run Test Again</span>
                </Button>
              </div>
            </div>
          ) : (
            <span className="text-xs font-semibold text-gray-500 animate-pulse">
              Measuring socket throughput...
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
};
