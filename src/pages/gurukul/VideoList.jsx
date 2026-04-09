// src/pages/gurukul/VideoList.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Search, Loader2, Play, Edit2, Trash2 } from 'lucide-react';
import { fetchVideos, deleteVideo }  from "../../api/gurukulApi";
import AppShell from '../../components/layout/AppShell';
import VideoForm from './VideoForm';

const ADMIN_ROLES = ['SuperUser', 'HR', 'GM', 'VP', 'Director'];

const VideoList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchVideos(page, 12, search);
      setVideos(data.data.docs);
      setTotalPages(data.data.totalPages);
    } catch (err) {
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this video permanently?')) return;
    setDeletingId(id);
    try {
      await deleteVideo(id);
      toast.success('Video deleted');
      loadVideos();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (


    <AppShell>
    <div className="page-wrapper">
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2rem', fontWeight: 800 }}>Gurukul Videos</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Learn and grow with our curated video library</p>
        </div>
        {isAdmin && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> Upload Video
          </motion.button>
        )}
      </header>

      {/* Search */}
      <div style={{ marginBottom: '32px', maxWidth: '400px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
          <input type="text" placeholder="Search by title..." value={search} onChange={handleSearch} className="input-field" style={{ paddingLeft: '42px' }} />
        </div>
      </div>

      {/* Video Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
          <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
        </div>
      ) : videos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-text-tertiary)' }}>
          <Play size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>No videos found. {isAdmin && 'Click "Upload Video" to add one.'}</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {videos.map((video) => (
              <motion.div key={video._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card card-hover" style={{ overflow: 'hidden', borderRadius: '24px', cursor: 'pointer' }} onClick={() => navigate(`/gurukul/${video._id}`)}>
                <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Play size={48} color="white" style={{ opacity: 0.5 }} />
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.2s' }} className="play-overlay">
                    <Play size={48} color="white" />
                  </div>
                </div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontWeight: 800, marginBottom: '8px', fontSize: '1.2rem' }}>{video.title}</h3>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{video.description || 'No description'}</p>
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>📅 {new Date(video.createdAt).toLocaleDateString()}</span>
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn-icon" onClick={() => navigate(`/gurukul/${video._id}/edit`)}><Edit2 size={14} /></button>
                        <button className="btn-icon" onClick={() => handleDelete(video._id)} disabled={deletingId === video._id}>
                          {deletingId === video._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '40px' }}>
              <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span style={{ padding: '8px 16px', background: 'var(--color-surface-alt)', borderRadius: '12px' }}>Page {page} of {totalPages}</span>
              <button className="btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && <VideoForm onClose={() => setShowCreateModal(false)} onSuccess={loadVideos} />}
    </div>
    </AppShell>
  );
};

export default VideoList;