import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, MessageSquare, DollarSign, Video, LogOut, Users, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export function Sidebar() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-emerald-500">Babu Enter10</h1>
          <p className="text-xs text-gray-400 mt-1">Production Dashboard</p>
        </div>
        <button onClick={toggleSidebar} className="md:hidden text-gray-400 hover:text-white">
          <X size={24} />
        </button>
      </div>
      
      <div className="p-4 flex items-center space-x-3 border-b border-gray-800">
        <img src={user?.avatar_url} alt="Profile" className="w-10 h-10 rounded-full bg-gray-700" />
        <div>
          <p className="font-medium text-sm">{user?.username}</p>
          <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <NavLink onClick={() => setIsOpen(false)} to="/" end className={({ isActive }) => `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <LayoutDashboard size={20} />
          <span>ড্যাশবোর্ড</span>
        </NavLink>
        <NavLink onClick={() => setIsOpen(false)} to="/scripts" className={({ isActive }) => `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <FileText size={20} />
          <span>স্ক্রিপ্ট</span>
        </NavLink>
        <NavLink onClick={() => setIsOpen(false)} to="/chat" className={({ isActive }) => `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <MessageSquare size={20} />
          <span>টিম চ্যাট</span>
        </NavLink>
        <NavLink onClick={() => setIsOpen(false)} to="/expenses" className={({ isActive }) => `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <DollarSign size={20} />
          <span>খরচ</span>
        </NavLink>
        <NavLink onClick={() => setIsOpen(false)} to="/videos" className={({ isActive }) => `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <Video size={20} />
          <span>ভিডিও</span>
        </NavLink>
        <NavLink onClick={() => setIsOpen(false)} to="/team" className={({ isActive }) => `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <Users size={20} />
          <span>টিম মেম্বার</span>
        </NavLink>
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button onClick={logout} className="flex items-center space-x-3 px-4 py-3 w-full text-left text-gray-400 hover:bg-red-900/20 hover:text-red-400 rounded-lg transition-colors">
          <LogOut size={20} />
          <span>লগ আউট</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-gray-900 border-b border-gray-800 p-4 z-50 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold text-emerald-500">Babu Enter10</h1>
        </div>
        <button onClick={toggleSidebar} className="text-white p-2">
          <Menu size={24} />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-gray-900 text-white h-screen flex-col fixed left-0 top-0 border-r border-gray-800">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white z-50 flex flex-col md:hidden border-r border-gray-800"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
