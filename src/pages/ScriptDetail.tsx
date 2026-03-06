import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { fetcher } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { User, Send, Check, X, MessageSquarePlus, Globe } from 'lucide-react';

export function ScriptDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [script, setScript] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const [activeSuggestion, setActiveSuggestion] = useState<any>(null);

  const [showPublishModal, setShowPublishModal] = useState(false);

  useEffect(() => {
    loadScript();
  }, [id]);

  const loadScript = () => {
    fetcher(`/api/scripts/${id}`)
      .then(setScript)
      .catch(err => console.error('Failed to load script:', err));
  };

  const confirmPublish = async () => {
    try {
      await fetcher(`/api/scripts/${id}/publish`, { method: 'POST' });
      setShowPublishModal(false);
      alert('স্ক্রিপ্ট সফলভাবে পাবলিশ করা হয়েছে!');
      loadScript();
    } catch (err) {
      console.error('Failed to publish script:', err);
      alert('পাবলিশ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    }
  };

  const handlePublishClick = () => {
    setShowPublishModal(true);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      // Ensure selection is within the script content
      if (contentRef.current && contentRef.current.contains(selection.anchorNode)) {
        setSelectedText(selection.toString());
        setShowSuggestionModal(true);
      }
    }
  };

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitComment(comment, selectedText, suggestion);
    setShowSuggestionModal(false);
    setSelectedText('');
    setSuggestion('');
    setComment('');
  };

  const submitComment = async (content: string, selected?: string, suggest?: string) => {
    await fetcher(`/api/scripts/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ 
        content, 
        selected_text: selected, 
        suggestion: suggest 
      }),
    });
    loadScript();
  };

  const handleApprove = async (commentId: number) => {
    try {
      await fetcher(`/api/scripts/${id}/approve-suggestion/${commentId}`, {
        method: 'POST',
      });
      setActiveSuggestion(null);
      loadScript();
    } catch (err) {
      console.error('Failed to approve suggestion:', err);
    }
  };

  const renderHighlightedContent = () => {
    if (!script) return null;
    
    let content = script.content;
    // Include both pending and approved suggestions
    const suggestions = script.comments.filter((c: any) => c.suggestion && (c.status === 'pending' || c.status === 'approved'));
    
    if (suggestions.length === 0) return content;

    // Sort suggestions by their position in the text (first occurrence)
    const ranges = suggestions.map((s: any) => {
      // For pending, look for selected_text. For approved, look for suggestion (since text was replaced).
      const searchText = s.status === 'approved' ? s.suggestion : s.selected_text;
      const index = content.indexOf(searchText);
      return { ...s, index, length: searchText.length, searchText };
    }).filter((s: any) => s.index !== -1)
      .sort((a: any, b: any) => a.index - b.index);

    if (ranges.length === 0) return content;

    const elements = [];
    let lastIndex = 0;

    ranges.forEach((s: any, i: number) => {
      // Avoid overlapping ranges or out of order ranges due to multiple matches
      if (s.index < lastIndex) return;

      // Add text before the suggestion
      elements.push(content.substring(lastIndex, s.index));

      // Determine style based on status
      const isApproved = s.status === 'approved';
      const highlightClass = isApproved 
        ? "bg-emerald-500/20 border-b-2 border-emerald-500 cursor-pointer relative group rounded px-0.5 mx-0.5"
        : "bg-yellow-500/30 border-b-2 border-yellow-500 cursor-pointer relative group rounded px-0.5 mx-0.5";

      // Add the highlighted suggestion
      elements.push(
        <span 
          key={s.id}
          className={highlightClass}
          onClick={(e) => {
            e.stopPropagation();
            setActiveSuggestion(activeSuggestion?.id === s.id ? null : s);
          }}
        >
          {s.searchText}
          
          {/* Popover */}
          {activeSuggestion?.id === s.id && (
            <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 text-left">
              <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-800">
                <img src={s.author_avatar} alt={s.author_name} className="w-6 h-6 rounded-full" />
                <div>
                  <p className="text-xs text-gray-400 font-medium">
                    {isApproved ? 'সাজেশন দিয়েছেন:' : 'সাজেশন দিয়েছেন:'}
                  </p>
                  <p className="text-sm text-white font-bold">{s.author_name}</p>
                </div>
                {isApproved && <Check size={16} className="text-emerald-500 ml-auto" />}
              </div>

              {isApproved ? (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 uppercase mb-1">আগের লেখা:</p>
                  <div className="bg-red-900/20 text-red-300 p-2 rounded text-sm line-through decoration-red-500/50">
                    {s.selected_text}
                  </div>
                </div>
              ) : (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 uppercase mb-1">সাজেশন:</p>
                  <div className="bg-emerald-900/30 text-emerald-300 p-2 rounded text-sm border border-emerald-500/30">
                    {s.suggestion}
                  </div>
                </div>
              )}

              {s.content && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 uppercase mb-1">মন্তব্য:</p>
                  <p className="text-gray-300 text-sm italic">"{s.content}"</p>
                </div>
              )}
              
              {!isApproved && (user?.role === 'admin' || user?.id === script.author_id) && (
                <button
                  onClick={() => handleApprove(s.id)}
                  className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm transition-colors font-medium"
                >
                  <Check size={16} />
                  <span>পরিবর্তন অনুমোদন করুন</span>
                </button>
              )}
              
              {/* Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
            </div>
          )}
        </span>
      );

      lastIndex = s.index + s.length;
    });

    // Add remaining text
    elements.push(content.substring(lastIndex));

    return elements;
  };

  if (!script) return <div className="p-8 text-white">লোড হচ্ছে...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl mb-8"
      >
        <div className="flex items-center justify-between mb-6 relative z-10">
          <h1 className="text-3xl font-bold text-white">{script.title}</h1>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${script.status === 'draft' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
              {script.status === 'draft' ? 'ড্রাফট' : 'পাবলিশড'}
            </span>
            {script.status === 'draft' && (user?.role === 'admin' || user?.id === script.author_id) && (
              <button 
                onClick={handlePublishClick}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer shadow-lg"
              >
                <Globe size={16} />
                <span>পাবলিশ করুন</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-700">
          <img src={script.author_avatar} alt={script.author_name} className="w-10 h-10 rounded-full" />
          <div>
            <p className="text-white font-medium">{script.author_name}</p>
            <p className="text-gray-400 text-sm">তৈরি হয়েছে {new Date(script.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div 
          ref={contentRef}
          onMouseUp={handleTextSelection}
          className="prose prose-invert max-w-none text-gray-300 leading-relaxed whitespace-pre-wrap relative min-h-[200px]"
        >
          {renderHighlightedContent()}
        </div>
      </motion.div>

      {/* Publish Confirmation Modal */}
      <AnimatePresence>
        {showPublishModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-800 p-6 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white mb-4">নিশ্চিত করুন</h2>
              <p className="text-gray-300 mb-6">
                আপনি কি নিশ্চিত যে আপনি এই স্ক্রিপ্টটি পাবলিশ করতে চান? এটি ড্যাশবোর্ডে সবার জন্য দৃশ্যমান হবে।
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  বাতিল
                </button>
                <button
                  onClick={confirmPublish}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  হ্যাঁ, পাবলিশ করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Suggestion Modal */}
      <AnimatePresence>
        {showSuggestionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-gray-800 p-6 rounded-2xl w-full max-w-lg border border-gray-700 relative shadow-2xl"
            >
              <button 
                onClick={() => setShowSuggestionModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <MessageSquarePlus className="mr-2 text-emerald-500" />
                পরিবর্তন সাজেস্ট করুন
              </h2>
              
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">নির্বাচিত লেখা</label>
                <div className="bg-gray-900 p-3 rounded-lg text-gray-300 text-sm border border-gray-700 italic">
                  "{selectedText}"
                </div>
              </div>

              <form onSubmit={handleSuggestionSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">আপনার সাজেশন</label>
                  <textarea
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 min-h-[100px]"
                    placeholder="এখানে নতুন লেখাটি লিখুন..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">মন্তব্য (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="কেন আপনি এই পরিবর্তনের পরামর্শ দিচ্ছেন?"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowSuggestionModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    সাজেশন জমা দিন
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
