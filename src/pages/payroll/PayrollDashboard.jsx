import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import AppShell from '../../components/layout/AppShell';
import { 
  DollarSign, Download, Users, Briefcase, Calendar, 
  Search, Filter, Loader2, CheckCircle, CheckCircle2, AlertCircle, FileText, Plus, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const PayrollDashboard = () => {
  const { user } = useAuth();
  
  // Default range: 21st of last month to 20th of current month
  const getDefaultRange = () => {
    const today = new Date();
    const currMonth = today.getMonth();
    const currYear = today.getFullYear();
    
    // Default to a standard 21-20 cycle
    const start = new Date(currYear, currMonth - 1, 21);
    const end = new Date(currYear, currMonth, 20);
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  const [dateRange, setDateRange] = useState(getDefaultRange());
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genForm, setGenForm] = useState({ 
    employeeId: '', 
    startDate: dateRange.startDate, 
    endDate: dateRange.endDate 
  });
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  const fetchPayrolls = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payroll/list', { 
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate } 
      });
      setPayrolls(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      toast.error('Failed to fetch payrolls');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchEmployees = useCallback(async () => {
    try {
      // Fetch all active employees (limit 1000 to ensure we get all 48+)
      const { data } = await api.get('/employees?limit=1000&status=Active');
      const empList = data.data?.employees || (Array.isArray(data.data) ? data.data : []);
      setEmployees(empList);
    } catch (err) {
      setEmployees([]);
    }
  }, []);

  useEffect(() => {
    fetchPayrolls();
    fetchEmployees();
  }, [fetchPayrolls, fetchEmployees]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!genForm.employeeId || !genForm.startDate || !genForm.endDate) {
      return toast.error('Please fill all fields');
    }
    setActionLoading(true);
    try {
      await api.post('/payroll/generate', genForm);
      toast.success('Payroll generated');
      setShowGenerateModal(false);
      fetchPayrolls();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessAll = async () => {
    if (!window.confirm(`Process payroll for ALL active employees (${employees.length}) for ${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}?`)) return;
    
    setActionLoading(true);
    try {
      const { data } = await api.post('/payroll/generate-all', { 
        startDate: dateRange.startDate, 
        endDate: dateRange.endDate 
      });
      toast.success(`Broadcasting update: ${data.message}`);
      fetchPayrolls();
    } catch (err) {
      toast.error('Bulk generation failed');
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
      toast.error('Download failed');
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <AppShell>
      <div className="page-wrapper fade-in" style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
        <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Payroll Engine</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>Manage accurate salary processing for {employees.length} active employees</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={handleProcessAll} className="btn-primary" style={{ padding: '14px 28px', borderRadius: '18px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.4)', border: 'none', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} 
              Process All Active
            </motion.button>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setShowGenerateModal(true)} className="btn-secondary" style={{ padding: '14px 28px', borderRadius: '18px', fontWeight: 700, border: '1px solid #e2e8f0' }}>
              <Plus size={20} /> Process Single
            </motion.button>
          </div>
        </header>

        {/* Dynamic Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', marginBottom: '32px', alignItems: 'center' }}>
          <div className="card" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '16px', borderRadius: '20px', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.5)' }}>
            <Search size={20} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Search by name or employee code..." 
              style={{ border: 'none', background: 'transparent', width: '100%', padding: '12px 0', fontSize: '1rem', outline: 'none', fontWeight: 500 }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="card" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '20px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar size={18} color="#6366f1" />
              <input type="date" className="input-field" value={dateRange.startDate} onChange={e => setDateRange({...dateRange, startDate: e.target.value})} style={{ width: '150px', border: 'none', background: 'transparent', fontWeight: 700 }} />
              <ArrowRight size={16} color="#cbd5e1" />
              <input type="date" className="input-field" value={dateRange.endDate} onChange={e => setDateRange({...dateRange, endDate: e.target.value})} style={{ width: '150px', border: 'none', background: 'transparent', fontWeight: 700 }} />
            </div>
            <button onClick={fetchPayrolls} className="btn-primary" style={{ padding: '8px 24px', borderRadius: '12px' }}>Refresh</button>
          </div>
        </div>

        {/* Table Section */}
        <div className="card" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          {loading ? (
            <div style={{ padding: '100px', textAlign: 'center' }}><Loader2 className="animate-spin" size={48} color="#6366f1" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Employee</th>
                    <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Working Days</th>
                    <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>H / A / P</th>
                    <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Basic Salary</th>
                    <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Gross Salary</th>
                    <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Deduction (PT)</th>
                    <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Net Salary</th>
                    <th style={{ padding: '20px 24px', textAlign: 'center', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(emp => {
                    const p = payrolls.find(pay => pay.employeeId === emp._id || pay.employeeId?._id === emp._id);
                    const isProcessed = !!p;

                    return (
                      <tr key={emp._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} className="hover-row">
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #e0e7ff, #f5f3ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#6366f1' }}>
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: '#1e293b' }}>{emp.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{emp.employeeCode}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                           <div style={{ fontWeight: 700, color: '#334155' }}>{isProcessed ? p.totalDaysInMonth : '-'} Days</div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          {isProcessed ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => { 
                                  setSelectedPayroll({...p, detailType: 'Half Days', details: p.halfDayDetails || [] }); 
                                  setShowDetailsModal(true); 
                                }}
                                title="Click to view Half Days" 
                                style={{ background: '#fffbeb', color: '#b45309', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                              >
                                {p.halfDays}H
                              </button>
                              <button 
                                onClick={() => { 
                                  setSelectedPayroll({...p, detailType: 'Absent Days', details: p.absentDayDetails || [] }); 
                                  setShowDetailsModal(true); 
                                }}
                                title="Click to view Absents" 
                                style={{ background: '#fef2f2', color: '#b91c1c', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                              >
                                {p.absentDays}A
                              </button>
                              <span title="Paid Days" style={{ background: '#f0fdf4', color: '#15803d', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                                {p.paidDays}P
                              </span>
                            </div>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '20px 24px', fontWeight: 600, color: '#475569' }}>
                          ₹{emp.salary?.toLocaleString() || '0'}
                        </td>
                        <td style={{ padding: '20px 24px', fontWeight: 600, color: '#475569' }}>
                          {isProcessed ? `₹${p.grossEarnings.toLocaleString()}` : '-'}
                        </td>
                        <td style={{ padding: '20px 24px', color: '#ef4444', fontWeight: 600 }}>
                          {isProcessed ? `-₹${p.professionalTax}` : '-'}
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          {isProcessed ? (
                            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#10b981' }}>₹{p.netSalary.toLocaleString()}</div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Pending</span>
                          )}
                        </td>
                        <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            {isProcessed ? (
                              <>
                                <motion.button 
                                  whileHover={{ scale: 1.1 }} 
                                  whileTap={{ scale: 0.9 }} 
                                  onClick={(e) => { 
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedPayroll({ ...p, detailType: null }); 
                                    setShowDetailsModal(true); 
                                  }} 
                                  className="btn-icon" 
                                  style={{ color: '#6366f1', background: '#f5f3ff', border: 'none', cursor: 'pointer' }}
                                >
                                  <FileText size={18} />
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => downloadSlip(p._id, emp.name)} className="btn-icon" style={{ color: '#10b981', background: '#f0fdf4' }}>
                                  <Download size={18} />
                                </motion.button>
                              </>
                            ) : (
                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { setGenForm({ employeeId: emp._id, startDate: dateRange.startDate, endDate: dateRange.endDate }); setShowGenerateModal(true); }} className="btn-icon" style={{ color: '#6366f1', background: '#f5f3ff' }}>
                                <Plus size={18} />
                              </motion.button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Generate Modal */}
        <AnimatePresence mode="wait">
          {showGenerateModal && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGenerateModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }} />
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} style={{ position: 'relative', background: '#fff', borderRadius: '32px', width: '100%', maxWidth: '480px', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '8px' }}>Process Payroll</h2>
                <p style={{ color: '#64748b', marginBottom: '32px', fontWeight: 500 }}>Generate salary for a specific employee</p>
                
                <form onSubmit={handleGenerate} style={{ display: 'grid', gap: '24px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>Select Employee</label>
                    <select className="input-field" required value={genForm.employeeId} onChange={e => setGenForm({...genForm, employeeId: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <option value="">Choose an employee...</option>
                      {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.employeeCode})</option>)}
                    </select>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label className="form-label" style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>From</label>
                      <input type="date" className="input-field" value={genForm.startDate} onChange={e => setGenForm({...genForm, startDate: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>To</label>
                      <input type="date" className="input-field" value={genForm.endDate} onChange={e => setGenForm({...genForm, endDate: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                    <button type="button" className="btn-secondary" style={{ flex: 1, padding: '14px', borderRadius: '14px' }} onClick={() => setShowGenerateModal(false)}>Cancel</button>
                    <button type="submit" className="btn-primary" style={{ flex: 2, padding: '14px', borderRadius: '14px', background: '#6366f1' }} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="animate-spin" size={20} /> : 'Process Now'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Details Modal */}
        <AnimatePresence mode="wait">
          {showDetailsModal && selectedPayroll && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', paddingTop:'60px'  }}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDetailsModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }} />
              <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} style={{ position: 'relative', background: '#fff', borderRadius: '32px', width: '100%', maxWidth: '600px', padding: '40px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>{selectedPayroll.detailType || 'Salary Details'}</h2>
                    <p style={{ color: '#64748b', fontWeight: 600 }}>{selectedPayroll.employeeName} ({selectedPayroll.employeeCode})</p>
                  </div>
                  <div style={{ background: '#f0fdf4', color: '#15803d', padding: '8px 16px', borderRadius: '12px', fontWeight: 800, fontSize: '0.9rem' }}>
                    Processed
                  </div>
                </div>

                {selectedPayroll.detailType ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                    {selectedPayroll.details && selectedPayroll.details.length > 0 ? (
                      selectedPayroll.details.map((d, idx) => (
                        <div key={idx} style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
                          <span style={{ fontWeight: 700, color: '#6366f1' }}>{formatDate(d.date).split(',')[0]}</span>
                          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, background: '#fff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{d.reason || 'N/A'}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>No specific records found for this category.</div>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px' }}>
                          <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Earnings</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 600, color: '#475569' }}>Basic</span>
                            <span style={{ fontWeight: 800 }}>₹{selectedPayroll.baseSalary?.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '12px', marginTop: '12px' }}>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>Gross</span>
                            <span style={{ fontWeight: 900, color: '#1e293b' }}>₹{selectedPayroll.grossEarnings?.toLocaleString()}</span>
                          </div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px' }}>
                          <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Deductions</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 600, color: '#475569' }}>Prof. Tax</span>
                            <span style={{ fontWeight: 800, color: '#ef4444' }}>₹{selectedPayroll.professionalTax}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '12px', marginTop: '12px' }}>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>Total</span>
                            <span style={{ fontWeight: 900, color: '#ef4444' }}>₹{selectedPayroll.professionalTax}</span>
                          </div>
                      </div>
                    </div>

                    <div className="card" style={{ padding: '24px', marginBottom: '32px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>Net Payable Amount</div>
                      <div style={{ color: '#fff', fontSize: '2.4rem', fontWeight: 900 }}>₹{selectedPayroll.netSalary?.toLocaleString()}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                      <div style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>PAID DAYS</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{selectedPayroll.paidDays}</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>ABSENTS</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ef4444' }}>{selectedPayroll.absentDays}</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>HALF DAYS</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f59e0b' }}>{selectedPayroll.halfDays}</div>
                      </div>
                    </div>
                  </>
                )}

                <button 
                  onClick={() => { setShowDetailsModal(false); setTimeout(() => setSelectedPayroll(null), 200); }} 
                  className="btn-secondary" 
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', fontWeight: 700 }}
                >
                  Close
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
};

export default PayrollDashboard;