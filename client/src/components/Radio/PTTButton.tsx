import { usePTT } from '../../hooks/usePTT';
import { useAudioEngine } from '../../hooks/useAudioEngine';

interface PTTButtonProps {
  disabled?: boolean;
  onStart: () => void;
  onEnd: (transcript: string) => void;
}

export function PTTButton({ disabled, onStart, onEnd }: PTTButtonProps) {
  const { playSquelch } = useAudioEngine();

  const { isActive, startPTT, stopPTT } = usePTT({
    onStart: () => {
      playSquelch();
      onStart();
    },
    onEnd: (transcript) => {
      playSquelch();
      onEnd(transcript);
    },
    onError: (error) => {
      console.error('PTT Error:', error);
    },
  });

  const handlePTTStart = () => {
    if (disabled) return;
    startPTT();
  };

  const handlePTTEnd = () => {
    if (disabled) return;
    stopPTT();
  };

  return (
    <div className="ptt-container">
      <button
        className={`ptt-button ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        onMouseDown={handlePTTStart}
        onMouseUp={handlePTTEnd}
        onMouseLeave={handlePTTEnd}
        onTouchStart={handlePTTStart}
        onTouchEnd={handlePTTEnd}
        disabled={disabled}
      >
        <span className="ptt-label">PUSH TO TALK</span>
        <span className="ptt-status-text">
          {isActive ? '● TRANSMITTING' : 'HOLD TO SPEAK'}
        </span>
      </button>
      {!disabled && (
        <div className="ptt-hint">
          {isActive ? 'Release to send' : 'Press and hold to speak'}
        </div>
      )}
      {disabled && (
        <div className="ptt-hint">Tune to a voice frequency to talk</div>
      )}
    </div>
  );
}
