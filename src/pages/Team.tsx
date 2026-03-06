import React, { useEffect, useState } from 'react';
import { fetcher } from '../lib/api';
import { Plus, User, Shield, Edit2, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export function Team() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'member', avatar_url: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    fetcher('/api/users')
      .then(setUsers)
      .catch(err => console.error('Failed to load users:', err));
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '', role: 'member', avatar_url: '' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setFormData({ 
      username: user.username, 
      password: '', // Don't fill password
      role: user.role, 
      avatar_url: user.avatar_url 
    });
    setError('');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await fetcher(`/api/users/${id}`, { method: 'DELETE' });
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingUser) {
        await fetcher(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetcher('/api/users', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Team Members</h1>
        <button
          onClick={openAddModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus size={20} />
          <span>Add Member</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user: any) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-emerald-500/50 transition-colors relative group"
          >
            <div className="flex items-center space-x-4">
              <img src={user.avatar_url} alt={user.username} className="w-16 h-16 rounded-full bg-gray-700 object-cover" />
              <div>
                <h3 className="text-xl font-bold text-white">{user.username}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  {user.role === 'admin' ? <Shield size={14} className="text-emerald-400" /> : <User size={14} className="text-gray-400" />}
                  <span className={`text-sm capitalize ${user.role === 'admin' ? 'text-emerald-400' : 'text-gray-400'}`}>{user.role}</span>
                </div>
              </div>
            </div>
            
            <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => openEditModal(user)}
                className="p-2 bg-gray-700 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                title="Edit User"
              >
                <Edit2 size={16} />
              </button>
              {currentUser?.id !== user.id && (
                <button 
                  onClick={() => handleDelete(user.id)}
                  className="p-2 bg-gray-700 hover:bg-red-600 text-white rounded-lg transition-colors"
                  title="Delete User"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-gray-800 p-8 rounded-2xl w-full max-w-md border border-gray-700 relative"
            >
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingUser ? 'Edit Team Member' : 'Add Team Member'}
              </h2>
              
              {error && (
                <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Password {editingUser && <span className="text-gray-500 font-normal">(Leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required={!editingUser}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Profile Photo URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave blank for auto-generated avatar</p>
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
                    {editingUser ? 'Save Changes' : 'Add Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
