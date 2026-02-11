import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BadgeCheck, Gauge, ShieldCheck, Timer } from 'lucide-react';
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
        return 'Stop Trading';
      case 'arming':
        return 'Starting';
      case 'stopping':
        return 'Stopping';
      default:
        return 'Start Trading';
    }
  }, [status]);

  const subLabel = useMemo(() => {
    switch (status) {
      case 'active':
        return 'Strategy live';
      case 'arming':
        return 'Starting strategy';
      case 'stopping':
        return 'Stopping strategy';
      default:
        return 'Ready to deploy';
    }
  }, [status]);

  const statusTone =
    status === 'active'
      ? 'trade-status-active'
      : status === 'arming'
        ? 'trade-status-arming'
        : status === 'stopping'
          ? 'trade-status-stopping'
          : 'trade-status-idle';

  const displayName =
    dashboard?.user?.first_name ||
    dashboard?.user?.username ||
    'Runner';
  const available = Number(dashboard?.balance?.available || 0);
  const totalBalance = Number(dashboard?.balance?.total || available || 0);
  const tier = dashboard?.user?.tier ? `TIER ${dashboard.user.tier}` : 'TIER 1';
  const cycleDay = cycleInfo?.cycle_day ?? tradeInfo?.days_elapsed ?? dashboard?.cycle?.day ?? 0;
  const daysLeft = cycleInfo?.days_remaining ?? tradeInfo?.days_remaining ?? 14 - cycleDay;
  const canStart = tradeInfo?.can_start !== false;
  const cycleProgress = Math.min(100, Math.max(0, (cycleDay / 14) * 100));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="min-h-screen trade-shell text-slate-100">
      <Header variant="dark" />

      <main className="trade-frame">
        <section className="trade-top">
          <div>
            <div className="trade-kicker">Rogue Engine</div>
            <h1 className="trade-title">Trade Control</h1>
            <p className="trade-subtitle">
              Professional execution panel for your cycle. Start or stop the strategy with full visibility.
            </p>
          </div>
          <div className="trade-top-cards">
            <div className="trade-top-card">
              <span>Available</span>
              <strong>${available.toLocaleString()}</strong>
            </div>
            <div className="trade-top-card">
              <span>Total Balance</span>
              <strong>${totalBalance.toLocaleString()}</strong>
            </div>
            <div className="trade-top-card">
              <span>Tier</span>
              <strong>{tier}</strong>
            </div>
          </div>
        </section>

        <section className="trade-grid">
          <div className="trade-main">
            <div className="trade-card trade-command">
              <div className="trade-command-header">
                <div>
                  <div className="trade-label">Status</div>
                  <div className={`trade-status ${statusTone}`}>
                    {status === 'active'
                      ? 'Active'
                      : status === 'arming'
                        ? 'Starting'
                        : status === 'stopping'
                          ? 'Stopping'
                          : 'Idle'}
                  </div>
                </div>
                <span className={`trade-pill ${statusTone}`}>{subLabel}</span>
              </div>
              <div className="trade-command-body">
                <button
                  type="button"
                  className="trade-primary-btn"
                  onClick={handleToggle}
                  disabled={status === 'arming' || status === 'stopping'}
                >
                  {label}
                </button>
                {!canStart && status !== 'active' && (
                  <div className="trade-warning">
                    Minimum balance of $20 required to start trading.
                  </div>
                )}
                <div className="trade-session">
                  <div>
                    <span>Session time</span>
                    <strong>{status === 'active' ? formatTime(sessionSeconds) : '0m 00s'}</strong>
                  </div>
                  <div>
                    <span>Cycle day</span>
                    <strong>{cycleDay} / 14</strong>
                  </div>
                  <div>
                    <span>Days left</span>
                    <strong>{Math.max(0, daysLeft)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="trade-card trade-log">
              <div className="trade-card-title">
                <Activity className="h-4 w-4 text-slate-300" />
                <span>Trade Activity</span>
                <span className="trade-log-pill">{loading ? 'Syncing' : 'Live'}</span>
              </div>
              <div className="trade-log-list">
                <div className="trade-log-row">
                  <span>Engine synchronized</span>
                  <span>Just now</span>
                </div>
                <div className="trade-log-row">
                  <span>Cycle check</span>
                  <span>{cycleDay ? `Day ${cycleDay}` : 'Pending'}</span>
                </div>
                <div className="trade-log-row">
                  <span>Available balance</span>
                  <span>${available.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="trade-side">
            <div className="trade-card">
              <div className="trade-card-title">
                <Timer className="h-4 w-4 text-slate-300" />
                <span>Session</span>
              </div>
              <div className="trade-card-value">
                {status === 'active' ? formatTime(sessionSeconds) : '0m 00s'}
              </div>
              <div className="trade-card-sub">
                {status === 'active'
                  ? 'Monitoring live execution.'
                  : 'Start trading to begin session tracking.'}
              </div>
            </div>

            <div className="trade-card">
              <div className="trade-card-title">
                <Gauge className="h-4 w-4 text-slate-300" />
                <span>Cycle Progress</span>
              </div>
              <div className="trade-progress">
                <div className="trade-progress-bar">
                  <span style={{ width: `${cycleProgress}%` }} />
                </div>
                <div className="trade-progress-meta">
                  <span>Day {cycleDay}</span>
                  <span>{Math.max(0, daysLeft)} days left</span>
                </div>
              </div>
            </div>

            <div className="trade-card">
              <div className="trade-card-title">
                <ShieldCheck className="h-4 w-4 text-slate-300" />
                <span>Risk & Limits</span>
              </div>
              <div className="trade-card-value">Guarded</div>
              <div className="trade-card-sub">
                Cycle rules and withdrawal locks remain enforced.
              </div>
            </div>

            <div className="trade-card">
              <div className="trade-card-title">
                <BadgeCheck className="h-4 w-4 text-slate-300" />
                <span>Execution Quality</span>
              </div>
              <div className="trade-card-value">{status === 'active' ? 'Stable' : 'Standby'}</div>
              <div className="trade-card-sub">
                {status === 'active'
                  ? 'Signals aligned with the current cycle.'
                  : 'Awaiting manual start command.'}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer variant="dark" />
    </div>
  );
};

export default Trade;
