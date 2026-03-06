import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Scripts } from './pages/Scripts';
import { ScriptDetail } from './pages/ScriptDetail';
import { Chat } from './pages/Chat';
import { Expenses } from './pages/Expenses';
import { Videos } from './pages/Videos';
import { Team } from './pages/Team';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="scripts" element={<Scripts />} />
            <Route path="scripts/:id" element={<ScriptDetail />} />
            <Route path="chat" element={<Chat />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="videos" element={<Videos />} />
            <Route path="team" element={<Team />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
