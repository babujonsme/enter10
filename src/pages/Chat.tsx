import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetcher } from '../lib/api';
import { Send } from 'lucide-react';

export function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load history
    fetcher('/api/messages')
      .then(setMessages)
      .catch(err => console.error('Failed to load messages:', err));

    // Connect WS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'chat') {
        setMessages((prev) => [...prev, message]);
      }
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !ws.current) return;

    const message = {
      type: 'chat',
      userId: user?.id,
      username: user?.username,
      avatar_url: user?.avatar_url,
      content: input,
    };

    ws.current.send(JSON.stringify(message));
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="p-6 border-b border-gray-800 bg-gray-900 z-10">
        <h1 className="text-2xl font-bold text-white">Team Chat</h1>
        <p className="text-gray-400 text-sm">Real-time collaboration</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[70%] ${isMe ? 'flex-row-reverse space-x-reverse' : 'flex-row'} space-x-3`}>
                <img src={msg.avatar_url} alt={msg.username} className="w-8 h-8 rounded-full mt-1" />
                <div>
                  <div className={`p-4 rounded-2xl ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'}`}>
                    {!isMe && <p className="text-xs text-emerald-400 font-bold mb-1">{msg.username}</p>}
                    <p className="text-sm">{msg.content}</p>
                  </div>
                  <p className={`text-xs text-gray-500 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <form onSubmit={sendMessage} className="flex items-center space-x-4 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-full px-6 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-full transition-colors shadow-lg shadow-emerald-900/20"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
