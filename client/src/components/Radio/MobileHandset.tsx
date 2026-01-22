import { useState, useEffect } from 'react';
import { useRadioStore } from '../../stores/radioStore';
import { useSocket } from '../../hooks/useSocket';
import { usePTT } from '../../hooks/usePTT';
import { useAudioEngine } from '../../hooks/useAudioEngine';

export function MobileHandset() {
  const [sessionCode, setSessionCode] = useState('');
  const [isLinked, setIsLinked] = useState(false);
  const [inputCode, setInputCode] = useState('');

  const {
    currentFrequency,
    broadcastType,
    characterCallsign,
    isCharacterThinking,
    lastCharacterResponse,
  } = useRadioStore();

  const { connect, isConnected, pttStart, pttEnd } = useSocket();
  const { playSquelch } = useAudioEngine();

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

  const { isActive, startPTT, stopPTT } = usePTT({
    onStart: () => {
      playSquelch();
      pttStart(currentFrequency);
    },
    onEnd: (transcript) => {
      playSquelch();
      pttEnd(currentFrequency, transcript);
    },
  });

  const canTalk = broadcastType === 'voice' && characterCallsign;

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

        {/* Frequency display */}
        <div className="handset-display">
          <div className="display-inner">
            <div className="freq-readout">
              <span className="freq-value">{currentFrequency.toFixed(3)}</span>
              <span className="freq-unit">MHz</span>
            </div>
            <div className={`channel-info ${!characterCallsign ? 'static' : ''}`}>
              {characterCallsign || '- - - STATIC - - -'}
            </div>
            {isCharacterThinking && (
              <div className="rx-indicator">● RX</div>
            )}
          </div>
        </div>

        {/* Status LEDs */}
        <div className="handset-leds">
          <div className={`led ${isConnected ? 'on green' : ''}`} />
          <div className={`led ${isLinked ? 'on green' : ''}`} />
          <div className={`led ${isActive ? 'on red' : ''}`} />
        </div>

        {/* Character response (small) */}
        {lastCharacterResponse && !isCharacterThinking && (
          <div className="handset-transcript">
            <span className="callsign">{characterCallsign}:</span>
            <span className="text">"{lastCharacterResponse.transcript.slice(0, 100)}..."</span>
          </div>
        )}

        {/* Giant PTT Button */}
        <div className="ptt-area">
          <button
            className={`ptt-giant ${isActive ? 'active' : ''} ${!canTalk ? 'disabled' : ''}`}
            onMouseDown={canTalk ? startPTT : undefined}
            onMouseUp={canTalk ? stopPTT : undefined}
            onMouseLeave={canTalk ? stopPTT : undefined}
            onTouchStart={canTalk ? (e) => { e.preventDefault(); startPTT(); } : undefined}
            onTouchEnd={canTalk ? stopPTT : undefined}
            disabled={!canTalk}
          >
            <div className="ptt-inner">
              <span className="ptt-label">PTT</span>
              <span className="ptt-sublabel">
                {isActive ? 'TRANSMITTING' : 'PUSH TO TALK'}
              </span>
            </div>
          </button>

          {!canTalk && (
            <div className="ptt-disabled-hint">
              Tune to a voice channel on desktop
            </div>
          )}
        </div>

        {/* Bottom info */}
        <div className="handset-footer">
          <div className="session-info">
            SESSION: {sessionCode}
          </div>
        </div>
      </div>
    </div>
  );
}
