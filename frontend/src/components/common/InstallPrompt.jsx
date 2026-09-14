import React, { useState, useEffect } from 'react';
import { BiDownload, BiX, BiCheckCircle } from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import './InstallPrompt.css';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (already installed & running as PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e) => {
      // Prevent browser's default mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user previously dismissed prompt this session
      const dismissed = sessionStorage.getItem('divvy_install_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      toast.success('🎉 Divvy installed successfully! Enjoy native performance.');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast('To install, open browser settings (⋮ or Share) and click "Install" or "Add to Home Screen"');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('🚀 Installing Divvy to your system...');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('divvy_install_dismissed', 'true');
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div className="install-banner animate-slide-up" role="alert">
      <div className="install-banner-glow"></div>
      <div className="install-banner-content">
        <div className="install-app-badge">
          <img src="/icons/icon-192.svg" alt="Divvy Icon" className="install-app-icon" />
        </div>
        <div className="install-text-group">
          <h4 className="install-title">Install Divvy App</h4>
          <p className="install-desc">Fast, offline-ready native app for Mac, Windows, iOS & Android.</p>
        </div>
      </div>
      <div className="install-actions">
        <button className="install-btn-primary" onClick={handleInstallClick}>
          <BiDownload className="install-icon" />
          <span>Install</span>
        </button>
        <button className="install-btn-dismiss" onClick={handleDismiss} title="Dismiss">
          <BiX />
        </button>
      </div>
    </div>
  );
}
