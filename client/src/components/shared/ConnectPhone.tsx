interface ConnectPhoneProps {
  sessionCode: string;
  onClose: () => void;
}

export function ConnectPhone({ sessionCode, onClose }: ConnectPhoneProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="connect-phone-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="modal-header">
          <h2>Connect Your Phone</h2>
          <p>Use your phone as a radio handset</p>
        </div>

        <div className="modal-content">
          <div className="connect-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <p>Open this URL on your phone:</p>
              <div className="url-display">
                {typeof window !== 'undefined' && window.location.origin}
              </div>
            </div>
          </div>

          <div className="connect-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <p>Enter this code:</p>
              <div className="session-code-display">
                {sessionCode.split('').map((digit, i) => (
                  <span key={i} className="code-digit">{digit}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="connect-divider">
            <span>or</span>
          </div>

          <div className="qr-section">
            <div className="qr-placeholder">
              {/* QR code would go here */}
              <div className="qr-code">
                <svg viewBox="0 0 100 100" className="qr-svg">
                  <rect x="10" y="10" width="25" height="25" fill="currentColor" />
                  <rect x="65" y="10" width="25" height="25" fill="currentColor" />
                  <rect x="10" y="65" width="25" height="25" fill="currentColor" />
                  <rect x="40" y="40" width="20" height="20" fill="currentColor" />
                  <rect x="15" y="15" width="15" height="15" fill="var(--bg-primary)" />
                  <rect x="70" y="15" width="15" height="15" fill="var(--bg-primary)" />
                  <rect x="15" y="70" width="15" height="15" fill="var(--bg-primary)" />
                  <rect x="18" y="18" width="9" height="9" fill="currentColor" />
                  <rect x="73" y="18" width="9" height="9" fill="currentColor" />
                  <rect x="18" y="73" width="9" height="9" fill="currentColor" />
                </svg>
              </div>
              <p>Scan with your phone camera</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <p>Your phone becomes a walkie-talkie handset for push-to-talk</p>
        </div>
      </div>
    </div>
  );
}
