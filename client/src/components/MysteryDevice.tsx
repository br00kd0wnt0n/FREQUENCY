import { useEffect, useRef } from 'react';

// Fragments of garbled text that flash on screen
const GLITCH_FRAGMENTS = [
  '0x7F 0x3A 0x91',
  '██████████',
  '> _',
  'ERR::SIGNAL_LOST',
  '▓▓▒▒░░▒▒▓▓',
  '????.???',
  '// LOCKED //',
  '░░░░░░░░░░',
  'SYS.FAULT',
  '>>> ···',
  'NO CARRIER',
  '▒▒▒▒▒▒▒▒▒▒',
  '::::::::::',
  '##########',
  '> INIT...',
  '????????',
  'FREQ: ---.---',
  '▓░▓░▓░▓░▓░',
  '0000000000',
  'SYNC FAIL',
  '||||||||||',
  'RX OVERFLOW',
  '~~~~~~~~~~',
  '> ACCESS DENIED',
  '············',
];

export function MysteryDevice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  // Static/noise canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = 350;
    canvas.height = 100;

    let lastTime = 0;
    const fps = 14;
    const frameInterval = 1000 / fps;

    const drawFrame = (timestamp: number) => {
      const elapsed = timestamp - lastTime;

      if (elapsed >= frameInterval) {
        lastTime = timestamp - (elapsed % frameInterval);
        const t = timestamp / 1000;

        // Decide what to show — cycle through states
        const phase = Math.sin(t * 0.3) + Math.sin(t * 0.17);

        // Dark green base
        ctx.fillStyle = '#020a06';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (phase > 1.2) {
          // Brief power flicker — mostly black with faint green pulse
          const pulse = Math.sin(t * 8) * 0.1 + 0.05;
          ctx.fillStyle = `rgba(0, 180, 80, ${pulse})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Single crawling scanline
          const scanY = (timestamp * 0.04) % canvas.height;
          ctx.fillStyle = 'rgba(0, 255, 120, 0.08)';
          ctx.fillRect(0, scanY, canvas.width, 2);
        } else if (phase < -1.0) {
          // Heavy static burst — bright green noise
          const imageData = ctx.createImageData(canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 100;
            data[i] = noise * 0.15;
            data[i + 1] = noise;
            data[i + 2] = noise * 0.3;
            data[i + 3] = 200;
          }
          ctx.putImageData(imageData, 0, 0);
        } else {
          // Normal glitchy state — dark with noise bands and faint glow
          // Ambient green glow
          const glow = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 10,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.6
          );
          glow.addColorStop(0, 'rgba(0, 80, 40, 0.12)');
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Horizontal noise bands
          const bandCount = 1 + Math.floor(Math.random() * 4);
          for (let b = 0; b < bandCount; b++) {
            const y = Math.random() * canvas.height;
            const h = 1 + Math.random() * 6;
            const imageData = ctx.createImageData(canvas.width, Math.ceil(h));
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              const noise = Math.random() * 70;
              data[i] = noise * 0.1;
              data[i + 1] = noise * 0.9;
              data[i + 2] = noise * 0.3;
              data[i + 3] = 150;
            }
            ctx.putImageData(imageData, 0, y);
          }

          // Moving scanline
          const scanY = (timestamp * 0.03) % canvas.height;
          ctx.fillStyle = 'rgba(0, 200, 100, 0.06)';
          ctx.fillRect(0, scanY, canvas.width, 1);
          ctx.fillStyle = 'rgba(0, 255, 120, 0.03)';
          ctx.fillRect(0, scanY + 1, canvas.width, 1);

          // Occasional horizontal tear
          if (Math.random() < 0.15) {
            const tearY = Math.random() * canvas.height;
            const tearH = Math.min(10, 2 + Math.random() * 8);
            const maxTearY = canvas.height - tearH;
            if (tearY < maxTearY) {
              const tearData = ctx.getImageData(0, tearY, canvas.width, tearH);
              const tearOffset = (Math.random() - 0.5) * 30;
              ctx.putImageData(tearData, tearOffset, tearY);
            }
          }

          // Random bright pixel clusters (like dead pixels / signal fragments)
          if (Math.random() < 0.3) {
            const px = Math.random() * canvas.width;
            const py = Math.random() * canvas.height;
            ctx.fillStyle = `rgba(0, ${150 + Math.random() * 105}, ${50 + Math.random() * 80}, ${0.3 + Math.random() * 0.4})`;
            ctx.fillRect(px, py, 1 + Math.random() * 3, 1);
          }
        }

        // CRT curvature vignette
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, canvas.width * 0.25,
          canvas.width / 2, canvas.height / 2, canvas.width * 0.65
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animFrameRef.current = requestAnimationFrame(drawFrame);
    };

    animFrameRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Glitch text that randomly appears
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    let timeout: number;

    const showGlitch = () => {
      if (Math.random() < 0.5) {
        const frag = GLITCH_FRAGMENTS[Math.floor(Math.random() * GLITCH_FRAGMENTS.length)];
        el.textContent = frag;
        el.style.opacity = (0.3 + Math.random() * 0.5).toString();
        el.style.top = `${15 + Math.random() * 60}%`;
        el.style.left = `${8 + Math.random() * 40}%`;

        setTimeout(() => {
          el.style.opacity = '0';
        }, 80 + Math.random() * 300);
      }

      timeout = window.setTimeout(showGlitch, 400 + Math.random() * 2500);
    };

    timeout = window.setTimeout(showGlitch, 1500);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="mystery-device">
      <div className="mystery-device-housing">
        {/* Top screws */}
        <div className="mystery-screws top">
          <div className="mystery-screw" />
          <div className="mystery-screw" />
        </div>

        {/* Label plate */}
        <div className="mystery-label-plate">
          <span className="mystery-label-text">UNIT-X /// STATUS: UNKNOWN</span>
        </div>

        {/* CRT screen */}
        <div className="mystery-crt-bezel">
          <div className="mystery-crt">
            <canvas ref={canvasRef} className="mystery-canvas" />
            <div ref={textRef} className="mystery-glitch-text" />
            <div className="mystery-scanlines" />
          </div>
        </div>

        {/* Controls row */}
        <div className="mystery-controls-row">
          <div className="mystery-knob-group">
            <div className="mystery-knob" />
            <span className="mystery-knob-label">???</span>
          </div>
          <div className="mystery-indicator-strip">
            <div className="mystery-led dead" />
            <div className="mystery-led dead flicker" />
            <div className="mystery-led dead" />
          </div>
          <div className="mystery-knob-group">
            <div className="mystery-knob" />
            <span className="mystery-knob-label">???</span>
          </div>
        </div>

        {/* Bottom screws */}
        <div className="mystery-screws bottom">
          <div className="mystery-screw" />
          <div className="mystery-screw" />
        </div>
      </div>
    </div>
  );
}
