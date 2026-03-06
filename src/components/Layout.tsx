import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex bg-gray-900 min-h-screen text-white">
      <Sidebar />
      <div className="flex-1 md:ml-64 overflow-y-auto h-screen pt-16 md:pt-0">
        <Outlet />
      </div>
    </div>
  );
}
