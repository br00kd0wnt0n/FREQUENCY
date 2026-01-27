import { useEffect, useState, useRef, useCallback } from 'react';
import { RadioInterface } from './components/Radio/RadioInterface';
import { NotebookPanel } from './components/Notebook/NotebookPanel';
import { MobileHandset } from './components/Radio/MobileHandset';
import { ConnectPhone } from './components/shared/ConnectPhone';
import { useSocket } from './hooks/useSocket';
import { useRadioStore } from './stores/radioStore';
import { useDeviceStore } from './stores/deviceStore';
import './styles/radio.css';

// Constants for local scanning
const STEP_FINE = 0.005;
const STEP_SCAN = 0.025;
const MIN_FREQUENCY = 26.000;
const MAX_FREQUENCY = 32.000;
const SCAN_INTERVAL = 100; // ms between scan steps

function App() {
  const { connect, isConnected, tune, startScan, stopScan } = useSocket();
  const { setFrequency, setScanning } = useRadioStore();
  const { isMobileDevice, sessionCode } = useDeviceStore();
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);
  const scanIntervalRef = useRef<number | null>(null);
  const scanDirectionRef = useRef<'up' | 'down' | null>(null);

  useEffect(() => {
    connect();
  }, [connect]);

  // Local scan function that updates frequency directly (for testing without server)
  const startLocalScan = useCallback((direction: 'up' | 'down') => {
    if (scanIntervalRef.current) return; // Already scanning

    scanDirectionRef.current = direction;
    setScanning(true, direction);

    // Also emit to server if connected
    startScan(direction, 'slow');

    // Local scanning interval
    scanIntervalRef.current = window.setInterval(() => {
      const currentFreq = useRadioStore.getState().currentFrequency;
      let newFreq = direction === 'up'
        ? currentFreq + STEP_SCAN
        : currentFreq - STEP_SCAN;

      // Wrap around
      if (newFreq > MAX_FREQUENCY) newFreq = MIN_FREQUENCY;
      if (newFreq < MIN_FREQUENCY) newFreq = MAX_FREQUENCY;

      setFrequency(Math.round(newFreq * 1000) / 1000);
    }, SCAN_INTERVAL);
  }, [startScan, setScanning, setFrequency]);

  const stopLocalScan = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    scanDirectionRef.current = null;
    setScanning(false);
    stopScan();
  }, [stopScan, setScanning]);

  // Keyboard controls for desktop scanning and fine tuning
  useEffect(() => {
    if (isMobileDevice) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        startLocalScan('down');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        startLocalScan('up');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Fine tune up
        const currentFreq = useRadioStore.getState().currentFrequency;
        let newFreq = currentFreq + STEP_FINE;
        if (newFreq > MAX_FREQUENCY) newFreq = MIN_FREQUENCY;
        setFrequency(Math.round(newFreq * 1000) / 1000);
        tune(Math.round(newFreq * 1000) / 1000);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Fine tune down
        const currentFreq = useRadioStore.getState().currentFrequency;
        let newFreq = currentFreq - STEP_FINE;
        if (newFreq < MIN_FREQUENCY) newFreq = MAX_FREQUENCY;
        setFrequency(Math.round(newFreq * 1000) / 1000);
        tune(Math.round(newFreq * 1000) / 1000);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        stopLocalScan();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      // Cleanup interval on unmount
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isMobileDevice, startLocalScan, stopLocalScan, setFrequency, tune]);

  // Mobile handset view
  if (isMobileDevice) {
    return <MobileHandset />;
  }

  // Desktop base station view with integrated handset for testing
  return (
    <div className="app desktop">
      <header className="app-header">
        <h1 className="app-title">FREQUENCY</h1>
        <div className="header-right">
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
            {isConnected ? 'CONNECTED' : 'OFFLINE MODE'}
          </div>
        </div>
      </header>

      <main className="app-main desktop-layout three-column">
        <div className="radio-section">
          <RadioInterface showPTT={false} />
        </div>
        <div className="notebook-section">
          <NotebookPanel />
        </div>
        <div className="handset-section">
          <div className="handset-embed">
            <MobileHandset embedded />
          </div>
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
