import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import AppShell from '../../components/layout/AppShell';
import { 
  Download, FileText, Loader2, DollarSign, Calendar, TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const EmployeePayroll = () => {
  const { user } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const fetchMyPayrolls = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payroll/list', {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate, self: true }
      }); 
      setPayrolls(data.data);
    } catch (err) {
      toast.error('Failed to fetch salary history');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchMyPayrolls(); }, [fetchMyPayrolls]);

  const downloadSlip = async (id, name) => {
    try {
      const response = await api.get(`/payroll/salary-slip/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SalarySlip_${name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download slip');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <AppShell>
      <div className="page-wrapper fade-in" style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: '2.6rem', fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>My Pay Slips</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>Access and download your comprehensive salary history</p>
          </div>
          
          <div className="card" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px', borderRadius: '20px' }}>
             <Calendar size={18} color="#6366f1" />
             <input type="date" className="input-field" value={dateRange.startDate} onChange={e => setDateRange({...dateRange, startDate: e.target.value})} style={{ border: 'none', background: 'transparent', fontWeight: 700, width: '130px' }} />
             <span style={{ color: '#cbd5e1' }}>to</span>
             <input type="date" className="input-field" value={dateRange.endDate} onChange={e => setDateRange({...dateRange, endDate: e.target.value})} style={{ border: 'none', background: 'transparent', fontWeight: 700, width: '130px' }} />
          </div>
        </header>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={48} color="#6366f1" /></div>
        ) : (
          <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
            {payrolls.length > 0 ? (
              payrolls.map((p) => (
                <motion.div
                  key={p._id}
                  whileHover={{ y: -10, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}
                  className="card"
                  style={{ padding: '32px', borderRadius: '28px', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden' }}
                >
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: 'linear-gradient(135deg, rgba(99,102,241,0.05), transparent)', borderRadius: '0 0 0 100%' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                    <div style={{ background: '#f5f3ff', padding: '14px', borderRadius: '18px' }}>
                      <Calendar size={28} color="#6366f1" />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b' }}>{formatDate(p.fromDate).split(',')[0]} - {formatDate(p.toDate).split(',')[0]}</div>
                      <div style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.9rem' }}>Cycle Period</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Net Take Home</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#10b981' }}>₹{p.netSalary.toLocaleString()}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px' }}>
                       <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>PAID DAYS</div>
                       <div style={{ fontWeight: 800, fontSize: '1rem' }}>{p.paidDays} / {p.totalDaysInMonth}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px' }}>
                       <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>GROSS</div>
                       <div style={{ fontWeight: 800, fontSize: '1rem' }}>₹{p.grossEarnings.toLocaleString()}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={() => { setSelectedPayroll(p); setShowDetailsModal(true); }}
                      className="btn-secondary" 
                      style={{ flex: 1, borderRadius: '14px', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.9rem' }}
                    >
                      Breakdown
                    </button>
                    <button 
                      onClick={() => downloadSlip(p._id, `${p.month}_${p.year}`)}
                      className="btn-primary" 
                      style={{ flex: 1.5, borderRadius: '14px', background: '#6366f1', gap: '8px', fontWeight: 700 }}
                    >
                      <Download size={18} /> PDF
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px', background: '#f8fafc', borderRadius: '40px', border: '2px dashed #e2e8f0' }}>
                <DollarSign size={80} style={{ opacity: 0.1, marginBottom: '24px', color: '#6366f1' }} />
                <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1e293b' }}>No Payroll Records</h3>
                <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Salary statements for the selected period will appear here.</p>
              </div>
            )}
          </div>
        )}

        {/* Details Modal */}
        <AnimatePresence>
          {showDetailsModal && selectedPayroll && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDetailsModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }} />
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} style={{ position: 'relative', background: '#fff', borderRadius: '32px', width: '100%', maxWidth: '500px', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '32px' }}>Salary Breakdown</h2>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                      <span style={{ fontWeight: 600, color: '#64748b' }}>Basic Salary (CTC)</span>
                      <span style={{ fontWeight: 800 }}>₹{selectedPayroll.baseSalary.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                      <span style={{ fontWeight: 600, color: '#64748b' }}>Gross Earnings</span>
                      <span style={{ fontWeight: 800 }}>₹{selectedPayroll.grossEarnings.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#fef2f2', borderRadius: '16px' }}>
                      <span style={{ fontWeight: 600, color: '#b91c1c' }}>Professional Tax (PT)</span>
                      <span style={{ fontWeight: 800, color: '#b91c1c' }}>- ₹{selectedPayroll.professionalTax}</span>
                    </div>
                  </div>

                  <div style={{ padding: '24px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '20px', marginBottom: '32px', color: '#fff' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.9 }}>Final Net Payable</div>
                    <div style={{ fontSize: '2rem', fontWeight: 900 }}>₹{selectedPayroll.netSalary.toLocaleString()}</div>
                  </div>

                  <button onClick={() => setShowDetailsModal(false)} className="btn-secondary" style={{ width: '100%', padding: '16px', borderRadius: '16px', fontWeight: 700 }}>Close</button>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
};

export default EmployeePayroll;