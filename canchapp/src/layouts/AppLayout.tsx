import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from '../components/layout/topbar';
import { Sidebar } from '../components/layout/sidebar';
import { MapDialog } from '../components/sections/MapDialog';
import { BookingPanel } from '../components/features/BookingPanel';
import { MapContext } from '../context/MapContext';
import { LocationBanner } from '../components/layout/LocationBanner';
import type { ComplexMarker } from '../types/map';
import type { Field } from '../types/field';

export default function AppLayout() {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [complexMarkers, setComplexMarkers] = useState<ComplexMarker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Global quick-book panel (triggered from sidebar widget)
  const [quickBookField, setQuickBookField] = useState<Field | null>(null);
  const [quickBookSlotId, setQuickBookSlotId] = useState<string | undefined>(undefined);
  const [quickBookDate, setQuickBookDate] = useState<string | undefined>(undefined);
  const [quickBookOpen, setQuickBookOpen] = useState(false);

  const handleQuickBook = (field: Field, slotId: string, date: string) => {
    setQuickBookField(field);
    setQuickBookSlotId(slotId);
    setQuickBookDate(date);
    setQuickBookOpen(true);
  };

  const handleCloseQuickBook = () => {
    setQuickBookOpen(false);
  };

  return (
    <MapContext.Provider value={{ openMap: () => setIsMapOpen(true), complexMarkers, setComplexMarkers, searchQuery, setSearchQuery }}>
      <div className="min-h-screen relative z-[1]">
        {/* Topbar - fixed at top */}
        <Topbar
          onSearch={setSearchQuery}
          searchValue={searchQuery}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(p => !p)}
        />

        {/* Location permission reminder */}
        <LocationBanner />

        {/* Content below topbar */}
        <div className={`grid grid-cols-1 ${sidebarOpen ? 'lg:grid-cols-[260px_1fr]' : ''}`}>
          {/* Sidebar - hidden on mobile, toggleable on desktop */}
          <div className={sidebarOpen ? 'hidden lg:block' : 'hidden'}>
            <Sidebar onQuickBook={handleQuickBook} />
          </div>

          {/* Main content area */}
          <main className="min-h-[calc(100vh-64px)]">
            <Outlet />
          </main>
        </div>

        {/* Global map dialog */}
        <MapDialog isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />

        {/* Global quick-book panel — mobile: bottom sheet, desktop: right drawer */}
        {quickBookOpen && quickBookField && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000]"
              onClick={handleCloseQuickBook}
            />

            {/* Mobile: slide-up bottom sheet */}
            <div className="animate-slide-in-bottom fixed bottom-0 left-0 right-0 z-[1001] max-h-[88vh] rounded-t-[var(--radius-2xl)] overflow-hidden shadow-[var(--shadow-primary)] lg:hidden">
              <BookingPanel
                field={quickBookField}
                preselectedSlotId={quickBookSlotId}
                preselectedDate={quickBookDate}
                onClose={handleCloseQuickBook}
              />
            </div>

            {/* Desktop: right fixed drawer */}
            <div className="animate-slide-in-right hidden lg:block fixed top-16 right-0 bottom-0 w-[380px] z-[1001] border-l border-[var(--color-border)] shadow-[var(--shadow-primary)] overflow-hidden">
              <BookingPanel
                field={quickBookField}
                preselectedSlotId={quickBookSlotId}
                preselectedDate={quickBookDate}
                onClose={handleCloseQuickBook}
              />
            </div>
          </>
        )}
      </div>
    </MapContext.Provider>
  );
}
