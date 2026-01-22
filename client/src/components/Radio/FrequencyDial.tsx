import { useState, useCallback } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useRadioStore } from '../../stores/radioStore';

interface FrequencyDialProps {
  currentFrequency: number;
  onTune: (frequency: number) => void;
}

const STEP_FINE = 0.005;
const STEP_COARSE = 0.050;
const MIN_FREQUENCY = 26.000;
const MAX_FREQUENCY = 32.000;

export function FrequencyDial({ currentFrequency, onTune }: FrequencyDialProps) {
  const [scanSpeed, setScanSpeed] = useState<'slow' | 'fast'>('slow');
  const { startScan, stopScan } = useSocket();
  const { isScanning, setScanning } = useRadioStore();

  const adjustFrequency = useCallback(
    (direction: 'up' | 'down', coarse = false) => {
      const step = coarse ? STEP_COARSE : STEP_FINE;
      let newFreq = direction === 'up'
        ? currentFrequency + step
        : currentFrequency - step;

      // Wrap around
      if (newFreq > MAX_FREQUENCY) newFreq = MIN_FREQUENCY;
      if (newFreq < MIN_FREQUENCY) newFreq = MAX_FREQUENCY;

      onTune(Math.round(newFreq * 1000) / 1000);
    },
    [currentFrequency, onTune]
  );

  const handleScanStart = useCallback(
    (direction: 'up' | 'down') => {
      setScanning(true, direction);
      startScan(direction, scanSpeed);
    },
    [startScan, scanSpeed, setScanning]
  );

  const handleScanStop = useCallback(() => {
    setScanning(false);
    stopScan();
  }, [stopScan, setScanning]);

  return (
    <>
      {/* Scan Down Button */}
      <button
        className={`tune-button ${isScanning ? 'scanning' : ''}`}
        onMouseDown={() => handleScanStart('down')}
        onMouseUp={handleScanStop}
        onMouseLeave={handleScanStop}
        onTouchStart={(e) => { e.preventDefault(); handleScanStart('down'); }}
        onTouchEnd={handleScanStop}
      >
        ◀◀
      </button>

      {/* Fine Tune Down */}
      <button
        className="tune-button"
        onClick={() => adjustFrequency('down')}
        style={{ width: '40px', height: '40px', fontSize: '14px' }}
      >
        ◀
      </button>

      {/* Main Tuning Knob */}
      <div className="main-tuning-knob">
        <div className="inner-ring" />
      </div>

      {/* Fine Tune Up */}
      <button
        className="tune-button"
        onClick={() => adjustFrequency('up')}
        style={{ width: '40px', height: '40px', fontSize: '14px' }}
      >
        ▶
      </button>

      {/* Scan Up Button */}
      <button
        className={`tune-button ${isScanning ? 'scanning' : ''}`}
        onMouseDown={() => handleScanStart('up')}
        onMouseUp={handleScanStop}
        onMouseLeave={handleScanStop}
        onTouchStart={(e) => { e.preventDefault(); handleScanStart('up'); }}
        onTouchEnd={handleScanStop}
      >
        ▶▶
      </button>
    </>
  );
}
