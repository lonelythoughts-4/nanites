import React, { useEffect, useState } from 'react';

type LaunchLoadingProps = {
  onComplete: () => void;
};

const LaunchLoading = ({ onComplete }: LaunchLoadingProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const durationMs = 3600;
    const stepMs = 40;
    const totalSteps = Math.ceil(durationMs / stepMs);
    const increment = 100 / totalSteps;
    let tick = 0;

    const interval = setInterval(() => {
      tick += 1;
      setProgress((prev) => {
        const next = Math.min(100, prev + increment);
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 200);
        }
        return next;
      });
    }, stepMs);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="launch-layer launch-loading relative min-h-screen overflow-hidden bg-[#07080d] text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f2937_0%,#0b0f1c_45%,#05070b_100%)]" />
        <div className="absolute inset-0 opacity-60 bg-[linear-gradient(120deg,rgba(59,130,246,0.15),rgba(236,72,153,0.12),rgba(16,185,129,0.08))]" />
        <div className="absolute inset-0 launch-gate-scanlines" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl text-center">
          <div
            className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-slate-400"
            style={{ fontFamily: '"Fredoka", "Comic Neue", cursive' }}
          >
            Rogue Engine Boot Sequence
          </div>

          <div className="mt-6">
            <div
              className="glitch text-2xl sm:text-3xl font-semibold"
              data-text="Initializing"
              style={{ fontFamily: '"Bangers", "Fredoka", cursive' }}
            >
              Initializing
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Calibrating node access and synchronizing signal...
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-cyan-400/40 bg-black/50 p-5 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
            <div className="flex items-center justify-between text-xs text-cyan-200">
              <span>Access Calibration</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-cyan-900/40">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-300 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-6 text-[11px] text-slate-400">
            Keep steady. The rogue engine is aligning.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchLoading;
