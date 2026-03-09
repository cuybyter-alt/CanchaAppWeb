import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from '../components/layout/topbar';
import { Sidebar } from '../components/layout/sidebar';
import { MapDialog } from '../components/sections/MapDialog';
import { MapContext } from '../context/MapContext';
import { LocationBanner } from '../components/layout/LocationBanner';

export default function AppLayout() {
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Mock upcoming booking - puedes conectarlo a tu store más tarde
  const upcomingBooking = {
    name: 'Cancha\nEl Estadio',
    date: 'Sat, Feb 29',
    time: 'Sat 7:00 PM',
    players: '5v5',
  };

  return (
    <MapContext.Provider value={{ openMap: () => setIsMapOpen(true) }}>
      <div className="min-h-screen relative z-[1]">
        {/* Topbar - fixed at top */}
        <Topbar />

        {/* Location permission reminder */}
        <LocationBanner />

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

        {/* Global map dialog */}
        <MapDialog isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
      </div>
    </MapContext.Provider>
  );
}
