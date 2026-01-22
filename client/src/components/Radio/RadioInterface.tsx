import { FrequencyDial } from './FrequencyDial';
import { PTTButton } from './PTTButton';
import { SignalMeter } from './SignalMeter';
import { useRadioStore } from '../../stores/radioStore';
import { useSocket } from '../../hooks/useSocket';

const MIN_FREQ = 26.000;
const MAX_FREQ = 32.000;

export function RadioInterface() {
  const {
    currentFrequency,
    broadcastType,
    label,
    characterCallsign,
    staticLevel,
    isScanning,
    isCharacterThinking,
    lastCharacterResponse,
  } = useRadioStore();

  const { tune, pttStart, pttEnd } = useSocket();

  const handleTune = (frequency: number) => {
    tune(frequency);
  };

  const handlePTTStart = () => {
    pttStart(currentFrequency);
  };

  const handlePTTEnd = (transcript: string) => {
    pttEnd(currentFrequency, transcript);
  };

  const getBroadcastLabel = () => {
    if (characterCallsign) return characterCallsign;
    if (label) return label;
    if (broadcastType === 'morse') return 'MORSE SIGNAL';
    if (broadcastType === 'numbers') return 'NUMBERS STATION';
    if (broadcastType === 'ambient') return 'AMBIENT';
    return '- - - STATIC - - -';
  };

  // Calculate needle position as percentage
  const needlePosition = ((currentFrequency - MIN_FREQ) / (MAX_FREQ - MIN_FREQ)) * 100;

  const canTalk = broadcastType === 'voice' && characterCallsign;

  return (
    <div className="radio-interface">
      {/* Atmospheric Elements */}
      <div className="rain-overlay" />
      <div className="desktop-surface" />
      <div className="lamp-glow" />

      {/* The Radio Unit */}
      <div className="radio-unit">
        {/* Top Section with Antenna */}
        <div className="radio-top">
          <div className="antenna" />
        </div>

        {/* LED Indicators */}
        <div className="led-row">
          <div className={`led ${broadcastType !== 'static' ? 'on' : ''}`} />
          <div className={`led ${isScanning ? 'amber' : ''}`} />
          <div className={`led ${isCharacterThinking ? 'red' : ''}`} />
          <div className="led" />
          <div className={`led ${canTalk ? 'on' : ''}`} />
        </div>

        {/* CRT Display */}
        <div className="crt-display">
          {/* Horizontal Frequency Band */}
          <div className="frequency-band">
            <div className="frequency-scale">
              <span>26</span>
              <span>27</span>
              <span>28</span>
              <span>29</span>
              <span>30</span>
              <span>31</span>
              <span>32</span>
            </div>
            <div
              className="frequency-needle"
              style={{ left: `calc(${needlePosition}% - 1px)` }}
            />
          </div>

          {/* Frequency Readout */}
          <div className="frequency-readout">
            <span className="frequency-value">
              {currentFrequency.toFixed(3)}
            </span>
            <span className="frequency-unit">MHz</span>
          </div>

          {/* Broadcast Info */}
          <div className={`broadcast-info ${broadcastType === 'static' ? 'static' : ''}`}>
            {getBroadcastLabel()}
          </div>

          {/* Signal Meter */}
          <SignalMeter staticLevel={staticLevel} broadcastType={broadcastType} />
        </div>

        {/* Tuning Section */}
        <div className="tuning-section">
          <FrequencyDial
            currentFrequency={currentFrequency}
            onTune={handleTune}
          />
        </div>

        {/* Character Response Area */}
        {(lastCharacterResponse || isCharacterThinking) && (
          <div className="character-response">
            <div className="character-response-header">
              <span className="character-callsign">{characterCallsign}</span>
              {isCharacterThinking && (
                <span className="character-thinking">● TRANSMITTING...</span>
              )}
            </div>
            {lastCharacterResponse && !isCharacterThinking && (
              <div className="character-transcript">
                "{lastCharacterResponse.transcript}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mic Cable Visual */}
      <div className="mic-cable">
        <svg viewBox="0 0 60 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M30 0 Q20 30, 10 50 Q0 70, 15 85 Q25 95, 5 100"
            stroke="#222"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M30 0 Q20 30, 10 50 Q0 70, 15 85 Q25 95, 5 100"
            stroke="#333"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      {/* PTT Button */}
      <PTTButton
        disabled={!canTalk}
        onStart={handlePTTStart}
        onEnd={handlePTTEnd}
      />

      {/* Static Overlay */}
      <div className={`static-overlay ${staticLevel > 0.5 ? 'visible' : ''}`} />
    </div>
  );
}
