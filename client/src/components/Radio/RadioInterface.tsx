import { FrequencyDial } from './FrequencyDial';
import { PTTButton } from './PTTButton';
import { SignalMeter } from './SignalMeter';
import { useRadioStore } from '../../stores/radioStore';
import { useSocket } from '../../hooks/useSocket';
import { useDeviceStore } from '../../stores/deviceStore';

const MIN_FREQ = 26.000;
const MAX_FREQ = 32.000;

interface RadioInterfaceProps {
  showPTT?: boolean;
  activeTuneButton?: 'up' | 'down' | null;
}

export function RadioInterface({ showPTT = true, activeTuneButton = null }: RadioInterfaceProps) {
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
  const { isHandsetConnected } = useDeviceStore();

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
      {/* The Radio Unit */}
      <div className="radio-unit">
        {/* Top Section with Antenna */}
        <div className="radio-top">
          <div className="antenna" />
        </div>

        {/* LED Indicators */}
        <div className="led-row">
          <div className={`led ${broadcastType !== 'static' ? 'on' : ''}`} title="Signal" />
          <div className={`led ${isScanning ? 'amber' : ''}`} title="Scanning" />
          <div className={`led ${isCharacterThinking ? 'red' : ''}`} title="RX" />
          <div className={`led ${isHandsetConnected ? 'on' : ''}`} title="Handset" />
          <div className={`led ${canTalk ? 'on' : ''}`} title="Voice" />
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
          <SignalMeter staticLevel={staticLevel} />
        </div>

        {/* Tuning Section */}
        <div className="tuning-section">
          <FrequencyDial
            currentFrequency={currentFrequency}
            onTune={handleTune}
            activeTuneButton={activeTuneButton}
          />
        </div>

        {/* Character Response Area */}
        {(lastCharacterResponse || isCharacterThinking) && (
          <div className="character-response">
            <div className="character-response-header">
              <span className="character-callsign">{characterCallsign}</span>
              {isCharacterThinking && (
                <span className="character-thinking">● RECEIVING...</span>
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

      {/* PTT Button - only shown if showPTT is true */}
      {showPTT && (
        <>
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

          <PTTButton
            disabled={!canTalk}
            onStart={handlePTTStart}
            onEnd={handlePTTEnd}
          />
        </>
      )}

      {/* Static Overlay */}
      <div className={`static-overlay ${staticLevel > 0.5 ? 'visible' : ''}`} />
    </div>
  );
}
