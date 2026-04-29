import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, History, TrendingUp, TrendingDown, RefreshCw, ArrowRightLeft, 
  Calendar, Info, Loader2, Search, Filter, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '../../components/layout/AppShell';
import { getLeaveHistory } from '../../api/leave.api';
import toast from 'react-hot-toast';

const LeaveBalanceHistory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await getLeaveHistory();
      setHistory(res.data.data);
    } catch (err) {
      toast.error('Failed to fetch leave history');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    const matchesFilter = filter === 'All' || item.type === filter;
    const matchesSearch = item.remarks?.toLowerCase().includes(search.toLowerCase()) || 
                          item.leaveType?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'Accrual': return <TrendingUp size={18} className="text-emerald-500" />;
      case 'Deduction': return <TrendingDown size={18} className="text-rose-500" />;
      case 'Reset': return <RefreshCw size={18} className="text-amber-500" />;
      case 'CarryOver': return <ArrowRightLeft size={18} className="text-indigo-500" />;
      default: return <History size={18} className="text-slate-500" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'Accrual': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Deduction': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'Reset': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'CarryOver': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in duration-500">
        
        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <button
              onClick={() => navigate('/leaves')}
              className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all hover:-translate-x-1 shadow-sm"
            >
              <ChevronLeft size={22} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Leave Balance History</h1>
              <p className="text-slate-500 font-medium">Track every credit, deduction, and carry-over of your leaves</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-5 py-3 rounded-2xl">
            <Info size={18} className="text-indigo-600" />
            <p className="text-sm font-semibold text-indigo-700">
              New year resets and carry-forward happens every May 1st.
            </p>
          </div>
        </div>

        {/* --- Filters & Search --- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
          <div className="md:col-span-7 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by remarks or leave type..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="md:col-span-5 relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none font-medium appearance-none cursor-pointer"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="All">All Transactions</option>
              <option value="Accrual">Monthly Accruals</option>
              <option value="Deduction">Leave Deductions</option>
              <option value="CarryOver">Carry Forward</option>
              <option value="Reset">Resets</option>
            </select>
          </div>
        </div>

        {/* --- History List --- */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-indigo-500" size={40} />
              <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">Loading History...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center px-6">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <AlertCircle size={40} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No transaction history found</h3>
              <p className="text-slate-500 max-w-sm">We couldn't find any leave balance records matching your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Date & Type</th>
                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Description</th>
                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Adjustment</th>
                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">New Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((item, idx) => (
                    <motion.tr 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getBgColor(item.type)}`}>
                            {getIcon(item.type)}
                          </div>
                          <div>
                            <div className="text-slate-900 font-bold">{item.type}</div>
                            <div className="text-slate-400 text-[11px] font-bold flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(item.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="max-w-xs">
                          <div className="text-slate-700 font-semibold text-sm leading-relaxed">{item.remarks}</div>
                          <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 w-fit px-2 py-0.5 rounded-md">
                            {item.leaveType}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className={`text-lg font-black ${item.type === 'Deduction' || item.type === 'Reset' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {item.type === 'Deduction' || item.type === 'Reset' ? '-' : '+'}{item.amount}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold">days</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="text-slate-400 text-sm font-medium line-through">{item.previousBalance}</div>
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                          <div className="text-indigo-600 text-lg font-black">{item.newBalance}</div>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* --- Footer Note --- */}
        <div className="mt-10 text-center">
          <p className="text-slate-400 text-sm font-medium flex items-center justify-center gap-2">
            <AlertCircle size={16} />
            Balances are automatically updated based on HR policy. Contact HR for any discrepancies.
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default LeaveBalanceHistory;
