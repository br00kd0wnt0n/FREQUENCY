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
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const chatLogRef = useRef<HTMLDivElement>(null);
  const lastResponseIdRef = useRef<string | null>(null);

  const {
    currentFrequency,
    broadcastType,
    characterCallsign,
    staticLevel,
    isCharacterThinking,
    lastCharacterResponse,
    conversationLog,
    addConversationMessage,
  } = useRadioStore();

  const { connect, isConnected, pttStart, pttEnd } = useSocket();
  const { playSquelch, inputLevel, outputLevel, startInputMonitoring, stopInputMonitoring } = useAudioEngine();

  useEffect(() => {
    connect();
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('session');
    if (code) {
      setInputCode(code.toUpperCase());
    }
  }, [connect]);

  const handleLink = () => {
    if (inputCode.length === 4) {
      setSessionCode(inputCode);
      setIsLinked(true);
    }
  };

  // Auto-scroll chat log
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [conversationLog, isCharacterThinking]);

  const { isActive, interimTranscript, startPTT, stopPTT } = usePTT({
    onStart: () => {
      playSquelch();
      pttStart(currentFrequency);
      startInputMonitoring();
    },
    onEnd: (transcript, audioBase64) => {
      stopInputMonitoring();
      playSquelch();
      pttEnd(currentFrequency, transcript, audioBase64);
      // If we got a client-side transcript, add it to chat immediately
      if (transcript && transcript.trim()) {
        addConversationMessage('user', 'YOU', transcript);
      }
      // If no transcript but audio was sent, server will transcribe with Whisper
    },
  });

  // Listen for spacebar PTT events from App.tsx (desktop keyboard control)
  useEffect(() => {
    const handlePTTStart = () => {
      if (!isActive) startPTT();
    };
    const handlePTTEnd = () => {
      if (isActive) stopPTT();
    };
    window.addEventListener('ptt-start', handlePTTStart);
    window.addEventListener('ptt-end', handlePTTEnd);
    return () => {
      window.removeEventListener('ptt-start', handlePTTStart);
      window.removeEventListener('ptt-end', handlePTTEnd);
    };
  }, [isActive, startPTT, stopPTT]);

  // Listen for character responses - add to chat log
  // Also add user message if we haven't already (fallback for when transcription event is missed)
  const lastUserMessageRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lastCharacterResponse) return;
    const responseId = lastCharacterResponse.characterId + lastCharacterResponse.transcript;
    if (responseId === lastResponseIdRef.current) return;
    lastResponseIdRef.current = responseId;

    // If the character is responding but we never showed the user's message,
    // check if we need to add a placeholder
    const hasRecentUserMessage = conversationLog.some(
      m => m.role === 'user' && Date.now() - m.timestamp < 15000
    );
    if (!hasRecentUserMessage && lastUserMessageRef.current) {
      // We missed showing the user message - this shouldn't happen often
      addConversationMessage('user', 'YOU', lastUserMessageRef.current);
    }

    // Use callsign from response (not store state which may have changed if user tuned away)
    const responseCallsign = lastCharacterResponse.characterCallsign || characterCallsign || 'UNKNOWN';
    addConversationMessage('character', responseCallsign, lastCharacterResponse.transcript);
  }, [lastCharacterResponse, characterCallsign, addConversationMessage]);

  // Handle text input submission
  const handleTextSubmit = () => {
    if (!textInputValue.trim()) return;
    playSquelch();
    pttStart(currentFrequency);
    const text = textInputValue.trim();
    setTimeout(() => {
      playSquelch();
      pttEnd(currentFrequency, text);
      addConversationMessage('user', 'YOU', text);
      setTextInputValue('');
      setShowTextInput(false);
    }, 100);
  };

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
            <button className="link-button" onClick={handleLink} disabled={inputCode.length !== 4}>
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

        {/* CRT-style frequency display */}
        <div className="handset-crt-display">
          <div className="crt-inner">
            <div className="mini-signal-meter">
              <div className="signal-fill" style={{ width: `${(1 - staticLevel) * 100}%` }} />
            </div>
            <div className="crt-freq-readout">
              <span className="crt-freq-value">{currentFrequency.toFixed(3)}</span>
              <span className="crt-freq-unit">MHz</span>
            </div>
            <div className={`crt-channel-info ${!characterCallsign ? 'static' : ''}`}>
              {characterCallsign || '- - - STATIC - - -'}
            </div>
            <div className="crt-status-row">
              <span className={`crt-indicator ${isConnected ? 'on' : ''}`}>LINK</span>
              <span className={`crt-indicator ${hasCharacter ? 'on' : ''}`}>VOICE</span>
              <span className={`crt-indicator ${isActive ? 'on tx' : ''}`}>TX</span>
              <span className={`crt-indicator ${isCharacterThinking ? 'on rx' : ''}`}>RX</span>
            </div>
            <div className="crt-vu-meters">
              <div className={`crt-vu-meter ${isActive ? 'active' : ''}`}>
                <span className="vu-label">TX</span>
                <div className="vu-bar">
                  {VU_SEGMENTS.map((threshold, i) => (
                    <div key={i} className={`vu-segment ${isActive && inputLevel >= threshold ? 'active' : ''} ${threshold > 0.7 ? 'hot' : ''}`} />
                  ))}
                </div>
              </div>
              <div className={`crt-vu-meter ${isCharacterThinking ? 'active' : ''}`}>
                <span className="vu-label">RX</span>
                <div className="vu-bar">
                  {VU_SEGMENTS.map((threshold, i) => (
                    <div key={i} className={`vu-segment ${outputLevel >= threshold ? 'active' : ''} ${threshold > 0.7 ? 'hot' : ''}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat log - scrollable conversation history */}
        <div className="chat-log" ref={chatLogRef}>
          {conversationLog.length === 0 && !isActive && (
            <div className="chat-empty">
              {hasCharacter
                ? `${characterCallsign} is listening. Hold to talk.`
                : 'Tune to a voice frequency to talk.'}
            </div>
          )}
          {conversationLog.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.role}`}>
              <span className="chat-callsign">{msg.callsign}:</span>
              <span className="chat-text">{msg.text}</span>
            </div>
          ))}
          {isCharacterThinking && (
            <div className="chat-message character thinking">
              <span className="chat-callsign">{characterCallsign}:</span>
              <span className="chat-text thinking-dots">...</span>
            </div>
          )}
          {isActive && (
            <div className="chat-message user transmitting">
              <span className="chat-callsign">YOU:</span>
              <span className="chat-text">{interimTranscript || '● Recording...'}</span>
            </div>
          )}
        </div>

        {/* PTT Button */}
        <div className="ptt-area">
          {showTextInput ? (
            <div className="text-input-area">
              <input
                type="text"
                className="text-input-field"
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                placeholder="Type your message..."
                autoFocus
              />
              <div className="text-input-buttons">
                <button className="text-send-btn" onClick={handleTextSubmit} disabled={!textInputValue.trim()}>
                  SEND
                </button>
                <button className="text-cancel-btn" onClick={() => { setShowTextInput(false); setTextInputValue(''); }}>
                  CANCEL
                </button>
              </div>
            </div>
          ) : (
            <>
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
              <button className="text-fallback-btn" onClick={() => setShowTextInput(true)}>
                TYPE INSTEAD
              </button>
            </>
          )}
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
