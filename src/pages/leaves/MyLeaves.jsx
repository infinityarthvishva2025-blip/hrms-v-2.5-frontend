import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDays, Plus, Loader2, XCircle, Clock, CheckCircle, FileText, X, AlertCircle, Calendar, History, TrendingUp, Info, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '../../components/layout/AppShell';
import { getMyLeaves, cancelLeave, getCompOffBalanceHistory } from '../../api/leave.api';

const statusConfig = {
  Pending: { color: '#D97706', bg: '#FEF3C7', icon: Clock },
  Approved: { color: '#059669', bg: '#D1FAE5', icon: CheckCircle },
  Rejected: { color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  Cancelled: { color: '#475569', bg: '#F1F5F9', icon: FileText },
};

const StatusBadge = ({ status }) => {
  const conf = statusConfig[status] || statusConfig.Pending;
  const Icon = conf.icon;
  return (
    <div className="ml-status-badge" style={{ background: conf.bg, color: conf.color }}>
      <Icon size={14} strokeWidth={2.5} />
      <span>{status}</span>
    </div>
  );
};

const CancelModal = ({ leave, onClose, onRefresh }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    try {
      await cancelLeave(leave._id, reason);
      toast.success('Leave request cancelled');
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="ml-modal"
      >
        <button onClick={onClose} className="ml-modal-close"><X size={18} /></button>
        
        <div className="ml-modal-header">
          <div className="ml-modal-icon"><AlertCircle size={24} /></div>
          <h2>Cancel Leave Request</h2>
          <p>Are you sure you want to cancel this <strong>{leave.leaveType}</strong> leave?</p>
        </div>

        <div className="ml-modal-body">
          <label>CANCELLATION REASON (OPTIONAL)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you cancelling?"
            rows={3}
          />
        </div>

        <div className="ml-modal-actions">
          <button onClick={onClose} className="ml-btn-secondary">Keep Leave</button>
          <button onClick={handleCancel} disabled={loading} className="ml-btn-danger">
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Cancel Leave'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const CompOffHistoryModal = ({ onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await getCompOffBalanceHistory();
        setHistory(data.data.history || []);
      } catch (err) {
        toast.error('Failed to load comp-off history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Available': return { bg: '#D1FAE5', color: '#059669' };
      case 'Used': return { bg: '#DBEAFE', color: '#2563EB' };
      case 'Expired': return { bg: '#FEE2E2', color: '#DC2626' };
      case 'Deduction': return { bg: '#F1F5F9', color: '#475569' };
      default: return { bg: '#F3F4F6', color: '#6B7280' };
    }
  };

  return (
    <div className="ml-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        className="ml-side-panel"
      >
        <div className="ml-side-header">
          <div className="flex items-center gap-3">
            <div className="ml-side-icon"><TrendingUp size={20} /></div>
            <div>
              <h3>Comp-Off Balance Details</h3>
              <p>Track your earned and used comp-offs</p>
            </div>
          </div>
          <button onClick={onClose} className="ml-side-close"><X size={20} /></button>
        </div>

        <div className="ml-side-content">
          {loading ? (
            <div className="ml-side-loading">
              <Loader2 size={32} className="animate-spin" />
              <p>Fetching records...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="ml-side-empty">
              <Info size={40} />
              <p>No comp-off records found</p>
            </div>
          ) : (
            <div className="ml-history-list">
              {history.map((item, i) => (
                <motion.div
                  key={item._id || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="ml-history-item"
                >
                  <div className="ml-history-main">
                    <div className="ml-history-info">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="ml-history-amount">
                          {item.type === 'Deduction' ? '-' : '+'}{item.amount} Day{item.amount > 1 ? 's' : ''}
                        </span>
                        <span className="ml-history-status" style={getStatusStyle(item.status)}>
                          {item.status}
                        </span>
                      </div>
                      <p className="ml-history-remarks">{item.remarks}</p>
                    </div>
                  </div>

                  <div className="ml-history-grid">
                    <div className="ml-history-col">
                      <span className="ml-history-label">Earned Date</span>
                      <span className="ml-history-value">{formatDate(item.earnedDate)}</span>
                    </div>
                    {item.type === 'Accrual' && (
                      <div className="ml-history-col">
                        <span className="ml-history-label">Expiry Date</span>
                        <span className="ml-history-value">{formatDate(item.expiryDate)}</span>
                      </div>
                    )}
                    {item.status === 'Used' && (
                      <div className="ml-history-col">
                        <span className="ml-history-label">Used Date</span>
                        <span className="ml-history-value">{formatDate(item.usedDate)}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const SummaryCard = ({ title, count, color, icon: Icon, onClick, hasAction }) => (
  <div className={`ml-summary-card ${hasAction ? 'clickable' : ''}`} onClick={onClick}>
    <div className="ml-summary-accent" style={{ background: color }} />
    <div className="ml-summary-content">
      <div className="ml-summary-header">
        <span>{title}</span>
        <div className="ml-summary-icon" style={{ color: color, background: `${color}15` }}>
          <Icon size={18} />
        </div>
      </div>
      <div className="ml-summary-count">
        {count}
        {hasAction && <ChevronRight size={20} className="ml-summary-arrow" />}
      </div>
    </div>
  </div>
);

const MyLeaves = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [summary, setSummary] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [filter, setFilter] = useState('All');
  const [cancelLeaveObj, setCancelLeaveObj] = useState(null);
  const [showCompOffHistory, setShowCompOffHistory] = useState(false);
  const [compOffBalance, setCompOffBalance] = useState(0);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getMyLeaves({ status: filter, limit: 50 });
      setLeaves(data.data.leaves);
      if (data.data.summary) {
        setSummary(data.data.summary);
      }

      // Also fetch comp-off balance
      const res = await getCompOffBalanceHistory();
      setCompOffBalance(res.data.data.currentBalance || 0);
    } catch (err) {
      toast.error('Failed to load leaves');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <AppShell>
      <div className="ml-page-wrapper fade-in">
        
        {/* ── Header ── */}
        <div className="ml-header">
          <div className="ml-header-text">
            <h1>My Leaves</h1>
            <p>Track your leave applications and real-time status</p>
          </div>
          <div className="ml-header-actions">
            <button onClick={() => navigate('/leaves/history')} className="ml-btn-secondary-outline">
              <History size={18} />
              <span>Leave History</span>
            </button>
            <button onClick={() => navigate('/leaves/apply')} className="ml-btn-primary">
              <Plus size={18} strokeWidth={2.5} />
              <span>Apply Leave</span>
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="ml-stats-grid">
          <SummaryCard title="Total Applied" count={summary.total} color="#3B82F6" icon={FileText} />
          <SummaryCard title="Approved" count={summary.approved} color="#10B981" icon={CheckCircle} />
          <SummaryCard title="Comp-Off Bal" count={compOffBalance} color="#8B5CF6" icon={TrendingUp} hasAction onClick={() => setShowCompOffHistory(true)} />
          <SummaryCard title="Pending" count={summary.pending} color="#F59E0B" icon={Clock} />
        </div>

        {/* ── Filters ── */}
        <div className="ml-filter-scroll">
          <div className="ml-filters">
            {['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`ml-filter-btn ${filter === f ? 'active' : ''}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ── List ── */}
        <div className="ml-list-container">
          {loading ? (
            <div className="ml-empty-state">
              <Loader2 size={36} className="animate-spin ml-text-primary" />
              <p>Loading your leaves...</p>
            </div>
          ) : leaves.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-empty-state">
              <div className="ml-empty-icon"><CalendarDays size={40} /></div>
              <h3>No leaves found</h3>
              <p>You haven't applied for any leaves in this category.</p>
              {filter !== 'All' && (
                <button onClick={() => setFilter('All')} className="ml-btn-outline">View All Leaves</button>
              )}
            </motion.div>
          ) : (
            <div className="ml-leaves-list">
              <AnimatePresence>
                {leaves.map((leave, i) => (
                  <motion.div
                    key={leave._id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="ml-leave-card"
                  >
                    <div className="ml-card-main">
                      <div className="ml-card-icon-wrap">
                        <Calendar size={22} className="ml-card-icon" />
                      </div>
                      <div className="ml-card-info">
                        <div className="ml-card-title-row">
                          <span className="ml-leave-type">{leave.leaveType}</span>
                          {leave.halfDay && (
                            <span className="ml-halfday-badge">Half Day ({leave.halfDayPeriod})</span>
                          )}
                        </div>
                        <div className="ml-leave-dates">
                          {formatDate(leave.startDate)} {leave.totalDays > 1 && `— ${formatDate(leave.endDate)}`} 
                          <span className="ml-bullet">•</span> 
                          <strong>{leave.totalDays} {leave.totalDays === 1 ? 'day' : 'days'}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="ml-card-reason">
                      <span className="ml-label">Reason</span>
                      <p>{leave.reason.length > 50 ? `${leave.reason.substring(0, 50)}...` : leave.reason}</p>
                    </div>

                    <div className="ml-card-actions">
                      <div className="ml-status-column">
                        <span className="ml-label">Status</span>
                        <StatusBadge status={leave.overallStatus} />
                      </div>
                      
                      {leave.overallStatus === 'Pending' ? (
                        <button
                          onClick={() => setCancelLeaveObj(leave)}
                          className="ml-cancel-icon-btn"
                          title="Cancel Request"
                        >
                          <XCircle size={20} />
                        </button>
                      ) : (
                        <div className="ml-spacer" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      
      <AnimatePresence>
        {cancelLeaveObj && (
          <CancelModal
            leave={cancelLeaveObj}
            onClose={() => setCancelLeaveObj(null)}
            onRefresh={fetchLeaves}
          />
        )}
        {showCompOffHistory && (
          <CompOffHistoryModal
            onClose={() => setShowCompOffHistory(false)}
          />
        )}
      </AnimatePresence>

      <style>{`
        /* ── Base Layout ── */
        .ml-page-wrapper {
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
          padding: 0 4px 40px;
        }

        /* ── Header ── */
        .ml-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 32px;
        }

        .ml-header-text h1 {
          font-size: clamp(1.6rem, 4vw, 2rem);
          font-weight: 900;
          letter-spacing: -0.04em;
          color: var(--color-text);
          margin: 0 0 4px 0;
        }

        .ml-header-text p {
          color: var(--color-text-secondary);
          font-size: 0.95rem;
          margin: 0;
        }

        .ml-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 24px;
          border-radius: var(--radius-xl);
          border: none;
          background: var(--gradient-primary);
          color: #fff;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(32,118,199,0.25);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ml-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(32,118,199,0.35);
        }

        .ml-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ml-btn-secondary-outline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 20px;
          border-radius: var(--radius-xl);
          border: 1.5px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-secondary);
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ml-btn-secondary-outline:hover {
          background: var(--color-surface-alt);
          border-color: var(--color-border-dark);
          color: var(--color-primary);
          transform: translateY(-1px);
        }

        /* ── Stats ── */
        .ml-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }

        .ml-summary-card {
          background: var(--color-surface);
          border-radius: var(--radius-xl);
          border: 1px solid var(--color-border);
          padding: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          transition: box-shadow 0.3s;
        }

        .ml-summary-card:hover {
          box-shadow: var(--shadow-md);
        }

        .ml-summary-accent {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 4px;
        }

        .ml-summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--color-text-tertiary);
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 12px;
        }

        .ml-summary-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ml-summary-count {
          font-size: 2.2rem;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: var(--color-text);
          line-height: 1;
        }

        /* ── Filters ── */
        .ml-filter-scroll {
          width: 100%;
          overflow-x: auto;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--color-border);
          scrollbar-width: none;
        }
        
        .ml-filter-scroll::-webkit-scrollbar { display: none; }

        .ml-filters {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: max-content;
        }

        .ml-filter-btn {
          padding: 10px 20px;
          border-radius: 99px;
          border: none;
          background: var(--color-surface-alt);
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ml-filter-btn:hover {
          background: var(--color-border);
        }

        .ml-filter-btn.active {
          background: var(--color-primary);
          color: #fff;
          box-shadow: 0 4px 12px rgba(32, 118, 199, 0.25);
        }

        /* ── List Layout ── */
        .ml-leaves-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ml-leave-card {
          background: var(--color-surface);
          border-radius: var(--radius-xl);
          padding: 20px 24px;
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          gap: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ml-leave-card:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--color-border-dark);
          transform: translateY(-2px);
        }

        .ml-card-main {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1.5;
          min-width: 250px;
        }

        .ml-card-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          background: var(--color-primary-light);
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .ml-card-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }

        .ml-leave-type {
          font-weight: 800;
          font-size: 1.05rem;
          color: var(--color-text);
        }

        .ml-halfday-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          background: #EFF6FF;
          color: #3B82F6;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .ml-leave-dates {
          color: var(--color-text-secondary);
          font-size: 0.85rem;
        }

        .ml-bullet {
          margin: 0 6px;
          opacity: 0.5;
        }

        .ml-card-reason {
          flex: 2;
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          line-height: 1.5;
          min-width: 200px;
        }

        .ml-label {
          display: block;
          font-weight: 700;
          font-size: 0.7rem;
          color: var(--color-text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 6px;
        }

        .ml-card-reason p {
          margin: 0;
        }

        .ml-card-actions {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-shrink: 0;
        }

        .ml-status-column {
          text-align: right;
        }

        .ml-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 99px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .ml-cancel-icon-btn {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-lg);
          background: #FFF5F5;
          color: #EF4444;
          border: 1px solid #FEE2E2;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ml-cancel-icon-btn:hover {
          background: #FEE2E2;
          border-color: #FCA5A5;
          transform: translateY(-2px);
        }

        .ml-spacer { width: 44px; }

        /* ── Empty State ── */
        .ml-empty-state {
          padding: 80px 24px;
          text-align: center;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-2xl);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .ml-empty-icon {
          width: 72px;
          height: 72px;
          background: var(--color-surface-alt);
          color: var(--color-text-tertiary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .ml-empty-state h3 {
          margin: 0 0 8px;
          font-size: 1.25rem;
          color: var(--color-text);
        }

        .ml-empty-state p {
          margin: 0 0 20px;
          color: var(--color-text-secondary);
        }

        .ml-btn-outline {
          padding: 10px 20px;
          border-radius: 99px;
          border: 1.5px solid var(--color-border);
          background: transparent;
          color: var(--color-text);
          font-weight: 600;
          cursor: pointer;
        }

        /* ── Modals ── */
        .ml-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .ml-modal {
          background: var(--color-surface);
          border-radius: var(--radius-2xl);
          width: 100%;
          max-width: 440px;
          padding: 32px;
          position: relative;
          box-shadow: var(--shadow-2xl);
        }

        .ml-modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--color-surface-alt);
          border: none;
          color: var(--color-text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ml-modal-close:hover {
          background: var(--color-border);
          color: var(--color-text);
        }

        .ml-modal-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .ml-modal-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #FEE2E2;
          color: #EF4444;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }

        .ml-modal-header h2 {
          margin: 0 0 8px;
          color: var(--color-text);
          font-size: 1.4rem;
          font-weight: 800;
        }

        .ml-modal-header p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: 0.95rem;
        }

        .ml-modal-body label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-text-tertiary);
          margin-bottom: 8px;
          letter-spacing: 0.04em;
        }

        .ml-modal-body textarea {
          width: 100%;
          padding: 14px 16px;
          border-radius: var(--radius-xl);
          border: 1.5px solid var(--color-border);
          background: var(--color-surface-alt);
          outline: none;
          resize: vertical;
          font-family: inherit;
          font-size: 0.95rem;
          transition: all 0.2s;
          margin-bottom: 32px;
        }

        .ml-modal-body textarea:focus {
          border-color: var(--color-primary);
          background: var(--color-surface);
        }

        .ml-modal-actions {
          display: flex;
          gap: 12px;
        }

        .ml-modal-actions button {
          flex: 1;
          padding: 14px;
          border-radius: var(--radius-lg);
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ml-btn-secondary {
          background: var(--color-surface);
          border: 1px solid var(--color-border-dark);
          color: var(--color-text);
        }
        .ml-btn-secondary:hover {
          background: var(--color-surface-alt);
        }

        .ml-btn-danger {
          background: #EF4444;
          border: none;
          color: #fff;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }
        .ml-btn-danger:hover:not(:disabled) {
          background: #DC2626;
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
          transform: translateY(-1px);
        }

        /* ── Side Panel ── */
        .ml-side-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          max-width: 480px;
          background: var(--color-surface);
          z-index: 1001;
          display: flex;
          flex-direction: column;
          box-shadow: -10px 0 30px rgba(0,0,0,0.1);
        }

        .ml-side-header {
          padding: 24px 32px;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ml-side-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #F5F3FF;
          color: #8B5CF6;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ml-side-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--color-text);
        }

        .ml-side-header p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--color-text-secondary);
        }

        .ml-side-close {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: var(--color-surface-alt);
          color: var(--color-text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ml-side-close:hover {
          background: var(--color-border);
          color: var(--color-text);
        }

        .ml-side-content {
          flex: 1;
          overflow-y: auto;
          padding: 32px;
          background: #F8FAFC;
        }

        .ml-history-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ml-history-item {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid var(--color-border);
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .ml-history-amount {
          font-weight: 800;
          font-size: 1.1rem;
          color: var(--color-text);
        }

        .ml-history-status {
          font-size: 0.7rem;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .ml-history-remarks {
          margin: 4px 0 0;
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          line-height: 1.4;
        }

        .ml-history-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px dashed var(--color-border);
        }

        .ml-history-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-text-tertiary);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .ml-history-value {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .ml-side-loading, .ml-side-empty {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--color-text-tertiary);
          gap: 12px;
        }

        .ml-summary-card.clickable {
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ml-summary-card.clickable:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: #8B5CF6;
        }

        .ml-summary-arrow {
          margin-left: auto;
          opacity: 0.3;
          transition: transform 0.2s;
        }

        .ml-summary-card:hover .ml-summary-arrow {
          transform: translateX(4px);
          opacity: 1;
          color: #8B5CF6;
        }

        /* ── Responsive Mobile ── */
        @media (max-width: 900px) {
          .ml-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .ml-page-wrapper {
            padding: 0 16px 32px;
          }

          .ml-header {
            flex-direction: column;
            align-items: stretch;
            gap: 20px;
          }

          .ml-header-text h1 {
            font-size: 1.8rem;
          }

          .ml-btn-primary {
            justify-content: center;
          }

          .ml-side-panel {
            max-width: 100%;
          }

          .ml-history-grid {
            grid-template-columns: 1fr;
          }

          .ml-leave-card {
            flex-direction: column;
            align-items: flex-start;
            padding: 20px;
            gap: 16px;
          }

          .ml-card-main {
            width: 100%;
          }

          .ml-card-reason {
            width: 100%;
            padding-top: 12px;
            border-top: 1px solid var(--color-border);
          }

          .ml-card-actions {
            width: 100%;
            justify-content: space-between;
            padding-top: 12px;
            border-top: 1px solid var(--color-border);
          }

          .ml-status-column {
            text-align: left;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .ml-status-column .ml-label {
            margin: 0;
          }
        }
      `}</style>
    </AppShell>
  );
};

export default MyLeaves;
