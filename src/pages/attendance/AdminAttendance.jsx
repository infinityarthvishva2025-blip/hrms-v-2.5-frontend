import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { 
  CheckCircle, Clock, MapPin, X,
  Search, Eye, User, FileText, 
  ChevronDown, AlertTriangle, CheckCheck, Loader2,
  BarChart2, TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';

const STATUS_LABELS = {
  P: 'Present', A: 'Absent', WO: 'Week Off', L: 'Leave',
  Coff: 'Comp Off', AUTO: 'Partial', H: 'Holiday',
};

const StatusBadge = ({ status }) =>
  status ? <span className={`badge status-${status}`}>{STATUS_LABELS[status] || status}</span> : null;

const AdminAttendance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filter, setFilter] = useState('SharedWithMe'); // 'All' or 'SharedWithMe'
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobile, setShowMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setShowMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/attendance/admin', { params: { limit: 100 } });
      setRecords(data.data.records);
    } catch (err) {
      toast.error('Failed to fetch attendance records');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/attendance/mark-read/${id}`);
      toast.success('Report marked as read');
      fetchRecords(); // Refresh
      if (selectedReport?._id === id) {
        setSelectedReport(prev => ({ ...prev, reportReadBy: [...prev.reportReadBy, user._id] }));
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Filter records: records where I am a participant OR show all if filter is 'All'
  const filteredRecords = records.filter(r => {
    const matchesSearch = r.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === 'SharedWithMe') {
      return r.reportParticipants?.includes(user._id);
    }
    return true;
  });

  const formatTime = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--';

  return (
    <AppShell>
      <div className="page-wrapper fade-in">
        {/* ── Header Card with Gradient Strip ── */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-2xl)', overflow: 'hidden', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ height: '4px', background: 'var(--gradient-primary)' }} />
          <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: 'var(--radius-lg)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(32,118,199,0.3)' }}>
                <BarChart2 size={20} color="#fff" />
              </div>
              <div>
                <h1 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.03em' }}>Team Attendance</h1>
                <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '0.88rem' }}>Review team reports and acknowledge updates</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              {/* Filters */}
              <div style={{ display: 'flex', gap: '6px', background: 'var(--color-surface-alt)', padding: '5px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                {['SharedWithMe', 'All'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: '7px 16px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                      background: filter === f ? 'var(--gradient-primary)' : 'transparent',
                      color: filter === f ? '#fff' : 'var(--color-text-secondary)',
                      fontWeight: 700, transition: 'all 0.2s',
                      fontSize: '0.82rem', fontFamily: 'inherit',
                      boxShadow: filter === f ? '0 4px 12px rgba(32,118,199,0.25)' : 'none',
                    }}
                  >
                    {f === 'SharedWithMe' ? 'Shared with me' : 'All Records'}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '340px' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                <input
                  type="text"
                  placeholder="Search employee…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
           <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
             <Loader2 size={40} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
           </div>
        ) : showMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredRecords.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-tertiary)' }}>No reports found</div>
            ) : filteredRecords.map((r) => (
              <div key={r._id} className="card" style={{ padding: '18px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ width: '42px', height: '42px', minWidth: '42px', borderRadius: 'var(--radius-md)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', color: '#fff', boxShadow: '0 4px 12px rgba(32,118,199,0.3)' }}>
                      {r.employeeName?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{r.employeeName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>{r.employeeCode} &middot; {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                    </div>
                 </div>

                 <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginBottom: '4px', fontWeight: 600 }}>CHECK IN</p>
                      <p style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-success)' }}>{formatTime(r.inTime)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginBottom: '4px', fontWeight: 600 }}>CHECK OUT</p>
                      <p style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-primary)' }}>{formatTime(r.outTime)}</p>
                    </div>
                 </div>

                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <StatusBadge status={r.status} />
                      {r.reportReadBy?.includes(user._id) ? (
                        <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                          <CheckCheck size={14} /> Read
                        </span>
                      ) : r.todayWork ? (
                        <span style={{ color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                          <Clock size={14} /> Unread
                        </span>
                      ) : null}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {r.todayWork && (
                        <button 
                          onClick={() => setSelectedReport(r)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          <FileText size={14} /> View
                        </button>
                      )}
                      {r.todayWork && !r.reportReadBy?.includes(user._id) && (
                        <button 
                          onClick={() => handleMarkAsRead(r._id)}
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                 </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>In / Out</th>
                  <th>Report</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-tertiary)' }}>No reports found</td></tr>
                ) : filteredRecords.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', minWidth: '40px', borderRadius: 'var(--radius-md)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.95rem', color: '#fff', boxShadow: '0 4px 12px rgba(32,118,199,0.25)' }}>
                          {r.employeeName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{r.employeeName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>{r.employeeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                      {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-success)', fontWeight: 800 }}>{formatTime(r.inTime)}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 800 }}>{formatTime(r.outTime)}</span>
                      </div>
                    </td>
                    <td>
                      {r.todayWork ? (
                        <button 
                          onClick={() => setSelectedReport(r)}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', border: 'none', padding: '6px 12px', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                        >
                          <FileText size={14} /> View Report
                        </button>
                      ) : <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem', fontWeight: 500 }}>No Report</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <StatusBadge status={r.status} />
                        {r.reportReadBy?.includes(user._id) ? (
                          <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                            <CheckCheck size={14} /> Read
                          </span>
                        ) : r.todayWork ? (
                          <span style={{ color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                            <Clock size={14} /> Unread
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      {r.todayWork && !r.reportReadBy?.includes(user._id) && (
                        <button 
                          onClick={() => handleMarkAsRead(r._id)}
                          className="btn-primary"
                          style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 'var(--radius-md)' }}
                        >
                          Acknowledge
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report Detail Modal */}
        <AnimatePresence>
          {selectedReport && (
            <div className="modal-backdrop">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedReport(null)} style={{ position: 'absolute', inset: 0 }} />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                style={{ position: 'relative', background: 'var(--color-surface)', borderRadius: 'var(--radius-2xl)', width: 'calc(100% - 32px)', maxWidth: '580px', maxHeight: '92dvh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-2xl)', overflow: 'hidden' }}
              >
                {/* Gradient strip */}
                <div style={{ height: '4px', background: 'var(--gradient-primary)', flexShrink: 0 }} />
                <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={16} color="#fff" /></div>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--color-text)' }}>Daily Work Report</h2>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 500, marginTop: '4px' }}>
                        {selectedReport.employeeName} &middot; {new Date(selectedReport.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <button className="btn-icon" onClick={() => setSelectedReport(null)}><X size={18} /></button>
                </div>


                <div style={{ padding: '28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '10px', letterSpacing: '0.1em', fontWeight: 800 }}>Today's Completed Work</h4>
                    <div style={{ fontSize: '0.95rem', color: 'var(--color-text)', background: 'var(--color-surface-alt)', padding: '16px', borderRadius: 'var(--radius-lg)', lineHeight: 1.6 }}>
                      {selectedReport.todayWork}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '10px', letterSpacing: '0.1em', fontWeight: 800 }}>Pending / Carry-over Work</h4>
                    <div style={{ fontSize: '0.95rem', color: 'var(--color-text)', background: 'var(--color-surface-alt)', padding: '16px', borderRadius: 'var(--radius-lg)', lineHeight: 1.6 }}>
                      {selectedReport.pendingWork || 'None reported.'}
                    </div>
                  </div>
                  {selectedReport.issuesFaced && (
                    <div>
                      <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-error)', marginBottom: '10px', letterSpacing: '0.1em', fontWeight: 800 }}>Blockers & Issues</h4>
                      <div style={{ fontSize: '0.95rem', color: 'var(--color-error)', background: 'var(--color-error-light)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid #FEE2E2', lineHeight: 1.6 }}>
                        {selectedReport.issuesFaced}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ padding: '20px 28px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '12px' }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedReport(null)}>Close</button>
                  {selectedReport.todayWork && !selectedReport.reportReadBy?.includes(user._id) && (
                    <button className="btn-primary" style={{ flex: 1 }} onClick={() => { handleMarkAsRead(selectedReport._id); setSelectedReport(null); }}>
                      <CheckCheck size={18} /> Acknowledge
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AppShell>
  );
};

export default AdminAttendance;
