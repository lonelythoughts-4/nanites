import React, { useEffect, useState } from 'react';
import { getTelegramDisplayName, cacheTelegramProfile } from '../lib/telegram';
import { api } from '../lib/api';

type LaunchGateProps = {
  onEnter: () => void;
  rolling?: boolean;
};

const LaunchGate = ({ onEnter, rolling = false }: LaunchGateProps) => {
  const [displayName, setDisplayName] = useState(() => {
    const initial = getTelegramDisplayName() || 'Runner';
    return initial.startsWith('@') ? initial.slice(1) : initial;
  });

  useEffect(() => {
    let active = true;
    let attempts = 0;

    const updateName = () => {
      const name = getTelegramDisplayName();
      if (name) {
        const cleaned = name.startsWith('@') ? name.slice(1) : name;
        if (active) setDisplayName(cleaned);
        return true;
      }
      return false;
    };

    if (updateName()) return () => { active = false; };

    const interval = setInterval(() => {
      attempts += 1;
      if (updateName() || attempts >= 20) {
        clearInterval(interval);
      }
    }, 500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const fallback = 'Runner';
    const current = displayName || fallback;
    if (current !== fallback) return () => { active = false; };

    api.getDashboard()
      .then((data: any) => {
        const name = data?.user?.username || data?.user?.first_name;
        if (!name || !active) return;
        cacheTelegramProfile({ username: data?.user?.username, first_name: data?.user?.first_name });
        const cleaned = name.startsWith('@') ? name.slice(1) : name;
        setDisplayName(cleaned);
      })
      .catch(() => {
        // ignore fetch failures
      });

    return () => {
      active = false;
    };
  }, [displayName]);

  const possessive = displayName.endsWith('s')
    ? `${displayName}'`
    : `${displayName}'s`;

  const handleEnter = () => {
    if (rolling) return;
    onEnter();
  };

  return (
    <div
      className={`launch-layer launch-gate relative min-h-screen overflow-hidden bg-[#07080d] text-white ${
        rolling ? 'launch-gate-roll pointer-events-none' : ''
      }`}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f2937_0%,#0b0f1c_45%,#05070b_100%)]" />
        <div className="absolute inset-0 opacity-60 bg-[linear-gradient(120deg,rgba(59,130,246,0.15),rgba(236,72,153,0.12),rgba(16,185,129,0.08))]" />
        <div className="absolute inset-0 launch-gate-scanlines" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl text-center">
          <div
            className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-slate-400"
            style={{ fontFamily: '"Fredoka", "Comic Neue", cursive' }}
          >
            Rogue Engine Access Protocol
          </div>

          <h1
            className="glitch mt-6 text-4xl sm:text-6xl md:text-7xl font-semibold text-white"
            data-text={possessive}
            style={{ fontFamily: '"Bangers", "Fredoka", cursive' }}
          >
            {possessive}
          </h1>

          <h2
            className="glitch mt-3 text-3xl sm:text-5xl md:text-6xl font-bold tracking-[0.2em] text-white"
            data-text="ROGUERUNNER"
            style={{ fontFamily: '"Bangers", "Fredoka", cursive' }}
          >
            ROGUERUNNER
          </h2>

          <p className="mt-5 text-sm sm:text-base text-slate-300">
            Neural handshake synchronized. Initialize the rogue engine when ready.
          </p>

          <div className="mt-10 flex justify-center">
            <button
              onClick={handleEnter}
              className="group relative inline-flex items-center justify-center rounded-full border border-cyan-400/60 bg-black/40 px-6 py-3 text-sm sm:text-base font-semibold uppercase tracking-widest text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.25)] transition hover:border-cyan-300 hover:text-white"
              style={{ fontFamily: '"Fredoka", "Comic Neue", cursive' }}
            >
              <span
                className="glitch"
                data-text="Click to access the rogue engine"
              >
                Click to access the rogue engine
              </span>
              <span className="absolute -inset-[2px] rounded-full border border-cyan-400/30 opacity-0 transition group-hover:opacity-100" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchGate;
