import { useEffect, useState, useRef, useCallback } from 'react';
import { RadioInterface } from './components/Radio/RadioInterface';
import { NotebookPanel } from './components/Notebook/NotebookPanel';
import { MobileHandset } from './components/Radio/MobileHandset';
import { ConnectPhone } from './components/shared/ConnectPhone';
import { WelcomeOverlay } from './components/WelcomeOverlay';
import { MysteryDevice } from './components/MysteryDevice';
import { useSocket } from './hooks/useSocket';
import { useRadioStore } from './stores/radioStore';
import { useDeviceStore } from './stores/deviceStore';
import { useNotebookStore } from './stores/notebookStore';
import { useAudioEngine } from './hooks/useAudioEngine';
import './styles/radio.css';

// Constants for local scanning
const STEP_FINE = 0.005;
const STEP_SCAN = 0.025;
const MIN_FREQUENCY = 26.000;
const MAX_FREQUENCY = 32.000;
const SCAN_INTERVAL = 100; // ms between scan steps

function App() {
  const { connect, isConnected, tune, startScan, stopScan, resetConversations } = useSocket();
  const {
    setFrequency,
    setFrequencyWithReset,
    setScanning,
    staticLevel,
    volume,
    isAudioInitialized,
    setAudioInitialized,
    lastCharacterResponse,
    broadcastType,
    label,
    characterCallsign,
    currentFrequency,
    signalContent,
    signalEncoded,
  } = useRadioStore();
  const { isMobileDevice, sessionCode } = useDeviceStore();
  const { entries, addEntry } = useNotebookStore();
  const {
    playStaticNoise,
    setStaticLevel,
    stopStatic,
    playSquelch,
    playAudioBuffer,
    playMorse,
    playNumbers,
    stopSignalAudio,
    outputLevel,
    startOutputMonitoring,
  } = useAudioEngine();
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    return !sessionStorage.getItem('frequency_welcomed');
  });
  const [activeTuneButton, setActiveTuneButton] = useState<'up' | 'down' | null>(null);
  const [isSpacebarHeld, setIsSpacebarHeld] = useState(false);
  const [isPoweredOn, setIsPoweredOn] = useState(false);
  const scanIntervalRef = useRef<number | null>(null);
  const scanDirectionRef = useRef<'up' | 'down' | null>(null);
  const lastCharacterResponseRef = useRef<string | null>(null);
  const discoveredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    connect();
  }, [connect]);

  // Handle power toggle - initializes audio on first power on
  const handlePowerToggle = useCallback(() => {
    if (!isPoweredOn) {
      // Turning ON
      setIsPoweredOn(true);
      if (!isAudioInitialized) {
        startOutputMonitoring();
        setAudioInitialized(true);
      }
      // Fade in static with a slight delay for effect
      setTimeout(() => {
        playSquelch();
        playStaticNoise(staticLevel * volume);
      }, 200);
    } else {
      // Turning OFF
      setIsPoweredOn(false);
      stopStatic();
      stopSignalAudio();
    }
  }, [isPoweredOn, isAudioInitialized, startOutputMonitoring, setAudioInitialized, playSquelch, playStaticNoise, staticLevel, volume, stopStatic, stopSignalAudio]);

  // Update static level when it changes (from tuning) - only when powered on
  useEffect(() => {
    if (isAudioInitialized && isPoweredOn) {
      setStaticLevel(staticLevel * volume);
    }
  }, [staticLevel, volume, isAudioInitialized, isPoweredOn, setStaticLevel]);

  // Play morse/numbers when tuned to signal frequencies - only when powered on
  useEffect(() => {
    if (!isAudioInitialized || !isPoweredOn) return;

    // Stop any existing signal audio first
    stopSignalAudio();

    if (broadcastType === 'morse') {
      // Play morse code - using "THE TOWER REMEMBERS" as default
      playMorse('THE TOWER REMEMBERS', volume * 0.4);
    } else if (broadcastType === 'numbers') {
      // Play numbers station - use signal content from server if available
      const numbersSequence = useRadioStore.getState().signalContent || '7-3-9-1-4-2-8';
      playNumbers(numbersSequence, volume * 0.5);
    }

    return () => {
      stopSignalAudio();
    };
  }, [broadcastType, isAudioInitialized, isPoweredOn, playMorse, playNumbers, stopSignalAudio, volume]);

  // Auto-log discoveries to notebook
  useEffect(() => {
    if (!broadcastType || broadcastType === 'static') return;

    const discoveryKey = `${broadcastType}-${currentFrequency.toFixed(3)}`;

    // Check if already discovered (in ref or in entries)
    if (discoveredRef.current.has(discoveryKey)) return;
    const alreadyLogged = entries.some(
      e => e.frequency_ref === currentFrequency && e.entry_type !== 'note'
    );
    if (alreadyLogged) {
      discoveredRef.current.add(discoveryKey);
      return;
    }

    // Add to discovered set
    discoveredRef.current.add(discoveryKey);

    // Create notebook entry based on broadcast type
    const now = new Date();
    const id = `discovery-${Date.now()}`;

    const baseEntry = {
      id,
      user_id: '',
      frequency_ref: currentFrequency,
      character_ref: null,
      signal_ref: null,
      is_pinned: false,
      tags: [],
      created_at: now,
      updated_at: now,
    };

    if (broadcastType === 'voice' && characterCallsign) {
      addEntry({
        ...baseEntry,
        entry_type: 'character',
        title: characterCallsign,
        content: `Made contact at ${currentFrequency.toFixed(3)} MHz`,
      });
    } else if (broadcastType === 'morse') {
      const morseContent = signalContent ? `Message: "${signalContent}"` : 'Morse code detected';
      const morseEncoded = signalEncoded ? `\nPattern: ${signalEncoded}` : '';
      addEntry({
        ...baseEntry,
        entry_type: 'signal',
        title: label || 'Morse Signal',
        content: `${morseContent} at ${currentFrequency.toFixed(3)} MHz${morseEncoded}`,
      });
    } else if (broadcastType === 'numbers') {
      const numbersContent = signalContent ? `Sequence: ${signalContent}` : 'Numbers station detected';
      addEntry({
        ...baseEntry,
        entry_type: 'signal',
        title: label || 'Numbers Station',
        content: `${numbersContent} at ${currentFrequency.toFixed(3)} MHz`,
      });
    }
  }, [broadcastType, currentFrequency, characterCallsign, label, signalContent, signalEncoded, entries, addEntry]);

  // Play character audio when response comes in
  useEffect(() => {
    if (!lastCharacterResponse || !isAudioInitialized) return;

    // Check if this is a new response (not the same one we already played)
    const responseId = lastCharacterResponse.characterId + lastCharacterResponse.transcript;
    if (responseId === lastCharacterResponseRef.current) return;
    lastCharacterResponseRef.current = responseId;

    // Play squelch at start
    playSquelch();

    // Play the character audio if available (base64 or URL)
    const audioSource = lastCharacterResponse.audioBase64 || lastCharacterResponse.audioUrl;
    if (audioSource) {
      playAudioBuffer(audioSource).then(() => {
        // Play squelch at end
        playSquelch();
      });
    }
  }, [lastCharacterResponse, isAudioInitialized, playSquelch, playAudioBuffer]);

  // Local scan function that updates frequency directly (for testing without server)
  const startLocalScan = useCallback((direction: 'up' | 'down') => {
    if (scanIntervalRef.current) return; // Already scanning

    scanDirectionRef.current = direction;
    setScanning(true, direction);

    // Also emit to server if connected
    startScan(direction, 'slow');

    // Local scanning interval - resets broadcast info while scanning
    scanIntervalRef.current = window.setInterval(() => {
      const currentFreq = useRadioStore.getState().currentFrequency;
      let newFreq = direction === 'up'
        ? currentFreq + STEP_SCAN
        : currentFreq - STEP_SCAN;

      // Wrap around
      if (newFreq > MAX_FREQUENCY) newFreq = MIN_FREQUENCY;
      if (newFreq < MIN_FREQUENCY) newFreq = MAX_FREQUENCY;

      setFrequencyWithReset(Math.round(newFreq * 1000) / 1000);
    }, SCAN_INTERVAL);
  }, [startScan, setScanning, setFrequencyWithReset]);

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
        setActiveTuneButton('up');
        // Fine tune up
        const currentFreq = useRadioStore.getState().currentFrequency;
        let newFreq = currentFreq + STEP_FINE;
        if (newFreq > MAX_FREQUENCY) newFreq = MIN_FREQUENCY;
        setFrequency(Math.round(newFreq * 1000) / 1000);
        tune(Math.round(newFreq * 1000) / 1000);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveTuneButton('down');
        // Fine tune down
        const currentFreq = useRadioStore.getState().currentFrequency;
        let newFreq = currentFreq - STEP_FINE;
        if (newFreq < MIN_FREQUENCY) newFreq = MAX_FREQUENCY;
        setFrequency(Math.round(newFreq * 1000) / 1000);
        tune(Math.round(newFreq * 1000) / 1000);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        // Spacebar triggers PTT via custom event (handset listens for this)
        if (!isSpacebarHeld) {
          setIsSpacebarHeld(true);
          window.dispatchEvent(new CustomEvent('ptt-start'));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        stopLocalScan();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveTuneButton(null);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        // Release PTT via custom event
        if (isSpacebarHeld) {
          setIsSpacebarHeld(false);
          window.dispatchEvent(new CustomEvent('ptt-end'));
        }
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
  }, [isMobileDevice, startLocalScan, stopLocalScan, setFrequency, tune, isSpacebarHeld]);

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
          <button
            className="back-to-landing"
            onClick={() => {
              sessionStorage.removeItem('frequency_welcomed');
              setShowWelcome(true);
              if (isPoweredOn) {
                setIsPoweredOn(false);
                stopStatic();
                stopSignalAudio();
              }
            }}
          >
            BRIEFING
          </button>
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
            {isConnected ? 'CONNECTED' : 'OFFLINE MODE'}
          </div>
        </div>
      </header>

      <main className="app-main desktop-layout three-column">
        <div className="radio-section">
          <RadioInterface
            showPTT={false}
            activeTuneButton={activeTuneButton}
            outputLevel={outputLevel}
            isPoweredOn={isPoweredOn}
            onPowerToggle={handlePowerToggle}
          />
          <MysteryDevice />
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
          <span><kbd>←</kbd> <kbd>→</kbd> Scan</span>
          <span><kbd>↑</kbd> <kbd>↓</kbd> Fine tune</span>
          <span><kbd>Space</kbd> Push to talk</span>
        </div>
        <button
          className="reset-btn"
          onClick={() => {
            if (window.confirm('Reset all conversation history? Characters will forget previous interactions.')) {
              resetConversations();
            }
          }}
        >
          RESET CONVERSATIONS
        </button>
      </footer>

      {showWelcome && (
        <WelcomeOverlay onDismiss={() => {
          setShowWelcome(false);
          sessionStorage.setItem('frequency_welcomed', '1');
        }} />
      )}

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
