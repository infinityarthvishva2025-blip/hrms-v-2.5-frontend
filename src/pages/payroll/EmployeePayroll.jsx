import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import AppShell from '../../components/layout/AppShell';
import { 
  Download, FileText, Loader2, DollarSign, Calendar, TrendingUp, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const EmployeePayroll = () => {
  const { user } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  
  const toLocalISO = (d) => {
    const offset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - offset)).toISOString().split('T')[0];
  };

  const [dateRange, setDateRange] = useState({
    startDate: toLocalISO(new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1)),
    endDate: toLocalISO(new Date())
  });

  const fetchMyPayrolls = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payroll/list', {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate, self: true }
      }); 
      setPayrolls(Array.isArray(data.data) ? data.data : data.data?.payrolls || []);
    } catch (err) {
      toast.error('Failed to fetch salary history');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchMyPayrolls(); }, [fetchMyPayrolls]);

  const handleGenerate = async () => {
    setActionLoading(true);
    try {
      await api.post('/payroll/generate', {
        employeeId: user._id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      toast.success('Payslip generated successfully');
      fetchMyPayrolls();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate playslip');
    } finally {
      setActionLoading(false);
    }
  };

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

  const formatDate = (d) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(d));

  return (
    <AppShell>
      <div className="ep-page-wrapper fade-in">
        
        {/* ── Header ── */}
        <header className="ep-header">
          <div className="ep-header-text">
            <h1>My Pay Slips</h1>
            <p>Access and download your comprehensive salary history</p>
          </div>
          
          <div className="ep-header-actions">
            <div className="ep-date-picker">
               <Calendar size={18} className="ep-date-icon" />
               <input 
                 type="date" 
                 value={dateRange.startDate} 
                 onChange={e => setDateRange({...dateRange, startDate: e.target.value})} 
               />
               <span className="ep-date-separator">to</span>
               <input 
                 type="date" 
                 value={dateRange.endDate} 
                 onChange={e => setDateRange({...dateRange, endDate: e.target.value})} 
               />
            </div>
            
            <button 
              onClick={handleGenerate} 
              disabled={actionLoading}
              className="ep-btn-primary ep-btn-generate" 
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <TrendingUp size={18} />} 
              <span>Generate Slip</span>
            </button>
          </div>
        </header>

        {/* ── Content ── */}
        {loading ? (
          <div className="ep-loading-state">
            <Loader2 className="animate-spin" size={48} />
            <p>Loading your salary history...</p>
          </div>
        ) : (
          <div className="ep-grid-container">
            {payrolls.length > 0 ? (
              <AnimatePresence>
                {payrolls.map((p, i) => (
                  <motion.div
                    key={p._id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="ep-card"
                  >
                    <div className="ep-card-mesh-bg" />
                    
                    <div className="ep-card-header">
                      <div className="ep-card-icon">
                        <Calendar size={24} />
                      </div>
                      <div className="ep-card-cycle">
                        <div className="ep-cycle-dates">{formatDate(p.fromDate).split(',')[0]} - {formatDate(p.toDate).split(',')[0]}</div>
                        <div className="ep-cycle-label">Cycle Period</div>
                      </div>
                    </div>

                    <div className="ep-card-net">
                      <div className="ep-net-label">Net Take Home</div>
                      <div className="ep-net-amount">₹{p.netSalary.toLocaleString()}</div>
                    </div>

                    <div className="ep-card-stats">
                      <div className="ep-stat-box">
                         <div className="ep-stat-label">PAID DAYS</div>
                         <div className="ep-stat-value">{p.paidDays} / {p.totalDaysInMonth}</div>
                      </div>
                      <div className="ep-stat-box">
                         <div className="ep-stat-label">GROSS</div>
                         <div className="ep-stat-value">₹{p.grossEarnings.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="ep-card-actions">
                      <button 
                        onClick={() => { setSelectedPayroll(p); setShowDetailsModal(true); }}
                        className="ep-btn-secondary" 
                      >
                        Breakdown
                      </button>
                      <button 
                        onClick={() => downloadSlip(p._id, `${p.month}_${p.year}`)}
                        className="ep-btn-download" 
                      >
                        <Download size={18} /> PDF
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ep-empty-state">
                <div className="ep-empty-icon"><DollarSign size={48} /></div>
                <h3>No Payroll Records</h3>
                <p>Salary statements for the selected period will appear here.</p>
                <button 
                  onClick={handleGenerate} 
                  disabled={actionLoading}
                  className="ep-btn-primary" 
                >
                  {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <TrendingUp size={18} />} Generate Now
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* ── Details Modal ── */}
        <AnimatePresence>
          {showDetailsModal && selectedPayroll && (
            <div className="ep-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowDetailsModal(false); }}>
               <motion.div 
                 initial={{ y: 50, opacity: 0, scale: 0.95 }} 
                 animate={{ y: 0, opacity: 1, scale: 1 }} 
                 exit={{ y: 50, opacity: 0, scale: 0.95 }} 
                 className="ep-modal"
               >
                  <button className="ep-modal-close" onClick={() => setShowDetailsModal(false)}>
                    <X size={20} />
                  </button>

                  <h2 className="ep-modal-title">Salary Breakdown</h2>
                  
                  <div className="ep-modal-breakdown">
                    <div className="ep-breakdown-row ep-bg-surface">
                      <span className="ep-breakdown-label">Basic Salary (CTC)</span>
                      <span className="ep-breakdown-val">₹{selectedPayroll.baseSalary.toLocaleString()}</span>
                    </div>
                    <div className="ep-breakdown-row ep-bg-surface">
                      <span className="ep-breakdown-label">Gross Earnings</span>
                      <span className="ep-breakdown-val">₹{selectedPayroll.grossEarnings.toLocaleString()}</span>
                    </div>
                    <div className="ep-breakdown-row ep-bg-error">
                      <span className="ep-breakdown-label ep-text-error">Professional Tax (PT)</span>
                      <span className="ep-breakdown-val ep-text-error">- ₹{selectedPayroll.professionalTax}</span>
                    </div>
                  </div>

                  <div className="ep-modal-net">
                    <div className="ep-modal-net-label">Final Net Payable</div>
                    <div className="ep-modal-net-val">₹{selectedPayroll.netSalary.toLocaleString()}</div>
                  </div>

                  <button onClick={() => setShowDetailsModal(false)} className="ep-btn-secondary ep-btn-full">
                    Close Breakdown
                  </button>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        /* ── Base ── */
        .ep-page-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 4px 40px;
          width: 100%;
        }

        /* ── Header ── */
        .ep-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 24px;
          margin-bottom: 40px;
          padding-top: 10px;
        }

        .ep-header-text h1 {
          font-size: clamp(1.8rem, 5vw, 2.6rem);
          font-weight: 900;
          letter-spacing: -0.04em;
          background: linear-gradient(135deg, #0F172A 0%, #334155 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 4px 0;
        }

        .ep-header-text p {
          color: var(--color-text-secondary);
          font-weight: 600;
          font-size: 1rem;
          margin: 0;
        }

        .ep-header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        /* Date Picker */
        .ep-date-picker {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          padding: 12px 20px;
          border-radius: max(var(--radius-xl), 20px);
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: var(--shadow-sm);
          transition: all 0.2s;
        }

        .ep-date-picker:focus-within {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px var(--color-primary-ring);
        }

        .ep-date-icon {
          color: var(--color-primary);
        }

        .ep-date-picker input {
          border: none;
          background: transparent;
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--color-text);
          outline: none;
          max-width: 120px;
          font-family: inherit;
          cursor: pointer;
        }

        .ep-date-separator {
          color: #CBD5E1;
          font-size: 0.9rem;
          font-weight: 600;
        }

        /* Buttons */
        .ep-btn-primary {
          padding: 14px 24px;
          border-radius: max(var(--radius-xl), 20px);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--color-primary);
          color: #fff;
          border: none;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ep-btn-primary:not(:disabled):hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }

        .ep-btn-generate {
          background: linear-gradient(135deg, #10B981, #059669) !important;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
        }

        .ep-btn-generate:hover:not(:disabled) {
          box-shadow: 0 12px 32px rgba(16, 185, 129, 0.4);
        }

        .ep-btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          box-shadow: none !important;
        }

        /* ── Content Grid ── */
        .ep-grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 24px;
        }

        .ep-loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 20px;
          color: var(--color-primary);
        }
        .ep-loading-state p {
          color: var(--color-text-secondary);
          margin-top: 16px;
          font-weight: 600;
        }

        .ep-empty-state {
          grid-column: 1 / -1;
          background: var(--color-surface-alt);
          border: 2px dashed var(--color-border);
          border-radius: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          text-align: center;
        }

        .ep-empty-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--color-surface);
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          box-shadow: var(--shadow-sm);
        }

        .ep-empty-state h3 {
          font-size: 1.6rem;
          font-weight: 900;
          color: var(--color-text);
          margin: 0 0 8px;
        }

        .ep-empty-state p {
          color: var(--color-text-secondary);
          font-size: 1rem;
          margin: 0 0 32px;
        }

        /* ── Cards ── */
        .ep-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 28px;
          padding: 32px;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ep-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px -12px rgba(0,0,0,0.12);
          border-color: var(--color-primary-ring);
        }

        .ep-card-mesh-bg {
          position: absolute;
          top: 0;
          right: 0;
          width: 140px;
          height: 140px;
          background: radial-gradient(circle at top right, rgba(99,102,241,0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .ep-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 28px;
        }

        .ep-card-icon {
          background: var(--color-primary-light);
          color: var(--color-primary);
          padding: 14px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ep-card-cycle {
          text-align: right;
        }

        .ep-cycle-dates {
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--color-text);
        }

        .ep-cycle-label {
          color: var(--color-text-tertiary);
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .ep-card-net {
          margin-bottom: 32px;
        }

        .ep-net-label {
          color: var(--color-text-tertiary);
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 6px;
        }

        .ep-net-amount {
          font-size: clamp(2rem, 5vw, 2.4rem);
          font-weight: 900;
          color: #10B981;
          line-height: 1;
          letter-spacing: -0.03em;
        }

        .ep-card-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 32px;
        }

        .ep-stat-box {
          background: var(--color-surface-alt);
          padding: 14px;
          border-radius: 16px;
          border: 1px solid var(--color-border);
        }

        .ep-stat-label {
          font-size: 0.7rem;
          color: var(--color-text-tertiary);
          font-weight: 800;
          letter-spacing: 0.04em;
          margin-bottom: 4px;
        }

        .ep-stat-value {
          font-weight: 800;
          font-size: 1.05rem;
          color: var(--color-text);
        }

        .ep-card-actions {
          display: flex;
          gap: 12px;
        }

        .ep-btn-secondary {
          flex: 1;
          background: var(--color-surface);
          border: 1.5px solid var(--color-border-dark);
          border-radius: 16px;
          padding: 14px;
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--color-text);
          cursor: pointer;
          transition: all 0.2s;
        }

        .ep-btn-secondary:hover {
          background: var(--color-surface-hover);
        }

        .ep-btn-download {
          flex: 1.5;
          background: var(--gradient-primary);
          color: #fff;
          border: none;
          border-radius: 16px;
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ep-btn-download:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        /* ── Modals ── */
        .ep-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
        }

        .ep-modal {
          background: var(--color-surface);
          border-radius: 32px;
          width: 100%;
          max-width: 480px;
          padding: 40px;
          position: relative;
          box-shadow: 0 32px 64px rgba(0,0,0,0.15);
        }

        .ep-modal-close {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 36px;
          height: 36px;
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

        .ep-modal-close:hover {
          background: var(--color-border);
          color: var(--color-text);
        }

        .ep-modal-title {
          font-size: 1.6rem;
          font-weight: 900;
          margin: 0 0 32px;
          color: var(--color-text);
        }

        .ep-modal-breakdown {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 32px;
        }

        .ep-breakdown-row {
          display: flex;
          justify-content: space-between;
          padding: 16px 20px;
          border-radius: 16px;
          align-items: center;
        }

        .ep-bg-surface { background: var(--color-surface-alt); border: 1px solid var(--color-border); }
        .ep-bg-error { background: #FEF2F2; border: 1px solid #FEE2E2; }

        .ep-breakdown-label {
          font-weight: 600;
          color: var(--color-text-secondary);
          font-size: 0.95rem;
        }
        .ep-breakdown-val {
          font-weight: 800;
          font-size: 1.05rem;
          color: var(--color-text);
        }

        .ep-text-error { color: #DC2626; }

        .ep-modal-net {
          padding: 24px 28px;
          background: linear-gradient(135deg, #10B981, #059669);
          border-radius: 20px;
          margin-bottom: 32px;
          color: #fff;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.25);
        }

        .ep-modal-net-label {
          font-size: 0.95rem;
          font-weight: 600;
          opacity: 0.9;
          margin-bottom: 4px;
        }

        .ep-modal-net-val {
          font-size: 2.2rem;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .ep-btn-full {
          width: 100%;
          justify-content: center;
        }

        /* ── Mobile Responsive ── */
        @media (max-width: 640px) {
          .ep-page-wrapper {
            padding: 0 16px 40px;
          }

          .ep-header {
            flex-direction: column;
            align-items: stretch;
            gap: 20px;
          }

          .ep-header-text h1 {
            font-size: 2rem;
          }

          .ep-header-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .ep-date-picker {
            justify-content: center;
          }

          .ep-date-picker input {
            max-width: calc(50vw - 80px); /* Fits mobile screens nicely */
          }

          .ep-grid-container {
            grid-template-columns: 1fr;
          }

          .ep-card {
            padding: 24px;
            border-radius: 24px;
          }

          .ep-card-actions {
            flex-direction: column-reverse;
          }

          .ep-btn-secondary, .ep-btn-download {
            width: 100%;
          }

          .ep-modal {
            padding: 32px 24px 24px;
            border-radius: 28px;
          }
          
          .ep-modal-net {
            padding: 20px;
          }
          .ep-modal-net-val {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </AppShell>
  );
};

export default EmployeePayroll;