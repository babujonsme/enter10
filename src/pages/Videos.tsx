import React, { useEffect, useState } from 'react';
import { fetcher } from '../lib/api';
import { Plus, Video } from 'lucide-react';
import { motion } from 'motion/react';

export function Videos() {
  const [videos, setVideos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newVideo, setNewVideo] = useState({ title: '', url: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = () => {
    fetcher('/api/videos')
      .then(setVideos)
      .catch(err => console.error('Failed to load videos:', err));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await fetcher('/api/videos', {
        method: 'POST',
        body: JSON.stringify(newVideo),
      });
      setShowModal(false);
      setNewVideo({ title: '', url: '' });
      loadVideos();
    } catch (err: any) {
      setError(err.message || 'Failed to add video');
    }
  };

  const getEmbedUrl = (url: string) => {
    // Simple YouTube embed logic
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Videos</h1>
        <button
          onClick={() => {
            setShowModal(true);
            setError('');
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus size={20} />
          <span>Add Video</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video: any) => {
          const embedUrl = getEmbedUrl(video.url);
          return (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-emerald-500/50 transition-colors"
            >
              <div className="aspect-video bg-black">
                {embedUrl ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={embedUrl}
                    title={video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <Video size={48} />
                    <span className="ml-2">Invalid Video URL</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{video.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">Uploaded by {video.uploader_name}</span>
                  <span className="text-xs text-gray-500">{new Date(video.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 p-8 rounded-2xl w-full max-w-md border border-gray-700"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Add Video</h2>
            {error && (
              <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Video URL (YouTube)</label>
                <input
                  type="url"
                  value={newVideo.url}
                  onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Add Video
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
