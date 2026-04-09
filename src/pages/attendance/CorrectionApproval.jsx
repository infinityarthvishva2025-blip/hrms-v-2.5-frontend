import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import AppShell from '../../components/layout/AppShell';
import { 
  CheckCircle2, XCircle, Clock, Filter, Search, 
  ExternalLink, Loader2, AlertCircle, User, Calendar,
  ArrowRight, MessageSquare, CheckCircle, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const CorrectionApproval = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [remarks, setRemarks] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRequests = requests.filter(req => 
    req.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    req.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/attendance/corrections/pending');
      setRequests(data.data);
    } catch (err) {
      toast.error('Failed to fetch pending corrections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async (id, action) => {
    setActionLoading(id);
    const remark = remarks[id] || '';
    try {
      if (action === 'approve') {
        await api.patch(`/attendance/correction-approve/${id}`, { remark });
        toast.success('Correction approved');
      } else {
        await api.patch(`/attendance/correction-reject/${id}`, { remark });
        toast.success('Correction rejected');
      }
      setRemarks(prev => ({ ...prev, [id]: '' }));
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--';

  return (
    <AppShell>
      <div className="page-wrapper fade-in corr-approval-page">
        {/* ── Header Area ── */}
        <div className="corr-app-header-card">
          <div className="corr-app-header-strip" />
          <div className="corr-app-header-content">
            <div className="corr-header-left">
              <div className="corr-header-icon-wrap">
                <ShieldCheck size={22} color="#fff" />
              </div>
              <div>
                <h1 className="corr-title">Attendance Corrections</h1>
                <p className="corr-subtitle">Review and approve employee-requested attendance adjustments</p>
              </div>
            </div>
            
            <div className="corr-search-wrap">
              <Search size={18} className="corr-search-icon" />
              <input 
                type="text" 
                placeholder="Search employee by name or code..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field corr-search-input"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="corr-loading-wrap">
            <Loader2 className="animate-spin" size={42} color="var(--color-primary)" />
            <p>Loading pending requests...</p>
          </div>
        ) : (
          <div className="corr-list-grid">
            <AnimatePresence mode="popLayout">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <motion.div
                    key={req._id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="corr-request-card"
                  >
                    {/* Left Brand Border */}
                    <div className="corr-card-border" />
                    
                    <div className="corr-card-inner">
                      {/* Top Section: Employee Profile & Status */}
                      <div className="corr-card-top">
                        <div className="corr-emp-profile">
                          <div className="corr-avatar">
                            {req.employeeName?.[0]?.toUpperCase() || <User size={24} />}
                          </div>
                          <div>
                            <div className="corr-emp-name">{req.employeeName}</div>
                            <div className="corr-emp-info">{req.employeeCode} &middot; {req.department}</div>
                          </div>
                        </div>

                        <div className="corr-status-badge">
                          <Clock size={14} /> 
                          <span>STAGE: {req.correctionStatus?.replace('Pending_', '')?.toUpperCase()}</span>
                        </div>
                      </div>

                      <div className="att-divider" style={{ margin: '16px 0' }} />

                      {/* Middle Section: Comparison & Reason */}
                      <div className="corr-card-details">
                        {/* Time Grid */}
                        <div className="corr-time-comparison">
                          <div className="corr-detail-label">
                            <Calendar size={14} />
                            <span>{new Date(req.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          
                          <div className="corr-time-cells">
                            <div className="corr-time-cell current">
                               <p className="cell-label">CURRENT LOG</p>
                               <p className="cell-value strike">
                                 {formatTime(req.inTime)} – {formatTime(req.outTime)}
                               </p>
                            </div>
                            <div className="corr-time-arrow">
                              <ArrowRight size={18} />
                            </div>
                            <div className="corr-time-cell requested">
                               <p className="cell-label">REQUESTED LOG</p>
                               <p className="cell-value">
                                 {formatTime(req.requestedInTime)} – {formatTime(req.requestedOutTime)}
                               </p>
                            </div>
                          </div>
                        </div>

                        {/* Reason / Proof */}
                        <div className="corr-reason-section">
                          <div className="corr-detail-label">
                            <MessageSquare size={14} />
                            <span>EMPLOYEE REASON</span>
                          </div>
                          <div className="corr-reason-box">
                            "{req.correctionReason}"
                          </div>
                          {req.correctionProofUrl && (
                            <a href={req.correctionProofUrl} target="_blank" rel="noreferrer" className="corr-proof-link">
                              <ExternalLink size={14} /> View Supporting Proof
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Bottom Section: Actions */}
                      <div className="corr-card-actions">
                        <div className="corr-remarks-wrap">
                          <MessageSquare size={16} className="corr-remarks-icon" />
                          <input 
                            type="text" 
                            placeholder="Add internal remarks..." 
                            className="input-field corr-remarks-input" 
                            value={remarks[req._id] || ''}
                            onChange={(e) => setRemarks(prev => ({ ...prev, [req._id]: e.target.value }))}
                          />
                        </div>
                        
                        <div className="corr-btns">
                          <button 
                            onClick={() => handleAction(req._id, 'reject')}
                            disabled={actionLoading === req._id}
                            className="corr-btn corr-btn-reject"
                          >
                            {actionLoading === req._id ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />} 
                            <span>Reject</span>
                          </button>
                          <button 
                            onClick={() => handleAction(req._id, 'approve')}
                            disabled={actionLoading === req._id}
                            className="corr-btn corr-btn-approve"
                          >
                            {actionLoading === req._id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} 
                            <span>Approve</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="corr-empty-state"
                >
                  <div className="corr-empty-icon">
                    <CheckCircle size={40} />
                  </div>
                  <h3>All caught up!</h3>
                  <p>No pending attendance correction requests found.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <style>{`
        .corr-approval-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* ── Header Card ── */
        .corr-app-header-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-2xl);
          overflow: hidden;
          margin-bottom: 24px;
          box-shadow: var(--shadow-sm);
        }

        .corr-app-header-strip {
          height: 4px;
          background: var(--gradient-primary);
        }

        .corr-app-header-content {
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }

        .corr-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .corr-header-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 16px rgba(32,118,199,0.3);
        }

        .corr-title {
          font-size: clamp(1.4rem, 4vw, 1.8rem);
          font-weight: 900;
          letter-spacing: -0.03em;
          color: var(--color-text);
          margin-bottom: 2px;
        }

        .corr-subtitle {
          font-size: 0.9rem;
          color: var(--color-text-secondary);
          font-weight: 500;
        }

        .corr-search-wrap {
          position: relative;
          width: 100%;
          max-width: 380px;
        }

        .corr-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-tertiary);
        }

        .corr-search-input {
          padding-left: 42px !important;
          background: var(--color-surface-alt) !important;
          border-color: var(--color-border) !important;
        }

        /* ── Loading / Empty ── */
        .corr-loading-wrap {
          text-align: center;
          padding: 80px 20px;
          color: var(--color-text-secondary);
        }
        .corr-loading-wrap p { margin-top: 12px; font-weight: 600; }

        .corr-empty-state {
          text-align: center;
          padding: 80px 20px;
          background: var(--color-surface);
          border-radius: var(--radius-2xl);
          border: 2px dashed var(--color-border);
          color: var(--color-text-tertiary);
        }

        .corr-empty-icon {
          width: 80px;
          height: 80px;
          border-radius: 24px;
          background: var(--color-success-light);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: var(--color-success);
        }

        .corr-empty-state h3 { font-size: 1.5rem; font-weight: 900; color: var(--color-text); margin-bottom: 4px; }

        /* ── Request Cards ── */
        .corr-list-grid { display: flex; flex-direction: column; gap: 20px; }

        .corr-request-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-2xl);
          overflow: hidden;
          position: relative;
          box-shadow: var(--shadow-sm);
        }

        .corr-card-border {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 5px;
          background: var(--gradient-primary);
        }

        .corr-card-inner { padding: 24px; }

        .corr-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
        }

        .corr-emp-profile {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .corr-avatar {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: var(--gradient-primary);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.2rem;
          box-shadow: 0 4px 12px rgba(32,118,199,0.25);
        }

        .corr-emp-name { font-weight: 800; font-size: 1.1rem; color: var(--color-text); }
        .corr-emp-info { font-size: 0.85rem; color: var(--color-text-secondary); font-weight: 600; margin-top: 2px; }

        .corr-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          background: var(--color-primary-light);
          color: var(--color-primary);
          font-size: 0.72rem;
          font-weight: 800;
          border: 1px solid var(--color-primary-ring);
        }

        /* Card Middle */
        .corr-card-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .corr-detail-label {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 0.72rem;
          font-weight: 800;
          color: var(--color-text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
        }

        .corr-time-cells {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--color-surface-alt);
          padding: 14px;
          border-radius: var(--radius-xl);
          border: 1.5px solid var(--color-border);
        }

        .corr-time-cell { flex: 1; }
        .cell-label { font-size: 0.65rem; font-weight: 800; color: var(--color-text-tertiary); margin-bottom: 4px; }
        .cell-value { font-weight: 800; font-size: 1rem; color: var(--color-text); }
        .cell-value.strike { color: var(--color-text-tertiary); text-decoration: line-through; font-size: 0.9rem; }
        .requested .cell-value { color: var(--color-primary); }

        .corr-time-arrow { color: var(--color-text-tertiary); }

        .corr-reason-box {
          font-size: 0.9rem;
          line-height: 1.6;
          color: var(--color-text);
          background: var(--color-surface-alt);
          padding: 16px;
          border-radius: var(--radius-xl);
          border: 1.5px solid var(--color-border);
          font-style: italic;
        }

        .corr-proof-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-accent);
          text-decoration: none;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          background: var(--color-accent-light);
          transition: all 0.2s;
        }
        .corr-proof-link:hover { opacity: 0.85; transform: translateX(3px); }

        /* Card Actions */
        .corr-card-actions {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px dashed var(--color-border);
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .corr-remarks-wrap {
          flex: 1;
          min-width: 260px;
          position: relative;
        }

        .corr-remarks-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-tertiary);
        }

        .corr-remarks-input {
          padding-left: 42px !important;
          font-size: 0.9rem !important;
          background: var(--color-surface) !important;
        }

        .corr-btns {
          display: flex;
          gap: 10px;
        }

        .corr-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: var(--radius-lg);
          font-size: 0.88rem;
          font-weight: 800;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          font-family: inherit;
        }

        .corr-btn-reject {
          background: var(--color-error-light);
          color: var(--color-error);
        }
        .corr-btn-reject:hover { background: var(--color-error); color: #fff; }

        .corr-btn-approve {
          background: var(--gradient-success);
          color: #fff;
          box-shadow: 0 6px 16px rgba(16,185,129,0.25);
        }
        .corr-btn-approve:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(16,185,129,0.35); }

        @media (max-width: 768px) {
          .corr-card-actions { flex-direction: column; align-items: stretch; }
          .corr-remarks-wrap { width: 100%; min-width: 100%; }
          .corr-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .corr-btn { justify-content: center; }
          .corr-time-comparison { width: 100%; }
        }
      `}</style>
    </AppShell>
  );
};

export default CorrectionApproval;
