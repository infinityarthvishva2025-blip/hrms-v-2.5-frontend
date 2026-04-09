// src/pages/gurukul/SubsectionManager.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { fetchSubsections, createSubsection, updateSubsection, deleteSubsection } from "../../api/gurukulApi";

const SubsectionManager = ({ sectionId, isAdmin }) => {
  const [subsections, setSubsections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ title: '', content: '' });
  const [newSubsection, setNewSubsection] = useState({ title: '', content: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadSubsections();
  }, [sectionId]);

  const loadSubsections = async () => {
    setLoading(true);
    try {
      const { data } = await fetchSubsections(sectionId);
      setSubsections(data.data);
    } catch (err) {
      toast.error('Failed to load subsections');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newSubsection.title.trim()) return toast.error('Title required');
    try {
      const { data } = await createSubsection(sectionId, newSubsection);
      setSubsections([...subsections, data.data]);
      setNewSubsection({ title: '', content: '' });
      setShowAddForm(false);
      toast.success('Subsection added');
    } catch (err) {
      toast.error('Add failed');
    }
  };

  const handleUpdate = async (id) => {
    if (!editData.title.trim()) return toast.error('Title required');
    try {
      const { data } = await updateSubsection(id, editData);
      setSubsections(subsections.map(s => s._id === id ? data.data : s));
      setEditingId(null);
      toast.success('Updated');
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subsection?')) return;
    try {
      await deleteSubsection(id);
      setSubsections(subsections.filter(s => s._id !== id));
      toast.success('Deleted');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  if (loading) return <div className="skeleton" style={{ height: '60px', borderRadius: '12px' }} />;

  return (
    <div style={{ marginLeft: '20px', borderLeft: '2px solid var(--color-border)', paddingLeft: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ fontWeight: 600, fontSize: '1rem' }}>Subsections</h4>
        {isAdmin && !showAddForm && (
          <button className="btn-text" onClick={() => setShowAddForm(true)}><Plus size={14} /> Add</button>
        )}
      </div>

      {showAddForm && isAdmin && (
        <div className="card" style={{ padding: '16px', marginBottom: '16px', background: 'var(--color-surface-alt)' }}>
          <input type="text" placeholder="Subsection title" value={newSubsection.title} onChange={e => setNewSubsection({ ...newSubsection, title: e.target.value })} className="input-field" style={{ marginBottom: '8px' }} />
          <textarea placeholder="Content (optional)" rows={2} value={newSubsection.content} onChange={e => setNewSubsection({ ...newSubsection, content: e.target.value })} className="input-field" style={{ marginBottom: '12px' }} />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAdd}>Save</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {subsections.map((sub) => (
          <div key={sub._id} className="card" style={{ padding: '12px 16px', borderRadius: '16px' }}>
            {editingId === sub._id ? (
              <div>
                <input type="text" value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} className="input-field" style={{ marginBottom: '8px' }} />
                <textarea value={editData.content} onChange={e => setEditData({ ...editData, content: e.target.value })} rows={2} className="input-field" style={{ marginBottom: '12px' }} />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                  <button className="btn-primary" onClick={() => handleUpdate(sub._id)}>Update</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ fontWeight: 700 }}>{sub.title}</strong>
                  {sub.content && <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>{sub.content}</p>}
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn-icon" onClick={() => { setEditingId(sub._id); setEditData({ title: sub.title, content: sub.content || '' }); }}><Edit2 size={12} /></button>
                    <button className="btn-icon" onClick={() => handleDelete(sub._id)}><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {subsections.length === 0 && !showAddForm && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', padding: '8px 0' }}>No subsections yet.</div>}
      </div>
    </div>
  );
};

export default SubsectionManager;