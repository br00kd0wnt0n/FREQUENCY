import { useState, useEffect, useRef } from 'react';
import { useRadioStore } from '../../stores/radioStore';
import { useSocket } from '../../hooks/useSocket';
import { usePTT } from '../../hooks/usePTT';
import { useAudioEngine } from '../../hooks/useAudioEngine';

// VU meter segment thresholds
const VU_SEGMENTS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

interface MobileHandsetProps {
  embedded?: boolean; // Skip link screen when embedded in desktop view
}

export function MobileHandset({ embedded = false }: MobileHandsetProps) {
  const [sessionCode, setSessionCode] = useState('');
  const [isLinked, setIsLinked] = useState(embedded); // Auto-link if embedded
  const [inputCode, setInputCode] = useState('');
  const [userTranscript, setUserTranscript] = useState<string | null>(null);
  const transcriptTimeoutRef = useRef<number | null>(null);

  const {
    currentFrequency,
    broadcastType,
    characterCallsign,
    staticLevel,
    isCharacterThinking,
    lastCharacterResponse,
  } = useRadioStore();

  const { connect, isConnected, pttStart, pttEnd } = useSocket();
  const { playSquelch, inputLevel, outputLevel, startInputMonitoring, stopInputMonitoring } = useAudioEngine();

  useEffect(() => {
    connect();
    // Check URL for session code
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('session');
    if (code) {
      setInputCode(code.toUpperCase());
    }
  }, [connect]);

  const handleLink = () => {
    if (inputCode.length === 4) {
      // TODO: Implement actual linking via WebSocket
      setSessionCode(inputCode);
      setIsLinked(true);
    }
  };

  // Show user transcript and fade it out
  const showUserTranscript = (text: string) => {
    setUserTranscript(text);
    // Clear any existing timeout
    if (transcriptTimeoutRef.current) {
      clearTimeout(transcriptTimeoutRef.current);
    }
    // Fade out after 4 seconds
    transcriptTimeoutRef.current = window.setTimeout(() => {
      setUserTranscript(null);
    }, 4000);
  };

  const { isActive, interimTranscript, startPTT, stopPTT } = usePTT({
    onStart: () => {
      playSquelch();
      pttStart(currentFrequency);
      startInputMonitoring(); // Start VU meter for mic input
    },
    onEnd: (transcript) => {
      stopInputMonitoring(); // Stop VU meter
      playSquelch();
      pttEnd(currentFrequency, transcript);
      // Show user's final transcript in the display (will fade after 4s)
      if (transcript && transcript.trim()) {
        showUserTranscript(transcript);
      }
    },
  });

  // Listen for spacebar PTT events from App.tsx (desktop keyboard control)
  useEffect(() => {
    const handlePTTStart = () => {
      if (!isActive) {
        startPTT();
      }
    };
    const handlePTTEnd = () => {
      if (isActive) {
        stopPTT();
      }
    };

    window.addEventListener('ptt-start', handlePTTStart);
    window.addEventListener('ptt-end', handlePTTEnd);

    return () => {
      window.removeEventListener('ptt-start', handlePTTStart);
      window.removeEventListener('ptt-end', handlePTTEnd);
    };
  }, [isActive, startPTT, stopPTT]);

  // Character is listening if on voice channel
  const hasCharacter = broadcastType === 'voice' && characterCallsign;

  // Link screen
  if (!isLinked) {
    return (
      <div className="mobile-handset link-screen">
        <div className="handset-body">
          <div className="link-header">
            <div className="antenna-small" />
            <h1>FREQUENCY</h1>
            <p>HANDSET MODE</p>
          </div>

          <div className="link-content">
            <div className="link-icon">📡</div>
            <p>Enter the code shown on your desktop</p>

            <div className="code-input-group">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="code-input"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                maxLength={4}
                autoFocus
              />
            </div>

            <button
              className="link-button"
              onClick={handleLink}
              disabled={inputCode.length !== 4}
            >
              LINK TO BASE STATION
            </button>
          </div>

          <div className="link-footer">
            <p>Or scan the QR code on your desktop screen</p>
          </div>
        </div>
      </div>
    );
  }

  // Linked handset view
  return (
    <div className="mobile-handset">
      <div className="handset-body">
        {/* Antenna */}
        <div className="antenna-large" />

        {/* Speaker grille */}
        <div className="speaker-grille">
          <div className="grille-line" />
          <div className="grille-line" />
          <div className="grille-line" />
          <div className="grille-line" />
          <div className="grille-line" />
        </div>

        {/* CRT-style frequency display (mini version of radio) */}
        <div className="handset-crt-display">
          <div className="crt-inner">
            {/* Signal meter bar */}
            <div className="mini-signal-meter">
              <div
                className="signal-fill"
                style={{ width: `${(1 - staticLevel) * 100}%` }}
              />
            </div>

            {/* Frequency readout */}
            <div className="crt-freq-readout">
              <span className="crt-freq-value">{currentFrequency.toFixed(3)}</span>
              <span className="crt-freq-unit">MHz</span>
            </div>

            {/* Channel info */}
            <div className={`crt-channel-info ${!characterCallsign ? 'static' : ''}`}>
              {characterCallsign || '- - - STATIC - - -'}
            </div>

            {/* Status indicators */}
            <div className="crt-status-row">
              <span className={`crt-indicator ${isConnected ? 'on' : ''}`}>LINK</span>
              <span className={`crt-indicator ${hasCharacter ? 'on' : ''}`}>VOICE</span>
              <span className={`crt-indicator ${isActive ? 'on tx' : ''}`}>TX</span>
              <span className={`crt-indicator ${isCharacterThinking ? 'on rx' : ''}`}>RX</span>
            </div>

            {/* VU Meters */}
            <div className="crt-vu-meters">
              {/* Input VU - shows when transmitting */}
              <div className={`crt-vu-meter ${isActive ? 'active' : ''}`}>
                <span className="vu-label">TX</span>
                <div className="vu-bar">
                  {VU_SEGMENTS.map((threshold, i) => (
                    <div
                      key={i}
                      className={`vu-segment ${isActive && inputLevel >= threshold ? 'active' : ''} ${threshold > 0.7 ? 'hot' : ''}`}
                    />
                  ))}
                </div>
              </div>

              {/* Output VU - shows audio output level */}
              <div className={`crt-vu-meter ${isCharacterThinking ? 'active' : ''}`}>
                <span className="vu-label">RX</span>
                <div className="vu-bar">
                  {VU_SEGMENTS.map((threshold, i) => (
                    <div
                      key={i}
                      className={`vu-segment ${outputLevel >= threshold ? 'active' : ''} ${threshold > 0.7 ? 'hot' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Character response area */}
        {lastCharacterResponse && !isCharacterThinking && (
          <div className="handset-response">
            <span className="response-callsign">{characterCallsign}:</span>
            <span className="response-text">"{lastCharacterResponse.transcript.slice(0, 80)}..."</span>
          </div>
        )}

        {/* Giant PTT Button - always enabled */}
        <div className="ptt-area">
          <button
            className={`ptt-giant ${isActive ? 'active' : ''}`}
            onMouseDown={startPTT}
            onMouseUp={stopPTT}
            onMouseLeave={stopPTT}
            onTouchStart={(e) => { e.preventDefault(); startPTT(); }}
            onTouchEnd={stopPTT}
          >
            <div className="ptt-inner">
              <span className="ptt-label">PUSH TO TALK</span>
              <span className="ptt-sublabel">
                {isActive ? '● TRANSMITTING' : 'HOLD TO SPEAK'}
              </span>
            </div>
          </button>
        </div>

        {/* User transcript LED display - shows live when transmitting, final after release */}
        <div className={`user-transcript-display ${isActive || userTranscript ? 'visible' : ''} ${isActive ? 'transmitting' : ''}`}>
          <div className="transcript-led-text">
            {isActive ? (interimTranscript || '...listening...') : (userTranscript || '')}
          </div>
        </div>

        {/* Bottom info */}
        <div className="handset-footer">
          <div className="session-info">
            {embedded ? 'EMBEDDED MODE' : `SESSION: ${sessionCode}`}
          </div>
        </div>
      </div>
    </div>
  );
}
