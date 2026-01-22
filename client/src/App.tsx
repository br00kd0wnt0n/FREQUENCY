import { useEffect, useState } from 'react';
import { RadioInterface } from './components/Radio/RadioInterface';
import { NotebookPanel } from './components/Notebook/NotebookPanel';
import { MobileHandset } from './components/Radio/MobileHandset';
import { ConnectPhone } from './components/shared/ConnectPhone';
import { useSocket } from './hooks/useSocket';
import { useRadioStore } from './stores/radioStore';
import { useDeviceStore } from './stores/deviceStore';
import './styles/radio.css';

function App() {
  const { connect, isConnected, tune, startScan, stopScan } = useSocket();
  const currentFrequency = useRadioStore((state) => state.currentFrequency);
  const { isMobileDevice, isHandsetConnected, sessionCode } = useDeviceStore();
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);

  useEffect(() => {
    connect();
  }, [connect]);

  // Keyboard controls for desktop scanning
  useEffect(() => {
    if (isMobileDevice) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        startScan('down', 'slow');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        startScan('up', 'slow');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        stopScan();
        // Tune to current frequency to lock it
        tune(currentFrequency);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isMobileDevice, startScan, stopScan, tune, currentFrequency]);

  // Mobile handset view
  if (isMobileDevice) {
    return <MobileHandset />;
  }

  // Desktop base station view
  return (
    <div className="app desktop">
      <header className="app-header">
        <h1 className="app-title">FREQUENCY</h1>
        <div className="header-right">
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
            {isConnected ? 'CONNECTED' : 'CONNECTING...'}
          </div>
          {isHandsetConnected ? (
            <div className="handset-status connected">
              <span className="handset-icon">📱</span>
              HANDSET LINKED
            </div>
          ) : (
            <button
              className="connect-phone-btn"
              onClick={() => setShowConnectPrompt(true)}
            >
              <span className="handset-icon">📱</span>
              CONNECT HANDSET
            </button>
          )}
        </div>
      </header>

      <main className="app-main desktop-layout">
        <div className="radio-section">
          <RadioInterface showPTT={false} />
        </div>
        <div className="notebook-section">
          <NotebookPanel />
        </div>
      </main>

      <footer className="app-footer">
        <div className="keyboard-hints">
          <span><kbd>←</kbd> <kbd>→</kbd> Scan frequencies</span>
          <span><kbd>↑</kbd> <kbd>↓</kbd> Fine tune</span>
        </div>
      </footer>

      {showConnectPrompt && (
        <ConnectPhone
          sessionCode={sessionCode}
          onClose={() => setShowConnectPrompt(false)}
        />
      )}
    </div>
  );
}

export default App;
