import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from '../components/layout/topbar';
import { Sidebar } from '../components/layout/sidebar';
import { MapDialog } from '../components/sections/MapDialog';
import { BookingPanel } from '../components/features/BookingPanel';
import { MapContext } from '../context/MapContext';
import { LocationBanner } from '../components/layout/LocationBanner';
import { NotificationsProvider } from '../context/NotificationsContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import type { ComplexMarker } from '../types/map';
import type { Field } from '../types/field';
import type { MapCenterCoords } from '../context/MapContext';

function AppLayoutInner() {
  usePushNotifications();

  const [isMapOpen, setIsMapOpen] = useState(false);
  const [complexMarkers, setComplexMarkers] = useState<ComplexMarker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [centerOn, setCenterOn] = useState<MapCenterCoords | undefined>(undefined);

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
    <MapContext.Provider value={{ openMap: () => setIsMapOpen(true), openMapAt: (coords) => { setCenterOn(coords); setIsMapOpen(true); }, complexMarkers, setComplexMarkers, searchQuery, setSearchQuery, centerOn, setCenterOn }}>
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
        <MapDialog isOpen={isMapOpen} onClose={() => { setIsMapOpen(false); setCenterOn(undefined); }} />

        {/* Global quick-book panel — mobile: bottom sheet, desktop: right drawer */}
        {quickBookOpen && quickBookField && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000]"
              onClick={handleCloseQuickBook}
            />

            {/* Panel container — mobile: bottom sheet, desktop: right drawer */}
            <div className="
              animate-slide-in-bottom lg:animate-slide-in-right
              fixed z-[1001]
              bottom-0 left-0 right-0
              lg:top-0 lg:right-0 lg:bottom-0 lg:left-auto lg:w-[380px]
              bg-[var(--color-surface)]
              rounded-t-[var(--radius-2xl)] lg:rounded-tl-[var(--radius-2xl)] lg:rounded-tr-none lg:rounded-b-none
              overflow-hidden
              max-h-[88vh] lg:max-h-none
              shadow-[0_-8px_40px_rgba(0,0,0,.35)] lg:shadow-[-8px_0_40px_rgba(0,0,0,.25)]
              lg:border-l lg:border-[var(--color-border)]
            ">
              {/* Mobile drag handle */}
              <div className="lg:hidden flex justify-center pt-3 pb-1 sticky top-0 bg-[var(--color-surface)] z-10">
                <div className="w-10 h-1 bg-[var(--color-border)] rounded-full" />
              </div>
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

export default function AppLayout() {
  return (
    <NotificationsProvider>
      <AppLayoutInner />
    </NotificationsProvider>
  );
}
