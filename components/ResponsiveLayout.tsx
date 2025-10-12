'use client';

import { useState, useEffect } from 'react';
import { MobileNav } from './MobileNav';
import { MobileMenu } from './MobileMenu';
import { PWAInstallPrompt, ServiceWorkerRegistration } from './PWAInstallPrompt';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  currentUser?: string;
  onUserChange?: (user: string) => void;
  projects?: Array<{ id: string; name: string; conversations: number }>;
  currentProject?: string;
  onProjectChange?: (projectId: string) => void;
  showMobileNav?: boolean;
  activeTab?: 'chat' | 'gmail' | 'files' | 'calendar' | 'more';
  onTabChange?: (tab: string) => void;
}

export function ResponsiveLayout({
  children,
  currentUser,
  onUserChange,
  projects,
  currentProject,
  onProjectChange,
  showMobileNav = true,
  activeTab = 'chat',
  onTabChange,
}: ResponsiveLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      {/* Service Worker Registration */}
      <ServiceWorkerRegistration />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentUser={currentUser}
        onUserChange={onUserChange}
        projects={projects}
        currentProject={currentProject}
        onProjectChange={onProjectChange}
      />

      {/* Main Content */}
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header with hamburger menu (mobile only) */}
        {isMobile && (
          <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 safe-padding">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-gray-400 hover:text-white"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-white">KimbleAI</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </header>
        )}

        {/* Content Area */}
        <main className={`flex-1 overflow-auto ${showMobileNav && isMobile ? 'pb-16' : ''}`}>
          {children}
        </main>

        {/* Mobile Navigation (mobile only) */}
        {showMobileNav && isMobile && (
          <MobileNav
            activeTab={activeTab}
            onTabChange={onTabChange}
          />
        )}
      </div>
    </>
  );
}

// Hook to detect if running as PWA
export function useIsPWA() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebApp = (window.navigator as any).standalone === true;
      setIsPWA(isStandalone || isInWebApp);
    };

    checkPWA();
  }, []);

  return isPWA;
}

// Hook to detect device type
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);

    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  return deviceType;
}

// Hook for touch detection
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
}

// Hook for orientation
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return orientation;
}
