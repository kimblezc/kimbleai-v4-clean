'use client';

import { useState, useEffect } from 'react';
import { TouchButton } from './TouchButton';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after 30 seconds if not dismissed
      const timeout = setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 30000);

      return () => clearTimeout(timeout);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      console.log('PWA installed successfully');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Show iOS instructions if on iOS
      if (isIOS) {
        setShowIOSInstructions(true);
      }
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleShowPrompt = () => {
    setShowPrompt(true);
  };

  // iOS Instructions Modal
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center p-4">
        <div className="bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-2xl">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Install KimbleAI</h3>
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4 text-sm text-gray-300">
            <p>To install KimbleAI on your iOS device:</p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>
                Tap the <strong className="text-white">Share</strong> button{' '}
                <svg className="inline w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
                </svg>
                {' '}in Safari
              </li>
              <li>Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></li>
              <li>Tap <strong className="text-white">"Add"</strong> in the top right corner</li>
              <li>The KimbleAI app will appear on your home screen</li>
            </ol>
          </div>

          <TouchButton
            onClick={() => setShowIOSInstructions(false)}
            fullWidth
            className="mt-6"
          >
            Got it
          </TouchButton>
        </div>
      </div>
    );
  }

  // Install Prompt Banner
  if (showPrompt && !isInstalled) {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 animate-slide-up">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-2xl p-4 max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold mb-1">Install KimbleAI</h3>
              <p className="text-sm text-white/90 mb-3">
                Get the full app experience with offline support and faster loading
              </p>
              <div className="flex gap-2">
                <TouchButton
                  size="sm"
                  variant="secondary"
                  onClick={handleInstall}
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  Install
                </TouchButton>
                <TouchButton
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-white hover:bg-white/20"
                >
                  Not now
                </TouchButton>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Install Button (always show in settings/menu if not installed and not dismissed)
  if (!isInstalled && !showPrompt) {
    return (
      <button
        onClick={handleShowPrompt}
        className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        Install App
      </button>
    );
  }

  return null;
}

// Service Worker Registration Component
export function ServiceWorkerRegistration() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((reg) => {
          setRegistration(reg);
          console.log('Service Worker registered successfully');

          // Check for updates every hour
          setInterval(() => {
            reg.update();
          }, 60 * 60 * 1000);

          // Listen for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  if (updateAvailable) {
    return (
      <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
        <div className="bg-blue-600 rounded-lg shadow-xl p-4 flex items-center gap-3">
          <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium">Update Available</p>
            <p className="text-sm text-white/90">A new version of KimbleAI is ready</p>
          </div>
          <TouchButton
            size="sm"
            onClick={handleUpdate}
            className="bg-white text-blue-600 hover:bg-gray-100 flex-shrink-0"
          >
            Update
          </TouchButton>
        </div>
      </div>
    );
  }

  return null;
}
