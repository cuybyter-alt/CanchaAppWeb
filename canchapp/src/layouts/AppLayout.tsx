import React from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from '../components/layout/topbar';
import { Sidebar } from '../components/layout/sidebar';

export default function AppLayout() {
  // Mock upcoming booking - puedes conectarlo a tu store más tarde
  const upcomingBooking = {
    name: 'Cancha\nEl Estadio',
    date: 'Sat, Feb 29',
    time: 'Sat 7:00 PM',
    players: '5v5',
  };

  return (
    <div className="min-h-screen relative z-[1]">
      {/* Topbar - fixed at top */}
      <Topbar />
      
      {/* Content below topbar */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden lg:block">
          <Sidebar upcomingBooking={upcomingBooking} />
        </div>

        {/* Main content area */}
        <main className="min-h-[calc(100vh-64px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
