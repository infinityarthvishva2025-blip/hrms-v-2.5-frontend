import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import AppShell from '../../components/layout/AppShell';
import {
  Calendar, ChevronLeft, ChevronRight, Clock, Loader2,
  X, Send, Camera, CheckCircle, TrendingUp,
  AlertCircle, BarChart2, Filter, Edit3,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  P: 'Present', A: 'Absent', WO: 'Week Off', L: 'Leave',
  Coff: 'Comp Off', AUTO: 'Partial', H: 'Holiday',
};

const STATUS_COLORS = {
  P:    { bg: 'var(--color-success-light)', color: 'var(--color-success)',  border: '#BBF7D0' },
  A:    { bg: 'var(--color-error-light)',   color: 'var(--color-error)',    border: '#FEE2E2' },
  WO:   { bg: 'var(--color-info-light)',    color: '#0369A1',               border: '#BAE6FD' },
  L:    { bg: 'var(--color-warning-light)', color: 'var(--color-warning)',  border: '#FDE68A' },
  H:    { bg: '#FDF2F8',                    color: '#DB2777',               border: '#FBCFE8' },
  Coff: { bg: 'var(--color-accent-light)',  color: 'var(--color-accent)',   border: '#DDD6FE' },
  AUTO: { bg: '#F8FAFC',                    color: '#64748B',               border: '#E2E8F0' },
};

const StatusBadge = ({ status }) => {
  if (!status) return null;
  const c = STATUS_COLORS[status] || STATUS_COLORS.AUTO;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 'var(--radius-full)',
      fontSize: '0.72rem', fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
};

/* ── Summary stat card with gradient ─────────────────── */
const StatCard = ({ label, value, gradient, icon: Icon, suffix = '' }) => (
  <motion.div
    whileHover={{ translateY: -4 }}
    style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)',
      padding: '18px 16px',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      boxShadow: 'var(--shadow-sm)',
      cursor: 'default',
      transition: 'box-shadow 0.2s',
    }}
  >
    {/* Gradient bottom bar */}
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: gradient }} />
    {/* Gradient badge */}
    <div style={{
      width: '38px', height: '38px',
      borderRadius: 'var(--radius-md)',
      background: gradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }}>
      <Icon size={17} color="#fff" />
    </div>
    <p style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1 }}>
      {value ?? '—'}{suffix && value !== '—' ? suffix : ''}
    </p>
    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
      {label}
    </p>
  </motion.div>
);

/* ── Mobile Record Card ─────────────────────────────── */
const MobileRecordCard = ({ r, fmtT, canCorrect, onCorrect }) => {
  const date = new Date(r.date);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="asum-mobile-card"
    >
      {/* Top row: date + badges */}
      <div className="asum-mc-top">
        <div className="asum-mc-date-block">
          <span className="asum-mc-day">{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          <span className="asum-mc-weekday">{date.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
        </div>
        <div className="asum-mc-badges">
          <StatusBadge status={r.status} />
          {r.isLate && !r.isWeekOff && (
            <span className="asum-late-chip">Late {r.lateMinutes}m</span>
          )}
          {r.correctionRequested && (
            <span className="asum-corr-chip">{r.correctionStatus?.split('_')[1] || 'Correction Pending'}</span>
          )}
        </div>
      </div>

      {/* Bottom row: times + action */}
      <div className="asum-mc-bottom">
        <div className="asum-mc-times">
          {[
            { l: 'In',    v: r.isWeekOff || r.isAbsent ? '—' : fmtT(r.inTime),  c: 'var(--color-success)' },
            { l: 'Out',   v: r.isWeekOff || r.isAbsent ? '—' : fmtT(r.outTime), c: 'var(--color-primary)' },
            ...(r.totalHours ? [{ l: 'Hrs', v: `${r.totalHours.toFixed(1)}h`, c: '#8B5CF6' }] : []),
          ].map(m => (
            <div key={m.l} className="asum-mc-time-item">
              <span className="asum-mc-tlabel">{m.l}</span>
              <span className="asum-mc-tval" style={{ color: m.c }}>{m.v}</span>
            </div>
          ))}
        </div>
        {canCorrect && !r.correctionRequested && (
          <button onClick={onCorrect} className="asum-correct-btn">
            <Edit3 size={13} /> Correct
          </button>
        )}
      </div>
    </motion.div>
  );
};

const AttendanceSummary = () => {
  const { user } = useAuth();
  const [records, setRecords]     = useState([]);
  const [summary, setSummary]     = useState({ present: 0, absent: 0, weekOff: 0, late: 0, totalHours: 0 });
  const [loading, setLoading]     = useState(true);
  const [month, setMonth]         = useState(new Date().getMonth());
  const [year, setYear]           = useState(new Date().getFullYear());
  const [showMobile, setShowMobile] = useState(window.innerWidth < 768);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedRecord, setSelectedRecord]           = useState(null);
  const [correctionForm, setCorrectionForm]           = useState({ requestedInTime: '', requestedOutTime: '', reason: '', proofUrl: '' });
  const [actionLoading, setActionLoading]             = useState(false);

  useEffect(() => {
    const onResize = () => setShowMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(year, month, 1), end = new Date(year, month + 1, 0);
      const { data } = await api.get('/attendance/my-summary', {
        params: { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] },
      });
      setRecords(data.data.records);
      setSummary(data.data.summary);
    } catch (_) {}
    setLoading(false);
  }, [month, year]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const fmtT = (s) => s ? new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
  const monthName = new Date(year, month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const avgHours = summary.present > 0 ? (summary.totalHours / summary.present).toFixed(1) : '—';

  const handleOpenCorrection = (record) => {
    setSelectedRecord(record);
    setCorrectionForm({
      requestedInTime:  record.inTime  ? new Date(record.inTime).toTimeString().slice(0, 5)  : '09:30',
      requestedOutTime: record.outTime ? new Date(record.outTime).toTimeString().slice(0, 5) : '18:00',
      reason: '', proofUrl: '',
    });
    setShowCorrectionModal(true);
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const date = new Date(selectedRecord.date).toISOString().split('T')[0];
      await api.post(`/attendance/correction/${selectedRecord._id}`, {
        reason: correctionForm.reason,
        requestedInTime:  `${date}T${correctionForm.requestedInTime}:00`,
        requestedOutTime: `${date}T${correctionForm.requestedOutTime}:00`,
        proofUrl: correctionForm.proofUrl,
      });
      toast.success('Correction request submitted!');
      setShowCorrectionModal(false);
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally { setActionLoading(false); }
  };

  const statCards = [
    { label: 'Present',  value: summary.present, gradient: 'var(--gradient-success)', icon: CheckCircle },
    { label: 'Absent',   value: summary.absent,  gradient: 'var(--gradient-error)',   icon: AlertCircle },
    { label: 'Late Ins', value: summary.late,    gradient: 'var(--gradient-warning)',  icon: Clock },
    { label: 'Week Off', value: summary.weekOff, gradient: 'var(--gradient-primary)',  icon: Calendar },
    { label: 'Avg Hours',value: avgHours,         gradient: 'var(--gradient-accent)',   icon: TrendingUp, suffix: 'h' },
  ];

  return (
    <AppShell>
      <div className="page-wrapper fade-in">

        {/* ── Hero Header ─────────────────────────────── */}
        <div className="asum-header">
          <div className="asum-header-gradient" />
          <div className="asum-header-content">
            <div>
              <h1 className="asum-title">My Attendance</h1>
              <p className="asum-subtitle">{user?.name} &middot; {user?.employeeCode}</p>
            </div>
            {/* Month Navigator inside header */}
            <div className="asum-month-nav">
              <button className="btn-icon" onClick={prevMonth}><ChevronLeft size={16} /></button>
              <div className="asum-month-label">
                <Calendar size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <span>{monthName}</span>
              </div>
              <button className="btn-icon" onClick={nextMonth}><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>

        {/* ── Summary Stats Grid ───────────────────────── */}
        {loading ? (
          <div className="asum-stat-grid">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '110px', borderRadius: 'var(--radius-xl)' }} />)}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="asum-stat-grid"
          >
            {statCards.map(s => <StatCard key={s.label} {...s} />)}
          </motion.div>
        )}

        {/* ── Records View  ─────────────────────────────── */}
        <div className="asum-records-header">
          <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-text)' }}>
            Attendance Log
          </p>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
            {records.length} records
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: '62px', borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : showMobile ? (
          /* Mobile Cards */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {records.length === 0
              ? <div className="asum-empty">No records found for this month</div>
              : records.map((r, i) => {
                  const canCorrect = r.status && !['A', 'H', 'WO'].includes(r.status);
                  return (
                    <MobileRecordCard
                      key={i}
                      r={r}
                      fmtT={fmtT}
                      canCorrect={canCorrect}
                      onCorrect={() => handleOpenCorrection(r)}
                    />
                  );
                })}
          </div>
        ) : (
          /* Desktop Table */
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="card asum-table-wrap"
          >
            <table className="data-table">
              <thead>
                <tr>
                  {['Date', 'Day', 'Check In', 'Check Out', 'Hours', 'Status', 'Action'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '52px', color: 'var(--color-text-tertiary)' }}>
                      No records found for this month
                    </td>
                  </tr>
                ) : records.map((r, i) => {
                  const date = new Date(r.date);
                  const isWkend = date.getDay() === 0;
                  const canCorrect = r.status && !['A', 'H', 'WO'].includes(r.status);
                  return (
                    <tr key={i} style={{ background: isWkend ? 'rgba(32,118,199,0.025)' : 'transparent' }}>
                      <td style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                        {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>
                        {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                      </td>
                      <td style={{ fontWeight: r.inTime ? 700 : 400, color: r.inTime ? 'var(--color-success)' : 'var(--color-text-tertiary)', fontSize: '0.88rem' }}>
                        {r.isWeekOff || r.isAbsent ? '—' : fmtT(r.inTime)}
                      </td>
                      <td style={{ fontWeight: r.outTime ? 700 : 400, color: r.outTime ? 'var(--color-primary)' : 'var(--color-text-tertiary)', fontSize: '0.88rem' }}>
                        {r.isWeekOff || r.isAbsent ? '—' : fmtT(r.outTime)}
                      </td>
                      <td style={{ color: '#8B5CF6', fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums', fontWeight: r.totalHours ? 700 : 400 }}>
                        {r.totalHours ? `${r.totalHours.toFixed(1)}h` : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <StatusBadge status={r.status} />
                          {r.isLate && !r.isWeekOff && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-warning)', background: 'var(--color-warning-light)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700, border: '1px solid #FDE68A' }}>
                              Late {r.lateMinutes}m
                            </span>
                          )}
                          {r.correctionRequested && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                              {r.correctionStatus?.split('_')[1] || 'Pending'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {canCorrect && !r.correctionRequested && (
                          <button
                            onClick={() => handleOpenCorrection(r)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                              border: 'none', padding: '6px 12px', borderRadius: 'var(--radius-full)',
                              cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit',
                              transition: 'all 0.2s',
                            }}
                          >
                            <Edit3 size={12} /> Request Correction
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* ── Correction Modal ─────────────────────────── */}
        {createPortal(
          <AnimatePresence>
            {showCorrectionModal && (
              <div className="modal-backdrop" style={{ zIndex: 1000 }}>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowCorrectionModal(false)}
                  style={{ position: 'absolute', inset: 0 }}
                />
                <motion.div
                  initial={{ scale: 0.92, opacity: 0, y: 24 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.92, opacity: 0 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                  className="asum-corr-modal"
                >
                  {/* Gradient top strip */}
                  <div className="asum-corr-strip" />

                  <div className="asum-corr-body">
                    {/* Header */}
                    <div className="asum-corr-head">
                      <div>
                        <div className="asum-corr-icon">
                          <Edit3 size={16} color="#fff" />
                        </div>
                        <h2>Request Correction</h2>
                        {selectedRecord && (
                          <p className="asum-corr-date">
                            {new Date(selectedRecord.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <button className="btn-icon" onClick={() => setShowCorrectionModal(false)}>
                        <X size={17} />
                      </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleCorrectionSubmit} className="asum-corr-form">
                      {/* Time pickers */}
                      <div className="asum-corr-times">
                        <div className="form-group">
                          <label className="form-label">Correct In-Time</label>
                          <input
                            type="time"
                            className="input-field"
                            value={correctionForm.requestedInTime}
                            onChange={e => setCorrectionForm({ ...correctionForm, requestedInTime: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Correct Out-Time</label>
                          <input
                            type="time"
                            className="input-field"
                            value={correctionForm.requestedOutTime}
                            onChange={e => setCorrectionForm({ ...correctionForm, requestedOutTime: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="form-group">
                        <label className="form-label">Reason for Correction *</label>
                        <textarea
                          className="input-field"
                          rows={3}
                          placeholder="Please provide a valid reason..."
                          required
                          value={correctionForm.reason}
                          onChange={e => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                        />
                      </div>

                      {/* Proof URL */}
                      <div className="form-group">
                        <label className="form-label">Supporting Proof (URL)</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            className="input-field"
                            style={{ paddingRight: '44px' }}
                            placeholder="Link to document or image"
                            value={correctionForm.proofUrl}
                            onChange={e => setCorrectionForm({ ...correctionForm, proofUrl: e.target.value })}
                          />
                          <Camera size={17} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                        </div>
                      </div>

                      {/* Info note */}
                      <div className="asum-corr-note">
                        <AlertCircle size={14} style={{ flexShrink: 0, color: 'var(--color-warning)' }} />
                        <span>Correction requests are subject to manager approval and may take 1–2 business days.</span>
                      </div>

                      {/* Actions */}
                      <div className="asum-corr-actions">
                        <button type="button" className="btn-secondary" onClick={() => setShowCorrectionModal(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={actionLoading}>
                          {actionLoading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                          Submit Request
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
      </div>

      <style>{`
        /* ─── Header ──────────────────────────────────── */
        .asum-header {
          position: relative;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-2xl);
          overflow: hidden;
          margin-bottom: 20px;
          box-shadow: var(--shadow-sm);
        }

        .asum-header-gradient {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: var(--gradient-primary);
        }

        .asum-header-content {
          padding: 22px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .asum-title {
          font-size: clamp(1.5rem, 4vw, 2rem);
          font-weight: 900;
          letter-spacing: -0.04em;
          color: var(--color-text);
          margin-bottom: 2px;
        }

        .asum-subtitle {
          color: var(--color-text-secondary);
          font-weight: 500;
          font-size: 0.9rem;
        }

        /* Month navigator */
        .asum-month-nav {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--color-surface-alt);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: 8px 12px;
        }

        .asum-month-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          font-size: 0.92rem;
          min-width: 158px;
          justify-content: center;
        }

        /* ─── Stats Grid ──────────────────────────────── */
        .asum-stat-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 22px;
        }

        /* ─── Records Header ──────────────────────────── */
        .asum-records-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .asum-table-wrap {
          overflow: hidden;
          border-radius: var(--radius-xl);
        }

        /* ─── Mobile Cards ────────────────────────────── */
        .asum-mobile-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: 14px 16px;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .asum-mc-top {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .asum-mc-date-block {
          display: flex;
          flex-direction: column;
          min-width: 52px;
        }

        .asum-mc-day {
          font-weight: 800;
          font-size: 0.95rem;
          color: var(--color-text);
        }

        .asum-mc-weekday {
          font-size: 0.72rem;
          color: var(--color-text-tertiary);
          font-weight: 600;
        }

        .asum-mc-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          align-items: center;
        }

        .asum-late-chip {
          font-size: 0.7rem;
          color: var(--color-warning);
          background: var(--color-warning-light);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-weight: 700;
          border: 1px solid #FDE68A;
          white-space: nowrap;
        }

        .asum-corr-chip {
          font-size: 0.7rem;
          color: var(--color-primary);
          background: var(--color-primary-light);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-weight: 700;
          white-space: nowrap;
        }

        .asum-mc-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-top: 1px solid var(--color-border);
          padding-top: 10px;
        }

        .asum-mc-times {
          display: flex;
          gap: 18px;
        }

        .asum-mc-time-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .asum-mc-tlabel {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--color-text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .asum-mc-tval {
          font-weight: 800;
          font-size: 0.9rem;
        }

        .asum-correct-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--color-primary-light);
          color: var(--color-primary);
          border: none;
          padding: 7px 13px;
          border-radius: var(--radius-full);
          cursor: pointer;
          font-size: 0.78rem;
          font-weight: 700;
          font-family: inherit;
          white-space: nowrap;
          flex-shrink: 0;
          transition: background 0.2s;
        }

        .asum-correct-btn:hover { background: rgba(32,118,199,0.15); }

        .asum-empty {
          text-align: center;
          padding: 60px 20px;
          color: var(--color-text-tertiary);
          font-weight: 500;
        }

        /* ─── Correction Modal ────────────────────────── */
        .asum-corr-modal {
          position: relative;
          background: var(--color-surface);
          border-radius: var(--radius-2xl);
          width: calc(100% - 32px);
          max-width: 480px;
          max-height: 92dvh;
          overflow: auto;
          box-shadow: var(--shadow-2xl);
          z-index: 1001;
        }

        .asum-corr-strip {
          height: 4px;
          background: var(--gradient-primary);
        }

        .asum-corr-body { padding: 24px; }

        .asum-corr-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 22px;
        }

        .asum-corr-icon {
          width: 36px; height: 36px;
          border-radius: var(--radius-md);
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          box-shadow: 0 4px 12px rgba(32,118,199,0.3);
        }

        .asum-corr-head h2 {
          font-size: 1.3rem;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: var(--color-text);
          margin-bottom: 3px;
        }

        .asum-corr-date {
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          font-weight: 500;
        }

        .asum-corr-form { display: flex; flex-direction: column; gap: 16px; }

        .asum-corr-times {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .asum-corr-note {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 12px 14px;
          background: var(--color-warning-light);
          border: 1px solid #FDE68A;
          border-radius: var(--radius-lg);
          font-size: 0.78rem;
          color: var(--color-warning);
          line-height: 1.5;
          font-weight: 500;
        }

        .asum-corr-actions {
          display: flex;
          gap: 10px;
          padding-top: 4px;
        }

        .asum-corr-actions button { flex: 1; }

        /* ─── Responsive ──────────────────────────────── */
        @media (max-width: 1100px) {
          .asum-stat-grid { grid-template-columns: repeat(3, 1fr); }
        }

        @media (max-width: 720px) {
          .asum-stat-grid { grid-template-columns: repeat(2, 1fr); }
          .asum-header-content { flex-direction: column; align-items: flex-start; }
          .asum-month-nav { width: 100%; }
          .asum-month-label { flex: 1; }
        }

        @media (max-width: 480px) {
          .asum-stat-grid { grid-template-columns: repeat(2, 1fr); }

          .asum-corr-modal {
            width: calc(100% - 16px);
            max-height: 95dvh;
            border-radius: var(--radius-xl);
          }

          .asum-corr-times { grid-template-columns: 1fr; }
          .asum-corr-actions { flex-direction: column-reverse; }
        }
      `}</style>
    </AppShell>
  );
};

export default AttendanceSummary;
