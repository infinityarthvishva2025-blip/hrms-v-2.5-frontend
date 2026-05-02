import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowRightLeft,
  Calendar,
  Search,
  Filter,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
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
      setHistory(res.data.data || []);
    } catch (err) {
      toast.error('Failed to fetch leave history');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Filtering
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesFilter = filter === 'All' || item.type === filter;
      const matchesSearch =
        item.remarks?.toLowerCase().includes(search.toLowerCase()) ||
        item.leaveType?.toLowerCase().includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [history, filter, search]);

  // ✅ Summary Stats
  const stats = useMemo(() => {
    let accrual = 0;
    let deduction = 0;

    history.forEach((item) => {
      if (item.type === 'Accrual' || item.type === 'CarryOver') {
        accrual += item.amount;
      } else {
        deduction += item.amount;
      }
    });

    return {
      accrual,
      deduction,
      net: accrual - deduction
    };
  }, [history]);

  const getIcon = (type) => {
    switch (type) {
      case 'Accrual':
        return <TrendingUp size={16} />;
      case 'Deduction':
        return <TrendingDown size={16} />;
      case 'Reset':
        return <RefreshCw size={16} />;
      case 'CarryOver':
        return <ArrowRightLeft size={16} />;
      default:
        return null;
    }
  };

  const getBadgeClass = (type) => {
    switch (type) {
      case 'Accrual':
        return 'badge bg-emerald-50 text-emerald-600 border border-emerald-200';
      case 'Deduction':
        return 'badge bg-rose-50 text-rose-600 border border-rose-200';
      case 'Reset':
        return 'badge bg-amber-50 text-amber-600 border border-amber-200';
      case 'CarryOver':
        return 'badge bg-indigo-50 text-indigo-600 border border-indigo-200';
      default:
        return 'badge';
    }
  };

  return (
    <AppShell>
      <div className="page-wrapper fade-in">

        {/* Header */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/leaves')} className="btn-icon">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold">Leave History</h1>
              <p className="text-sm text-slate-500">
                Track all leave balance transactions
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="stat-card">
            <p className="text-xs text-slate-400">Total Accrual</p>
            <h2 className="text-2xl font-bold text-emerald-600">
              +{stats.accrual}
            </h2>
          </div>

          <div className="stat-card">
            <p className="text-xs text-slate-400">Total Deduction</p>
            <h2 className="text-2xl font-bold text-rose-600">
              -{stats.deduction}
            </h2>
          </div>

          <div className="stat-card">
            <p className="text-xs text-slate-400">Net Change</p>
            <h2 className="text-2xl font-bold text-indigo-600">
              {stats.net}
            </h2>
          </div>
        </div>

        {/* Filters */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <input
            type="text"
            placeholder="Search..."
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="input-field select-field"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Accrual">Accrual</option>
            <option value="Deduction">Deduction</option>
            <option value="CarryOver">CarryOver</option>
            <option value="Reset">Reset</option>
          </select>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">

          {loading ? (
            <div className="p-10 text-center">
              <Loader2 className="animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-10 text-center">
              <AlertCircle className="mx-auto mb-3 text-slate-300" size={40} />
              <p className="text-slate-500">No records found</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Change</th>
                  <th>Balance</th>
                </tr>
              </thead>

              <tbody>
                {filteredHistory.map((item, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        {getIcon(item.type)}
                        <span className={getBadgeClass(item.type)}>
                          {item.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <Calendar size={12} />
                        {new Date(item.timestamp).toLocaleDateString()}
                      </div>
                    </td>

                    <td>
                      <div className="font-medium">{item.remarks}</div>
                      <div className="text-xs text-slate-400">
                        {item.leaveType}
                      </div>
                    </td>

                    <td
                      className={
                        item.type === 'Deduction'
                          ? 'text-rose-600 font-bold'
                          : 'text-emerald-600 font-bold'
                      }
                    >
                      {item.type === 'Deduction' ? '-' : '+'}
                      {item.amount}
                    </td>

                    <td>
                      <span className="font-semibold text-indigo-600">
                        {item.newBalance}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-400">
          Leave balances are automatically updated as per HR policy.
        </div>
      </div>
    </AppShell>
  );
};

export default LeaveBalanceHistory;