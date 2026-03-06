import React, { useEffect, useState } from 'react';
import { fetcher } from '../lib/api';
import { Link } from 'react-router-dom';
import { Plus, FileText, User } from 'lucide-react';
import { motion } from 'motion/react';

export function Scripts() {
  const [scripts, setScripts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newScript, setNewScript] = useState({ title: '', content: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = () => {
    fetcher('/api/scripts')
      .then(setScripts)
      .catch(err => console.error('Failed to load scripts:', err));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await fetcher('/api/scripts', {
        method: 'POST',
        body: JSON.stringify(newScript),
      });
      setShowModal(false);
      setNewScript({ title: '', content: '' });
      loadScripts();
    } catch (err: any) {
      setError(err.message || 'Failed to create script');
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">স্ক্রিপ্ট সমূহ</h1>
        <button
          onClick={() => {
            setShowModal(true);
            setError('');
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus size={20} />
          <span>নতুন স্ক্রিপ্ট</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scripts.map((script: any) => (
          <Link to={`/scripts/${script.id}`} key={script.id}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-emerald-500/50 transition-all cursor-pointer h-full flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gray-700/50 rounded-lg text-emerald-400">
                  <FileText size={24} />
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${script.status === 'draft' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                  {script.status === 'draft' ? 'ড্রাফট' : 'পাবলিশড'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{script.title}</h3>
              <p className="text-gray-400 text-sm line-clamp-3 mb-4 flex-1">{script.content}</p>
              <div className="flex items-center space-x-2 mt-auto pt-4 border-t border-gray-700">
                <img src={script.author_avatar} alt={script.author_name} className="w-6 h-6 rounded-full" />
                <span className="text-xs text-gray-400">{script.author_name}</span>
                <span className="text-xs text-gray-600 ml-auto">{new Date(script.created_at).toLocaleDateString()}</span>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 p-8 rounded-2xl w-full max-w-2xl border border-gray-700"
          >
            <h2 className="text-2xl font-bold text-white mb-6">নতুন স্ক্রিপ্ট তৈরি করুন</h2>
            {error && (
              <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">শিরোনাম</label>
                <input
                  type="text"
                  value={newScript.title}
                  onChange={(e) => setNewScript({ ...newScript, title: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">বিষয়বস্তু</label>
                <textarea
                  value={newScript.content}
                  onChange={(e) => setNewScript({ ...newScript, content: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white h-64 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  তৈরি করুন
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
