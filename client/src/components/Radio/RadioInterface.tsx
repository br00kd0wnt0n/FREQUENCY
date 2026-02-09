import { useEffect, useState, useRef, useCallback } from 'react';
import { FrequencyDial } from './FrequencyDial';
import { PTTButton } from './PTTButton';
import { SignalMeter } from './SignalMeter';
import { useRadioStore } from '../../stores/radioStore';
import { useSocket } from '../../hooks/useSocket';
import { useDeviceStore } from '../../stores/deviceStore';

const MIN_FREQ = 26.000;
const MAX_FREQ = 32.000;

// Paranormal EMF interference effect
function useEMFInterference(isPoweredOn: boolean) {
  const [isGlitching, setIsGlitching] = useState(false);
  const [glitchIntensity, setGlitchIntensity] = useState<'light' | 'medium' | 'heavy'>('light');
  const timeoutRef = useRef<number | null>(null);

  const scheduleNext = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Random interval: 15-60 seconds between events
    const delay = 15000 + Math.random() * 45000;
    timeoutRef.current = window.setTimeout(() => {
      if (!isPoweredOn) {
        scheduleNext();
        return;
      }
      // Pick intensity: 60% light, 30% medium, 10% heavy
      const roll = Math.random();
      const intensity = roll < 0.6 ? 'light' : roll < 0.9 ? 'medium' : 'heavy';
      setGlitchIntensity(intensity);
      setIsGlitching(true);

      // Duration varies by intensity: 150-800ms
      const duration = intensity === 'light' ? 150 + Math.random() * 200
        : intensity === 'medium' ? 300 + Math.random() * 300
        : 500 + Math.random() * 300;

      setTimeout(() => {
        setIsGlitching(false);
        scheduleNext();
      }, duration);
    }, delay);
  }, [isPoweredOn]);

  useEffect(() => {
    scheduleNext();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [scheduleNext]);

  return { isGlitching, glitchIntensity };
}

interface RadioInterfaceProps {
  showPTT?: boolean;
  activeTuneButton?: 'up' | 'down' | null;
  outputLevel?: number;
  isPoweredOn?: boolean;
  onPowerToggle?: () => void;
}

export function RadioInterface({ showPTT = true, activeTuneButton = null, outputLevel = 0, isPoweredOn = false, onPowerToggle }: RadioInterfaceProps) {
  const {
    currentFrequency,
    broadcastType,
    label,
    characterCallsign,
    staticLevel,
    isScanning,
    isCharacterThinking,
  } = useRadioStore();

  const { tune, pttStart, pttEnd } = useSocket();
  const { isHandsetConnected } = useDeviceStore();
  const { isGlitching, glitchIntensity } = useEMFInterference(isPoweredOn);

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
      <div className={`radio-unit ${isPoweredOn ? 'powered-on' : 'powered-off'} ${isGlitching ? `emf-glitch emf-${glitchIntensity}` : ''}`}>
        {/* Top Bar: Power + Antenna + LEDs */}
        <div className="radio-top-bar">
          <button
            className={`power-button ${isPoweredOn ? 'on' : ''}`}
            onClick={onPowerToggle}
            title="Power"
          >
            <div className="power-led" />
            <span className="power-label">PWR</span>
          </button>

          <div className="antenna" />

          <div className={`led-row ${!isPoweredOn ? 'off' : ''}`}>
            <div className={`led ${broadcastType !== 'static' ? 'on' : ''}`} title="Signal" />
            <div className={`led ${isScanning ? 'amber' : ''}`} title="Scanning" />
            <div className={`led ${isCharacterThinking ? 'red' : ''}`} title="RX" />
            <div className={`led ${isHandsetConnected ? 'on' : ''}`} title="Handset" />
            <div className={`led ${canTalk ? 'on' : ''}`} title="Voice" />
          </div>
        </div>

        {/* CRT Display */}
        <div className={`crt-display ${!isPoweredOn ? 'off' : ''}`}>
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
          <div className={`frequency-readout ${isGlitching ? 'emf-freq-glitch' : ''}`}>
            <span className="frequency-value">
              {currentFrequency.toFixed(3)}
            </span>
            <span className="frequency-unit">MHz</span>
          </div>

          {/* Broadcast Info */}
          <div className={`broadcast-info ${broadcastType === 'static' ? 'static' : ''}`}>
            {getBroadcastLabel()}
          </div>

          {/* Meters Row */}
          <div className="meters-row">
            {/* Signal Meter */}
            <SignalMeter staticLevel={staticLevel} />

            {/* Output VU Meter */}
            <div className="vu-meter">
              <div className="vu-meter-label">VU</div>
              <div className="vu-bars">
                {[...Array(10)].map((_, i) => {
                  const threshold = (i + 1) / 10;
                  const isActive = outputLevel >= threshold;
                  const isHigh = i >= 7 && i < 9;
                  const isPeak = i >= 9;

                  return (
                    <div
                      key={i}
                      className={`vu-bar ${isActive ? 'active' : ''} ${isActive && isHigh ? 'high' : ''} ${isActive && isPeak ? 'peak' : ''}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Tuning Section */}
        <div className="tuning-section">
          <FrequencyDial
            currentFrequency={currentFrequency}
            onTune={handleTune}
            activeTuneButton={activeTuneButton}
          />
        </div>

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
