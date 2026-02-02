import { useState } from 'react';

interface WelcomeOverlayProps {
  onDismiss: () => void;
}

export function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  const [fading, setFading] = useState(false);

  const handleDismiss = () => {
    setFading(true);
    setTimeout(onDismiss, 600);
  };

  return (
    <div className={`welcome-overlay ${fading ? 'fading' : ''}`}>
      <div className="welcome-panel">
        <div className="welcome-hero">
          <img src="/frequency-hero.png" alt="Radio equipment in a briefcase" />
          <div className="welcome-hero-fade" />
        </div>

        <div className="welcome-content">
          <h1 className="welcome-title">FREQUENCY</h1>
          <p className="welcome-tagline">
            Something is out there in the static. Voices. Signals. Secrets buried between the frequencies.
          </p>
          <p className="welcome-subtitle">
            A mystery told through radio waves. Tune in. Listen carefully. Trust no one.
          </p>

          <div className="welcome-steps">
            <div className="welcome-step">
              <span className="step-number">01</span>
              <div className="step-content">
                <span className="step-label">Power on the radio</span>
                <span className="step-hint">Click the PWR button to bring the set to life</span>
              </div>
            </div>
            <div className="welcome-step">
              <span className="step-number">02</span>
              <div className="step-content">
                <span className="step-label">Scan the static</span>
                <span className="step-hint">Use <kbd>&larr;</kbd> <kbd>&rarr;</kbd> arrow keys to sweep the dial for hidden signals</span>
              </div>
            </div>
            <div className="welcome-step">
              <span className="step-number">03</span>
              <div className="step-content">
                <span className="step-label">Make contact</span>
                <span className="step-hint">Hold <kbd>Space</kbd> to speak to whoever you find. Ask questions. Listen for clues.</span>
              </div>
            </div>
            <div className="welcome-step">
              <span className="step-number">04</span>
              <div className="step-content">
                <span className="step-label">Follow the signal</span>
                <span className="step-hint">Your notebook logs discoveries automatically. Piece together the mystery.</span>
              </div>
            </div>
          </div>

          <button className="welcome-enter" onClick={handleDismiss}>
            <span className="enter-text">BEGIN TRANSMISSION</span>
            <span className="enter-static">&#x2588;&#x2588;&#x2588;</span>
          </button>
        </div>
      </div>
    </div>
  );
}
