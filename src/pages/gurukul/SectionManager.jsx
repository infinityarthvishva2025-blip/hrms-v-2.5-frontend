// src/pages/gurukul/SectionManager.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import { fetchSections, createSection, updateSection, deleteSection }  from "../../api/gurukulApi";
import SubsectionManager from './SubsectionManager';

const SectionManager = ({ videoId, isAdmin }) => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    loadSections();
  }, [videoId]);

  const loadSections = async () => {
    setLoading(true);
    try {
      const { data } = await fetchSections(videoId);
      setSections(data.data);
    } catch (err) {
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newSectionTitle.trim()) return toast.error('Section title required');
    try {
      const { data } = await createSection(videoId, { title: newSectionTitle });
      setSections([...sections, data.data]);
      setNewSectionTitle('');
      toast.success('Section added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleUpdate = async (id) => {
    if (!editTitle.trim()) return toast.error('Title cannot be empty');
    try {
      const { data } = await updateSection(id, { title: editTitle });
      setSections(sections.map(s => s._id === id ? data.data : s));
      setEditingId(null);
      toast.success('Section updated');
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this section and all its subsections?')) return;
    try {
      await deleteSection(id);
      setSections(sections.filter(s => s._id !== id));
      toast.success('Section deleted');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const toggleExpand = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <div className="skeleton" style={{ height: '100px', borderRadius: '20px' }} />;

  return (
    <div style={{ marginTop: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Sections</h2>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <input type="text" placeholder="New section title" value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)} className="input-field" style={{ width: '240px' }} />
            <button className="btn-primary" onClick={handleAdd}><Plus size={16} /> Add</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sections.map((section) => (
          <div key={section._id} className="card" style={{ padding: '20px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              {editingId === section._id ? (
                <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                  <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="input-field" autoFocus />
                  <button className="btn-primary" onClick={() => handleUpdate(section._id)}><Save size={16} /></button>
                  <button className="btn-secondary" onClick={() => setEditingId(null)}><X size={16} /></button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => toggleExpand(section._id)}>
                    {expandedSections[section._id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    <h3 style={{ fontWeight: 700, fontSize: '1.2rem' }}>{section.title}</h3>
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-icon" onClick={() => { setEditingId(section._id); setEditTitle(section.title); }}><Edit2 size={14} /></button>
                      <button className="btn-icon" onClick={() => handleDelete(section._id)}><Trash2 size={14} /></button>
                    </div>
                  )}
                </>
              )}
            </div>

            <AnimatePresence>
              {expandedSections[section._id] && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden', marginTop: '20px' }}>
                  <SubsectionManager sectionId={section._id} isAdmin={isAdmin} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
        {sections.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-tertiary)' }}>No sections yet. {isAdmin && 'Add one above.'}</div>}
      </div>
    </div>
  );
};

export default SectionManager;