// DailyReports.jsx
import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  FileText, Search, User, Calendar,
  CheckCheck, Clock, Loader2, ChevronRight,
  Filter, AlertTriangle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';

const DailyReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [acknowledging, setAcknowledging] = useState(false);

  // Normalize reportReadBy to string IDs for consistent comparison
  const normalizeReport = (report) => ({
    ...report,
    reportReadBy: report.reportReadBy?.map(id => id.toString()) || []
  });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/attendance/admin', { params: { limit: 200 } });
      // Ensure records array exists
      const records = data?.data?.records || [];
      const reportRecords = records.filter(r => r.todayWork).map(normalizeReport);
      setReports(reportRecords);
    } catch (err) {
      toast.error('Failed to fetch reports. Please try again.');
      console.error('Fetch reports error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleMarkRead = async (id) => {
    setAcknowledging(true);
    try {
      await api.patch(`/attendance/mark-read/${id}`);
      // Refresh the list first
      await fetchReports();
      // Update selected report if still open
      setSelectedReport(prev => {
        if (prev?._id === id) {
          return {
            ...prev,
            reportReadBy: [...(prev.reportReadBy || []), user._id]
          };
        }
        return prev;
      });
      toast.success('Report acknowledged successfully');
      // Close modal after success
      setSelectedReport(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to acknowledge report');
      console.error('Acknowledge error:', err);
    } finally {
      setAcknowledging(false);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = 
      r.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isRead = r.reportReadBy?.includes(user._id);
    
    if (filterStatus === 'Read') return matchesSearch && isRead;
    if (filterStatus === 'Unread') return matchesSearch && !isRead;
    return matchesSearch;
  });

  return (
    <AppShell>
      <div className="dr-page-wrapper fade-in">
        {/* Header */}
        <header className="dr-header">
          <div className="dr-header-text">
            <h1>Daily Reports</h1>
            <p>Monitor team productivity and project updates</p>
          </div>
          
          <div className="dr-header-actions">
            <div className="dr-filter-toggle">
              {['All', 'Unread', 'Read'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilterStatus(opt)}
                  className={`dr-filter-btn ${filterStatus === opt ? 'active' : ''}`}
                  aria-pressed={filterStatus === opt}
                >
                  {opt === 'Unread' ? 'Unread First' : opt === 'Read' ? 'Reviewed' : 'All Reports'}
                </button>
              ))}
            </div>

            <div className="dr-search-box">
              <Search size={18} className="dr-search-icon" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="dr-search-input"
                aria-label="Search reports"
              />
            </div>
          </div>
        </header>

        {/* Content */}
        {loading ? (
          <div className="dr-loading-state" role="status">
            <Loader2 size={48} className="animate-spin" />
            <p>Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="dr-empty-state"
          >
            <div className="dr-empty-icon">
              <FileText size={40} />
            </div>
            <h3>No reports found</h3>
            <p>Try adjusting your filters or search term</p>
          </motion.div>
        ) : (
          <div className="dr-grid-container">
            <AnimatePresence mode="popLayout">
              {filteredReports.map((report, i) => {
                const isRead = report.reportReadBy?.includes(user._id);
                return (
                  <motion.div
                    key={report._id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    onClick={() => setSelectedReport(report)}
                    className="dr-card"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedReport(report)}
                    aria-label={`Report from ${report.employeeName}`}
                  >
                    {!isRead && <div className="dr-card-unread-indicator" />}
                    
                    <div className="dr-card-header">
                      <div className="dr-card-user-info">
                        <div className={`dr-avatar ${isRead ? 'read' : 'unread'}`}>
                          <User size={24} />
                        </div>
                        <div>
                          <h4>{report.employeeName}</h4>
                          <div className="dr-date-badge">
                            <Calendar size={12} />
                            {new Date(report.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                      
                      {!isRead && <div className="dr-unread-dot" />}
                    </div>

                    <div className="dr-card-content">
                      <p>{report.todayWork}</p>
                    </div>

                    <div className="dr-card-divider" />

                    <div className="dr-card-footer">
                      <div className="dr-status-wrap">
                        {report.issuesFaced ? (
                          <span className="dr-status-badge dr-status-error">
                            <AlertTriangle size={14} /> Blockers
                          </span>
                        ) : (
                          <span className="dr-status-badge dr-status-success">
                            <CheckCheck size={14} /> On Track
                          </span>
                        )}
                      </div>
                      <ChevronRight size={18} className="dr-card-arrow" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedReport && (
            <div
              className="dr-modal-backdrop"
              onClick={(e) => e.target === e.currentTarget && setSelectedReport(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 24 }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className="dr-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
              >
                <div className="dr-modal-header">
                  <div className="dr-modal-user-info">
                    <div className="dr-modal-avatar">
                      <User size={32} />
                    </div>
                    <div>
                      <h2 id="modal-title">{selectedReport.employeeName}</h2>
                      <p>
                        {selectedReport.employeeCode}{' '}
                        <span className="dr-bullet">&middot;</span>{' '}
                        {new Date(selectedReport.date).toLocaleDateString('en-IN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    className="dr-modal-close"
                    onClick={() => setSelectedReport(null)}
                    aria-label="Close modal"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="dr-modal-body">
                  <section className="dr-modal-section">
                    <h4>
                      <CheckCheck size={16} /> Tasks Completed
                    </h4>
                    <div className="dr-modal-block dr-block-primary">
                      {selectedReport.todayWork}
                    </div>
                  </section>

                  <section className="dr-modal-section">
                    <h4>
                      <Clock size={16} /> Pending Tasks
                    </h4>
                    <div className="dr-modal-block dr-block-secondary">
                      {selectedReport.pendingWork || (
                        <span className="dr-italic">No pending tasks reported.</span>
                      )}
                    </div>
                  </section>

                  {selectedReport.issuesFaced && (
                    <section className="dr-modal-section">
                      <h4 className="dr-text-error">
                        <AlertTriangle size={16} /> Blockers & Issues
                      </h4>
                      <div className="dr-modal-block dr-block-error">
                        {selectedReport.issuesFaced}
                      </div>
                    </section>
                  )}
                </div>

                <div className="dr-modal-footer">
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="dr-btn-secondary"
                  >
                    Close
                  </button>
                  {!selectedReport.reportReadBy?.includes(user._id) && (
                    <button
                      onClick={() => handleMarkRead(selectedReport._id)}
                      disabled={acknowledging}
                      className="dr-btn-primary"
                      aria-busy={acknowledging}
                    >
                      {acknowledging ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Acknowledging...
                        </>
                      ) : (
                        <>
                          <CheckCheck size={20} />
                          Acknowledge Report
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        /* ---------- CSS Custom Properties (add to your global styles) ---------- */
/* ---------- CSS Custom Properties (updated) ---------- */
:root {
  --color-primary: #3b82f6;
  --color-primary-light: #eff6ff;
  --color-primary-ring: rgba(59, 130, 246, 0.25);

  --color-accent: #f59e0b;

  --color-text: #0f172a;
  --color-text-secondary: #4b5563; /* improved contrast on white */
  --color-text-tertiary: #9ca3af;

  --color-surface: #ffffff;
  --color-surface-alt: #ffffff; /* changed to pure white */
  --color-surface-hover: #f9fafb; /* subtle hover */

  --color-border: #e5e7eb;
  --color-border-dark: #d1d5db;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.08);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08);
  --shadow-2xl: 0 20px 25px -5px rgba(0,0,0,0.08);
}

// /* Dark mode (kept intact but slightly refined) */
// @media (prefers-color-scheme: dark) {
//   :root {
//     --color-primary: #60a5fa;
//     --color-primary-light: #1e3a8a;

//     --color-accent: #fbbf24;

//     --color-text: #f1f5f9;
//     --color-text-secondary: #cbd5e1;
//     --color-text-tertiary: #94a3b8;

//     --color-surface: #0f172a;
//     --color-surface-alt: #1e293b;
//     --color-surface-hover: #334155;

//     --color-border: #334155;
//     --color-border-dark: #475569;
//   }
// }

        /* ---------- Base ---------- */
        .dr-page-wrapper {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 16px 40px;
          width: 100%;
        }

        /* ---------- Header ---------- */
        .dr-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 24px;
          margin-bottom: 40px;
          padding-top: 10px;
        }

        .dr-header-text h1 {
          font-size: clamp(1.8rem, 5vw, 2.6rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--color-text);
          margin: 0 0 4px 0;
        }

        .dr-header-text p {
          color: var(--color-text-secondary);
          font-weight: 500;
          font-size: 1rem;
          margin: 0;
        }

        .dr-header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .dr-filter-toggle {
          display: flex;
          background: var(--color-surface-alt);
          padding: 4px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
        }

        .dr-filter-btn {
          padding: 8px 16px;
          border-radius: var(--radius-md);
          border: none;
          background: transparent;
          color: var(--color-text-secondary);
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .dr-filter-btn:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
        }

        .dr-filter-btn.active {
          background: var(--color-surface);
          color: var(--color-primary);
          box-shadow: var(--shadow-sm);
        }

        .dr-search-box {
          position: relative;
          width: 100%;
          max-width: 280px;
        }

        .dr-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-tertiary);
          pointer-events: none;
        }

        .dr-search-input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          border-radius: var(--radius-xl);
          border: 1.5px solid var(--color-border);
          background: var(--color-surface);
          font-family: inherit;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--color-text);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .dr-search-input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px var(--color-primary-ring);
        }

        .dr-search-input::placeholder {
          color: var(--color-text-tertiary);
          font-weight: 400;
        }

        /* ---------- States ---------- */
        .dr-loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 20px;
          color: var(--color-primary);
        }

        .dr-loading-state p {
          color: var(--color-text-secondary);
          margin-top: 16px;
          font-weight: 500;
        }

        .dr-empty-state {
          text-align: center;
          padding: 80px 20px;
          background: var(--color-surface);
          border-radius: var(--radius-2xl);
          border: 2px dashed var(--color-border);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .dr-empty-icon {
          width: 80px;
          height: 80px;
          border-radius: 24px;
          background: var(--color-surface-alt);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          color: var(--color-text-tertiary);
        }

        .dr-empty-state h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 8px;
        }

        .dr-empty-state p {
          font-size: 1rem;
          color: var(--color-text-secondary);
          margin: 0;
        }

        /* ---------- Cards ---------- */
        .dr-grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        .dr-card {
          background: var(--color-surface);
          border-radius: var(--radius-2xl);
          border: 1px solid var(--color-border);
          padding: 24px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-sm);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s;
          outline: none;
        }

        .dr-card:focus-visible {
          box-shadow: 0 0 0 4px var(--color-primary-ring);
          border-color: var(--color-primary);
        }

        .dr-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--color-border-dark);
        }

        .dr-card-unread-indicator {
          position: absolute;
          top: 0;
          left: 0;
          width: 5px;
          bottom: 0;
          background: var(--color-accent);
        }

        .dr-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .dr-card-user-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .dr-avatar {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: var(--color-surface-alt);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .dr-avatar.read { color: var(--color-text-tertiary); }
        .dr-avatar.unread { color: var(--color-accent); background: #fef3c7; }

        .dr-card-user-info h4 {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0;
          line-height: 1.4;
        }

        .dr-date-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: var(--color-text-tertiary);
          font-weight: 500;
          margin-top: 2px;
        }

        .dr-unread-dot {
          width: 10px;
          height: 10px;
          background: var(--color-accent);
          border-radius: 50%;
          box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.15);
        }

        .dr-card-content {
          flex: 1;
          margin-bottom: 20px;
        }

        .dr-card-content p {
          font-size: 0.95rem;
          color: var(--color-text-secondary);
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.6;
          margin: 0;
        }

        .dr-card-divider {
          height: 1px;
          background: var(--color-border);
          margin-bottom: 16px;
        }

        .dr-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dr-status-badge {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid transparent;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .dr-status-success {
          color: #059669;
          background: #d1fae5;
          border-color: #a7f3d0;
        }

        .dr-status-error {
          color: #dc2626;
          background: #fee2e2;
          border-color: #fecaca;
        }

        .dr-card-arrow {
          color: var(--color-text-tertiary);
          transition: transform 0.2s;
        }

        .dr-card:hover .dr-card-arrow {
          transform: translateX(4px);
        }

        /* ---------- Modal ---------- */
        .dr-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1100;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .dr-modal {
          background: var(--color-surface);
          border-radius: var(--radius-2xl);
          width: 100%;
          max-width: 640px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: var(--shadow-2xl);
          display: flex;
          flex-direction: column;
        }

        .dr-modal-header {
          padding: 28px 28px 20px;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-shrink: 0;
        }

        .dr-modal-user-info {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .dr-modal-avatar {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          background: var(--color-primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary);
        }

        .dr-modal-user-info h2 {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0;
          color: var(--color-text);
        }

        .dr-modal-user-info p {
          color: var(--color-text-tertiary);
          font-weight: 500;
          font-size: 0.9rem;
          margin: 4px 0 0 0;
        }

        .dr-bullet { margin: 0 4px; }

        .dr-modal-close {
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
          transition: all 0.15s;
        }

        .dr-modal-close:hover {
          background: var(--color-border);
          color: var(--color-text);
        }

        .dr-modal-body {
          padding: 28px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .dr-modal-section h4 {
          font-size: 0.8rem;
          text-transform: uppercase;
          color: var(--color-text-tertiary);
          margin: 0 0 12px 0;
          letter-spacing: 0.08em;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dr-text-error { color: #dc2626 !important; }

        .dr-modal-block {
          padding: 20px;
          border-radius: var(--radius-xl);
          font-size: 1rem;
          line-height: 1.7;
          border: 1px solid transparent;
        }

        .dr-block-primary {
          background: var(--color-surface-alt);
          border-color: var(--color-border);
          color: var(--color-text);
        }

        .dr-block-secondary {
          background: var(--color-surface-alt);
          border-color: var(--color-border);
          color: var(--color-text);
        }

        .dr-block-error {
          background: #fef2f2;
          border-color: #fee2e2;
          color: #dc2626;
        }

        .dr-italic {
          font-style: italic;
          color: var(--color-text-tertiary);
        }

        .dr-modal-footer {
          padding: 24px 28px;
          border-top: 1px solid var(--color-border);
          display: flex;
          gap: 16px;
        }

        .dr-btn-secondary,
        .dr-btn-primary {
          padding: 14px 20px;
          border-radius: var(--radius-lg);
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .dr-btn-secondary {
          flex: 1;
          border: 1.5px solid var(--color-border-dark);
          background: var(--color-surface);
          color: var(--color-text);
        }

        .dr-btn-secondary:hover {
          background: var(--color-surface-hover);
        }

        .dr-btn-primary {
          flex: 2;
          border: none;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .dr-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
        }

        .dr-btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* ---------- Responsive ---------- */
        @media (max-width: 640px) {
          .dr-page-wrapper {
            padding: 0 12px 32px;
          }

          .dr-header {
            flex-direction: column;
            align-items: stretch;
            gap: 20px;
          }

          .dr-header-text h1 {
            font-size: 2rem;
          }

          .dr-header-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .dr-filter-toggle {
            justify-content: stretch;
          }

          .dr-filter-btn {
            flex: 1;
            text-align: center;
          }

          .dr-search-box {
            max-width: 100%;
          }

          .dr-grid-container {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .dr-card {
            padding: 20px;
          }

          .dr-modal-backdrop {
            padding: 12px;
            align-items: flex-end;
          }

          .dr-modal {
            max-height: 95vh;
            border-radius: 28px 28px 0 0;
          }

          .dr-modal-header {
            padding: 20px 20px 16px;
          }

          .dr-modal-user-info {
            gap: 16px;
          }

          .dr-modal-avatar {
            width: 56px;
            height: 56px;
          }

          .dr-modal-user-info h2 {
            font-size: 1.3rem;
          }

          .dr-modal-body {
            padding: 20px;
          }

          .dr-modal-footer {
            flex-direction: column-reverse;
            padding: 16px 20px;
          }

          .dr-btn-secondary,
          .dr-btn-primary {
            width: 100%;
          }
        }

        /* Animation utility */
        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </AppShell>
  );
};

export default DailyReports;