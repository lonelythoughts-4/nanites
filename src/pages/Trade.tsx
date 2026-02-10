import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ShieldCheck, Timer, Zap } from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { api } from '../lib/api';

type TradeStatus = 'idle' | 'arming' | 'active' | 'stopping';

const Trade = () => {
  const [status, setStatus] = useState<TradeStatus>('idle');
  const [actionState, setActionState] = useState<'idle' | 'starting' | 'stopping'>('idle');
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [dashboard, setDashboard] = useState<any>(null);
  const [cycleInfo, setCycleInfo] = useState<any>(null);
  const [tradeInfo, setTradeInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshAll = async () => {
    const [dashRes, cycleRes, tradeRes] = await Promise.allSettled([
      api.getDashboard(),
      api.getCycle(),
      api.getTradingStatus()
    ]);
    if (dashRes.status === 'fulfilled') setDashboard(dashRes.value);
    if (cycleRes.status === 'fulfilled') setCycleInfo(cycleRes.value);
    if (tradeRes.status === 'fulfilled') setTradeInfo(tradeRes.value);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        await refreshAll();
      } catch {
        // keep page usable even if api fails
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const interval = setInterval(() => {
      if (!active) return;
      refreshAll().catch(() => {
        // ignore periodic refresh failures
      });
    }, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const isTrading = !!tradeInfo?.is_trading;
    if (actionState === 'starting') {
      setStatus('arming');
      return;
    }
    if (actionState === 'stopping') {
      setStatus('stopping');
      return;
    }
    setStatus(isTrading ? 'active' : 'idle');
  }, [tradeInfo, actionState]);

  useEffect(() => {
    if (status !== 'active') return;
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handleToggle = async () => {
    if (actionState !== 'idle') return;
    const isTrading = !!tradeInfo?.is_trading;
    const canStart = tradeInfo?.can_start !== false;

    if (isTrading) {
      setActionState('stopping');
      try {
        const res: any = await api.stopTrading();
        toast.success(res?.message || 'Trading paused.');
        setSessionSeconds(0);
      } catch (err: any) {
        toast.error(err?.message || 'Failed to stop trading.');
      } finally {
        await refreshAll();
        setActionState('idle');
      }
      return;
    }

    if (!canStart) {
      toast.error('Minimum balance of $20 required to start trading.');
      return;
    }

    setActionState('starting');
    try {
      const res: any = await api.startTrading();
      toast.success(res?.message || 'Trading started.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start trading.');
    } finally {
      await refreshAll();
      setActionState('idle');
    }
  };

  const label = useMemo(() => {
    switch (status) {
      case 'active':
        return 'STOP TRADE';
      case 'arming':
        return 'ARMING';
      case 'stopping':
        return 'DISENGAGING';
      default:
        return 'START TRADE';
    }
  }, [status]);

  const subLabel = useMemo(() => {
    switch (status) {
      case 'active':
        return 'Live cycle engaged';
      case 'arming':
        return 'Locking signal';
      case 'stopping':
        return 'Cooling circuits';
      default:
        return 'Tap to ignite';
    }
  }, [status]);

  const statusTone = status === 'active' ? 'trade-status-active' : status === 'arming' ? 'trade-status-arming' : status === 'stopping' ? 'trade-status-stopping' : 'trade-status-idle';

  const displayName =
    dashboard?.user?.first_name ||
    dashboard?.user?.username ||
    'Runner';
  const available = Number(dashboard?.balance?.available || 0);
  const tier = dashboard?.user?.tier ? `TIER ${dashboard.user.tier}` : 'TIER 1';
  const cycleDay = cycleInfo?.cycle_day ?? tradeInfo?.days_elapsed ?? dashboard?.cycle?.day ?? 0;
  const daysLeft = cycleInfo?.days_remaining ?? tradeInfo?.days_remaining ?? 14 - cycleDay;
  const canStart = tradeInfo?.can_start !== false;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="min-h-screen trade-shell text-slate-100">
      <Header variant="dark" />

      <main className="trade-frame">
        <section className="trade-hero">
          <div className="trade-hero-copy">
            <div className="trade-kicker">Rogue Engine Control</div>
            <h1 className="trade-title">
              {displayName}, command the trade core.
            </h1>
            <p className="trade-subtitle">
              One tap to ignite. One tap to cool down. Stay synchronized with your cycle.
            </p>
            <div className="trade-meta-row">
              <div className="trade-meta">
                <span>Tier</span>
                <strong>{tier}</strong>
              </div>
              <div className="trade-meta">
                <span>Cycle Day</span>
                <strong>{cycleDay} / 14</strong>
              </div>
              <div className="trade-meta">
                <span>Days Left</span>
                <strong>{Math.max(0, daysLeft)}</strong>
              </div>
              <div className="trade-meta">
                <span>Available</span>
                <strong>${available.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <div className="trade-control">
            <div
              className={`trade-ring ${status}`}
              role="button"
              tabIndex={0}
              aria-pressed={status === 'active'}
              aria-disabled={actionState !== 'idle'}
              onClick={handleToggle}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleToggle();
                }
              }}
            >
              <span className="trade-orbit trade-orbit-1" />
              <span className="trade-orbit trade-orbit-2" />
              <span className="trade-orbit trade-orbit-3" />
              <button
                type="button"
                className="trade-orb"
                onClick={(event) => {
                  event.stopPropagation();
                  handleToggle();
                }}
                aria-pressed={status === 'active'}
                disabled={status === 'arming' || status === 'stopping'}
              >
                <span className="trade-orb-label">{label}</span>
                <span className="trade-orb-sub">{subLabel}</span>
              </button>
            </div>
            <div className={`trade-status ${statusTone}`}>
              <span>Status</span>
              <strong>{status === 'active' ? 'Trading Live' : status === 'arming' ? 'Arming' : status === 'stopping' ? 'Stopping' : 'Idle'}</strong>
            </div>
            {!canStart && status !== 'active' && (
              <div className="trade-warning">
                Minimum balance of $20 required to start trading.
              </div>
            )}
          </div>
        </section>

        <section className="trade-grid">
          <div className="trade-card">
            <div className="trade-card-title">
              <Timer className="h-4 w-4 text-cyan-300" />
              <span>Session Time</span>
            </div>
            <div className="trade-card-value">
              {status === 'active' ? formatTime(sessionSeconds) : '0m 00s'}
            </div>
            <div className="trade-card-sub">
              {status === 'active'
                ? 'Pulse locked. Maintain focus.'
                : 'Start trading to track your live session.'}
            </div>
          </div>

          <div className="trade-card">
            <div className="trade-card-title">
              <Zap className="h-4 w-4 text-amber-300" />
              <span>Trade Signal</span>
            </div>
            <div className="trade-card-value">
              {status === 'active' ? 'Signal Stable' : 'Awaiting Command'}
            </div>
            <div className="trade-card-sub">
              {status === 'active'
                ? 'Auto-routing enabled for the current cycle.'
                : 'Deploy when you are ready to run the cycle.'}
            </div>
          </div>

          <div className="trade-card">
            <div className="trade-card-title">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span>Risk Guard</span>
            </div>
            <div className="trade-card-value">Protection Live</div>
            <div className="trade-card-sub">
              Cycle rules and withdrawal locks are enforced automatically.
            </div>
          </div>
        </section>

        <section className="trade-log">
          <div className="trade-log-header">
            <div className="trade-log-title">
              <Activity className="h-4 w-4 text-indigo-300" />
              <span>Trade Activity</span>
            </div>
            <span className="trade-log-pill">
              {loading ? 'Syncing' : 'Live Feed'}
            </span>
          </div>
          <div className="trade-log-list">
            <div className="trade-log-row">
              <span>Trade core synchronized</span>
              <span>Just now</span>
            </div>
            <div className="trade-log-row">
              <span>Cycle gates verified</span>
              <span>{cycleDay ? `Day ${cycleDay}` : 'Checking'}</span>
            </div>
            <div className="trade-log-row">
              <span>Balance channel armed</span>
              <span>${available.toLocaleString()}</span>
            </div>
          </div>
        </section>
      </main>

      <Footer variant="dark" />
    </div>
  );
};

export default Trade;
