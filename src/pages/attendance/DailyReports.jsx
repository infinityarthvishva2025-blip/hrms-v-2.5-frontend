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
  const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Read', 'Unread'

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/attendance/admin', { params: { limit: 200 } });
      // Only keep records that have a todayWork report
      const reportRecords = data.data.records.filter(r => r.todayWork);
      setReports(reportRecords);
    } catch (err) {
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/attendance/mark-read/${id}`);
      fetchReports();
      if (selectedReport?._id === id) {
        setSelectedReport(prev => ({ ...prev, reportReadBy: [...(prev.reportReadBy || []), user._id] }));
      }
      toast.success('Report acknowledged');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isRead = r.reportReadBy?.includes(user._id);
    
    if (filterStatus === 'Read') return matchesSearch && isRead;
    if (filterStatus === 'Unread') return matchesSearch && !isRead;
    return matchesSearch;
  });

  return (
    <AppShell>
      <div className="page-wrapper fade-in">
        <header style={{ marginBottom: '40px', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.03em' }}>Daily Reports</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', fontWeight: 500, marginTop: '4px' }}>Monitor team productivity and project updates</p>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Filter Toggle */}
            <div style={{ display: 'flex', background: 'var(--color-surface-alt)', padding: '6px', borderRadius: 'var(--radius-lg)' }}>
              {['All', 'Unread', 'Read'].map((opt) => (
                <button 
                  key={opt}
                  onClick={() => setFilterStatus(opt)}
                  style={{ 
                    padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                    background: filterStatus === opt ? 'var(--color-surface)' : 'transparent',
                    color: filterStatus === opt ? 'var(--color-text)' : 'var(--color-text-secondary)',
                    fontWeight: 700, boxShadow: filterStatus === opt ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s',
                    fontSize: '0.85rem'
                  }}
                >
                  {opt === 'Unread' ? 'Unread First' : opt === 'Read' ? 'Reviewed' : 'All Reports'}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
              <input 
                type="text" 
                placeholder="Search employee..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>
        </header>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
            <Loader2 size={48} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : filteredReports.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '100px 20px', background: 'var(--color-surface)', borderRadius: 'var(--radius-2xl)', border: '1px dashed var(--color-border)' }}
          >
            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'var(--color-surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <FileText size={40} style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-text)', marginBottom: '8px' }}>No reports found</h3>
            <p style={{ fontSize: '1.05rem', color: 'var(--color-text-secondary)' }}>Try adjusting your filters or search term</p>
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            <AnimatePresence>
              {filteredReports.map((report) => {
                const isRead = report.reportReadBy?.includes(user._id);

                return (
                  <motion.div 
                    key={report._id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    whileHover={{ y: -6, boxShadow: 'var(--shadow-xl)' }}
                    onClick={() => setSelectedReport(report)}
                    className="card"
                    style={{ 
                      padding: '24px', 
                      cursor: 'pointer',
                      position: 'relative', 
                      overflow: 'hidden', 
                      display: 'flex', 
                      flexDirection: 'column'
                    }}
                  >
                    {!isRead && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', bottom: 0, background: 'var(--color-accent)' }} />
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--color-surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={24} color={isRead ? 'var(--color-text-tertiary)' : 'var(--color-accent)'} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>{report.employeeName}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontWeight: 600, marginTop: '2px' }}>
                            <Calendar size={12} />
                            {new Date(report.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      
                      {!isRead && (
                        <div style={{ width: '8px', height: '8px', background: 'var(--color-accent)', borderRadius: '50%', boxShadow: '0 0 0 4px var(--color-accent-light)' }} />
                      )}
                    </div>

                    <div style={{ flex: 1, marginBottom: '20px' }}>
                      <p style={{ 
                        fontSize: '0.92rem', color: 'var(--color-text-secondary)', 
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', 
                        overflow: 'hidden', lineHeight: '1.6' 
                      }}>
                        {report.todayWork}
                      </p>
                    </div>

                    <div className="divider" style={{ marginBottom: '16px' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {report.issuesFaced ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-error)', fontWeight: 800, background: 'var(--color-error-light)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #FEE2E2' }}>
                            <AlertTriangle size={14} /> Blockers
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 800, background: 'var(--color-success-light)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #BBF7D0' }}>
                            <CheckCheck size={14} /> On Track
                          </span>
                        )}
                      </div>
                      <ChevronRight size={18} style={{ color: 'var(--color-text-tertiary)' }} />
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
            <div className="modal-backdrop">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedReport(null)} style={{ position: 'absolute', inset: 0 }} />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 24 }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                style={{ 
                  position: 'relative', background: 'var(--color-surface)', borderRadius: 'var(--radius-2xl)', 
                  width: '100%', maxWidth: '640px', maxHeight: '90vh', overflow: 'hidden', boxShadow: 'var(--shadow-2xl)',
                  display: 'flex', flexDirection: 'column' 
                }}
              >
                <div style={{ padding: '32px 32px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={32} color="var(--color-primary)" />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0, color: 'var(--color-text)' }}>{selectedReport.employeeName}</h2>
                      <p style={{ color: 'var(--color-text-tertiary)', fontWeight: 600, fontSize: '0.9rem', marginTop: '4px' }}>
                        {selectedReport.employeeCode} &middot; {new Date(selectedReport.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <button className="btn-icon" onClick={() => setSelectedReport(null)}><X size={20} /></button>
                </div>

                <div style={{ padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <section>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '12px', letterSpacing: '0.1em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCheck size={16} /> Tasks Completed
                    </h4>
                    <div style={{ background: 'var(--color-surface-alt)', padding: '20px', borderRadius: 'var(--radius-xl)', fontSize: '1rem', lineHeight: '1.7', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
                      {selectedReport.todayWork}
                    </div>
                  </section>

                  <section>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '12px', letterSpacing: '0.1em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} /> Pending Tasks
                    </h4>
                    <div style={{ background: 'var(--color-surface-alt)', padding: '20px', borderRadius: 'var(--radius-xl)', fontSize: '1rem', lineHeight: '1.7', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
                      {selectedReport.pendingWork || <span style={{ fontStyle: 'italic', color: 'var(--color-text-tertiary)' }}>No pending tasks reported.</span>}
                    </div>
                  </section>

                  {selectedReport.issuesFaced && (
                    <section>
                      <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-error)', marginBottom: '12px', letterSpacing: '0.1em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} /> Blockers & Issues
                      </h4>
                      <div style={{ background: 'var(--color-error-light)', border: '1px solid #FEE2E2', padding: '20px', borderRadius: 'var(--radius-xl)', fontSize: '1rem', lineHeight: '1.7', color: 'var(--color-error)' }}>
                        {selectedReport.issuesFaced}
                      </div>
                    </section>
                  )}
                </div>

                <div style={{ padding: '24px 32px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '16px' }}>
                  <button onClick={() => setSelectedReport(null)} className="btn-secondary" style={{ flex: 1, padding: '16px' }}>Close</button>
                  {!selectedReport.reportReadBy?.includes(user._id) && (
                    <button onClick={() => { handleMarkRead(selectedReport._id); setSelectedReport(null); }} className="btn-primary" style={{ flex: 2, padding: '16px', background: 'var(--gradient-success)', boxShadow: 'var(--shadow-colored-green)' }}>
                      <CheckCheck size={20} /> Acknowledge Report
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

export default DailyReports;
