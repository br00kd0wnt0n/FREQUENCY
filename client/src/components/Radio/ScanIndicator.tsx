interface ScanIndicatorProps {
  isScanning: boolean;
  direction: 'up' | 'down' | null;
}

export function ScanIndicator({ isScanning, direction }: ScanIndicatorProps) {
  if (!isScanning) return null;

  return (
    <div className="scan-indicator-display">
      <span className="scan-arrow">
        {direction === 'up' ? '▲' : '▼'}
      </span>
      <span className="scan-text">SCANNING</span>
    </div>
  );
}
