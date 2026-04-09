import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { 
  Calendar, Plus, Trash2, Edit2, Loader2, X, Search,
  ChevronLeft, ChevronRight, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';

const HolidayManagement = () => {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    type: 'National',
    description: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchHolidays = useCallback(async () => {
    try {
      const { data } = await api.get('/holidays');
      setHolidays(data.data);
    } catch (err) {
      toast.error('Failed to fetch holidays');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingId) {
        await api.put(`/holidays/${editingId}`, formData);
        toast.success('Holiday updated successfully');
      } else {
        await api.post('/holidays', formData);
        toast.success('Holiday created successfully');
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ date: '', name: '', type: 'National', description: '' });
      fetchHolidays();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await api.delete(`/holidays/${id}`);
      toast.success('Holiday deleted');
      fetchHolidays();
    } catch (err) {
      toast.error('Failed to delete holiday');
    }
  };

  const handleEdit = (holiday) => {
    setEditingId(holiday._id);
    setFormData({
      date: new Date(holiday.date).toISOString().split('T')[0],
      name: holiday.name,
      type: holiday.type,
      description: holiday.description || ''
    });
    setShowModal(true);
  };

  const isManagement = ['SuperUser', 'HR', 'GM', 'VP', 'Director'].includes(user?.role);

  return (
    <AppShell>
      <div className="page-wrapper fade-in" style={{ padding: '32px' }}>
        <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.03em' }}>Holiday Calendar</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Management of national and company-specific holidays</p>
          </div>
          {isManagement && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setEditingId(null);
                setFormData({ date: '', name: '', type: 'National', description: '' });
                setShowModal(true);
              }}
              className="btn-primary"
              style={{ padding: '12px 24px', borderRadius: '16px', gap: '8px' }}
            >
              <Plus size={20} /> Add Holiday
            </motion.button>
          )}
        </header>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
            <Loader2 className="animate-spin" size={48} color="var(--color-accent)" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {holidays.length > 0 ? (
              holidays.map((holiday) => (
                <motion.div
                  key={holiday._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card"
                  style={{ padding: '24px', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: holiday.type === 'National' ? 'var(--color-accent)' : '#10B981' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ background: 'var(--color-surface-alt)', padding: '8px 12px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                        {new Date(holiday.date).toLocaleDateString('en-IN', { month: 'short' })}
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1 }}>
                        {new Date(holiday.date).getDate()}
                      </div>
                    </div>
                    {isManagement && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEdit(holiday)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(holiday._id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={16} /></button>
                      </div>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px' }}>{holiday.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 700, 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      textTransform: 'uppercase',
                      background: holiday.type === 'National' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                      color: holiday.type === 'National' ? '#3B82F6' : '#10B981',
                    }}>
                      {holiday.type}
                    </span>
                    <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>
                      {new Date(holiday.date).toLocaleDateString('en-IN', { weekday: 'long' })}
                    </span>
                  </div>
                  {holiday.description && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{holiday.description}</p>
                  )}
                </motion.div>
              ))
            ) : (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--color-text-tertiary)' }}>
                <Calendar size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p>No holidays found in the calendar</p>
              </div>
            )}
          </div>
        )}

        {/* Holiday Modal */}
        <AnimatePresence>
          {showModal && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)' }} 
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                style={{ position: 'relative', background: '#fff', borderRadius: '32px', width: '100%', maxWidth: '450px', padding: '32px', boxShadow: '0 40px 100px rgba(0,0,0,0.5)' }}
              >
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '24px' }}>{editingId ? 'Edit Holiday' : 'Add New Holiday'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label className="form-label">Holiday Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      required 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Independence Day"
                    />
                  </div>
                  <div>
                    <label className="form-label">Date</label>
                    <input 
                      type="date" 
                      className="input-field" 
                      required 
                      value={formData.date} 
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="form-label">Type</label>
                    <select 
                      className="input-field" 
                      value={formData.type} 
                      onChange={e => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="National">National</option>
                      <option value="Company-specific">Company-specific</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Description (Optional)</label>
                    <textarea 
                      className="input-field" 
                      rows={3} 
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Brief details about the holiday..."
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="animate-spin" size={20} /> : (editingId ? 'Update' : 'Create')}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
};

export default HolidayManagement;
