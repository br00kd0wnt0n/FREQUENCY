import { useState, useCallback, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useRadioStore } from '../../stores/radioStore';

interface FrequencyDialProps {
  currentFrequency: number;
  onTune: (frequency: number) => void;
  activeTuneButton?: 'up' | 'down' | null;
}

const STEP_FINE = 0.005;
const STEP_COARSE = 0.050;
const MIN_FREQUENCY = 26.000;
const MAX_FREQUENCY = 32.000;

export function FrequencyDial({ currentFrequency, onTune, activeTuneButton }: FrequencyDialProps) {
  const [scanSpeed] = useState<'slow' | 'fast'>('slow');
  const { startScan, stopScan } = useSocket();
  const { isScanning, setScanning, volume, setVolume } = useRadioStore();
  const knobRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startVolume = useRef(0);

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

  // Volume knob drag handlers
  const handleVolumeStart = useCallback((clientY: number) => {
    isDragging.current = true;
    startY.current = clientY;
    startVolume.current = volume;
  }, [volume]);

  const handleVolumeMove = useCallback((clientY: number) => {
    if (!isDragging.current) return;

    // Dragging up increases volume, dragging down decreases
    const deltaY = startY.current - clientY;
    const deltaVolume = deltaY / 150; // 150px drag = full volume range
    const newVolume = Math.max(0, Math.min(1, startVolume.current + deltaVolume));
    setVolume(newVolume);
  }, [setVolume]);

  const handleVolumeEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleVolumeStart(e.clientY);

    const handleMouseMove = (e: MouseEvent) => handleVolumeMove(e.clientY);
    const handleMouseUp = () => {
      handleVolumeEnd();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    handleVolumeStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleVolumeMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleVolumeEnd();
  };

  // Calculate knob rotation based on volume (0-270 degrees)
  const knobRotation = volume * 270 - 135;

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
        className={`tune-button ${activeTuneButton === 'down' ? 'active' : ''}`}
        onClick={() => adjustFrequency('down')}
        style={{ width: '40px', height: '40px', fontSize: '14px' }}
      >
        ◀
      </button>

      {/* Volume Knob */}
      <div
        ref={knobRef}
        className="main-tuning-knob volume-knob"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        title={`Volume: ${Math.round(volume * 100)}%`}
        style={{ cursor: 'ns-resize' }}
      >
        <div
          className="inner-ring"
          style={{ transform: `rotate(${knobRotation}deg)` }}
        >
          <div className="knob-indicator" />
        </div>
        <span className="volume-label">VOL</span>
      </div>

      {/* Fine Tune Up */}
      <button
        className={`tune-button ${activeTuneButton === 'up' ? 'active' : ''}`}
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
