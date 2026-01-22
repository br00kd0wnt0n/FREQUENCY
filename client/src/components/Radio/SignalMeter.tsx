interface SignalMeterProps {
  staticLevel: number;
  broadcastType: string | null;
}

export function SignalMeter({ staticLevel, broadcastType }: SignalMeterProps) {
  // Calculate signal strength (inverse of static level)
  const signalStrength = 1 - staticLevel;
  const activeBars = Math.round(signalStrength * 10);

  return (
    <div className="signal-meter">
      <div className="signal-meter-label">SIG</div>
      <div className="signal-bars">
        {[...Array(10)].map((_, i) => {
          const isActive = i < activeBars;
          const isHigh = i >= 7 && i < 9;
          const isPeak = i >= 9;

          return (
            <div
              key={i}
              className={`signal-bar ${isActive ? 'active' : ''} ${isActive && isHigh ? 'high' : ''} ${isActive && isPeak ? 'peak' : ''}`}
            />
          );
        })}
      </div>
    </div>
  );
}
