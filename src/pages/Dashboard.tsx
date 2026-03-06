import React, { useEffect, useState } from 'react';
import { fetcher } from '../lib/api';
import { motion } from 'motion/react';
import { FileText, DollarSign, Video, MessageSquare, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const [stats, setStats] = useState({ scripts: 0, expenses: 0, videos: 0, messages: 0 });
  const [publishedScripts, setPublishedScripts] = useState([]);

  useEffect(() => {
    Promise.all([
      fetcher('/api/scripts'),
      fetcher('/api/expenses'),
      fetcher('/api/videos'),
      fetcher('/api/messages')
    ]).then(([scripts, expenses, videos, messages]) => {
      setStats({
        scripts: scripts.length,
        expenses: expenses.reduce((acc: number, curr: any) => acc + curr.amount, 0),
        videos: videos.length,
        messages: messages.length
      });
      setPublishedScripts(scripts.filter((s: any) => s.status === 'published'));
    }).catch((err) => {
      console.error('Dashboard data fetch error:', err);
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-8">ড্যাশবোর্ড ওভারভিউ</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-emerald-500/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
              <FileText size={24} />
            </div>
            <span className="text-xs font-medium text-gray-400 bg-gray-700 px-2 py-1 rounded-full">মোট স্ক্রিপ্ট</span>
          </div>
          <h3 className="text-3xl font-bold text-white">{stats.scripts}</h3>
          <p className="text-sm text-gray-400 mt-1">সক্রিয় প্রোডাকশন</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-emerald-500/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
              <DollarSign size={24} />
            </div>
            <span className="text-xs font-medium text-gray-400 bg-gray-700 px-2 py-1 rounded-full">মোট খরচ</span>
          </div>
          <h3 className="text-3xl font-bold text-white">৳{stats.expenses.toLocaleString()}</h3>
          <p className="text-sm text-gray-400 mt-1">প্রোডাকশন খরচ</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-emerald-500/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
              <Video size={24} />
            </div>
            <span className="text-xs font-medium text-gray-400 bg-gray-700 px-2 py-1 rounded-full">ভিডিও</span>
          </div>
          <h3 className="text-3xl font-bold text-white">{stats.videos}</h3>
          <p className="text-sm text-gray-400 mt-1">আপলোড করা কন্টেন্ট</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-emerald-500/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-500/10 rounded-lg text-orange-400">
              <MessageSquare size={24} />
            </div>
            <span className="text-xs font-medium text-gray-400 bg-gray-700 px-2 py-1 rounded-full">মেসেজ</span>
          </div>
          <h3 className="text-3xl font-bold text-white">{stats.messages}</h3>
          <p className="text-sm text-gray-400 mt-1">টিম ইন্টারঅ্যাকশন</p>
        </motion.div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <Clock className="mr-2 text-emerald-500" />
          পাবলিশড স্ক্রিপ্ট
        </h2>
        
        {publishedScripts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publishedScripts.map((script: any) => (
              <motion.div
                key={script.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-emerald-500/50 transition-colors group"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full uppercase tracking-wider">
                      পাবলিশড
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(script.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                    {script.title}
                  </h3>
                  
                  <p className="text-gray-400 text-sm mb-6 line-clamp-3">
                    {script.content}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <div className="flex items-center space-x-2">
                      <img src={script.author_avatar} alt={script.author_name} className="w-6 h-6 rounded-full" />
                      <span className="text-xs text-gray-400">{script.author_name}</span>
                    </div>
                    <Link 
                      to={`/scripts/${script.id}`}
                      className="text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                    >
                      স্ক্রিপ্ট পড়ুন →
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
            <p className="text-gray-400">এখনও কোন স্ক্রিপ্ট পাবলিশ করা হয়নি।</p>
          </div>
        )}
      </div>
    </div>
  );
}
