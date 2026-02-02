import { useEffect, useRef } from 'react';

// Fragments of garbled text that flash on screen - nothing recognizable
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
  const timeRef = useRef(0);

  // Static/noise canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 240;
    canvas.height = 160;

    let lastTime = 0;
    const fps = 12; // Slow, glitchy framerate
    const frameInterval = 1000 / fps;

    const drawFrame = (timestamp: number) => {
      const elapsed = timestamp - lastTime;

      if (elapsed >= frameInterval) {
        lastTime = timestamp - (elapsed % frameInterval);
        timeRef.current = timestamp;

        const t = timestamp / 1000;

        // Decide what to show this frame
        const phase = Math.sin(t * 0.3) + Math.sin(t * 0.17);

        if (phase > 1.2) {
          // Brief moment of near-blackness (device powering down)
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Faint scanline
          const scanY = (timestamp * 0.05) % canvas.height;
          ctx.fillStyle = 'rgba(0, 80, 60, 0.15)';
          ctx.fillRect(0, scanY, canvas.width, 2);
        } else if (phase < -1.0) {
          // Heavy static burst
          const imageData = ctx.createImageData(canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 60;
            data[i] = noise * 0.3;     // R - slight green tint
            data[i + 1] = noise;        // G
            data[i + 2] = noise * 0.5;  // B
            data[i + 3] = 180;          // A
          }
          ctx.putImageData(imageData, 0, 0);
        } else {
          // Normal glitchy state - dark with occasional noise bands
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Horizontal noise bands
          const bandCount = Math.floor(Math.random() * 3);
          for (let b = 0; b < bandCount; b++) {
            const y = Math.random() * canvas.height;
            const h = 1 + Math.random() * 4;
            const imageData = ctx.createImageData(canvas.width, Math.ceil(h));
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              const noise = Math.random() * 40;
              data[i] = noise * 0.2;
              data[i + 1] = noise * 0.8;
              data[i + 2] = noise * 0.4;
              data[i + 3] = 120;
            }
            ctx.putImageData(imageData, 0, y);
          }

          // Moving scanline
          const scanY = (timestamp * 0.03) % canvas.height;
          ctx.fillStyle = 'rgba(0, 120, 80, 0.08)';
          ctx.fillRect(0, scanY, canvas.width, 1);

          // Occasional horizontal tear
          if (Math.random() < 0.1) {
            const tearY = Math.random() * canvas.height;
            const tearH = 2 + Math.random() * 8;
            const tearOffset = (Math.random() - 0.5) * 20;
            const tearData = ctx.getImageData(0, tearY, canvas.width, tearH);
            ctx.putImageData(tearData, tearOffset, tearY);
          }
        }

        // CRT curvature vignette
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
          canvas.width / 2, canvas.height / 2, canvas.width * 0.7
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animFrameRef.current = requestAnimationFrame(drawFrame);
    };

    animFrameRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Glitch text that randomly appears and changes
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    let timeout: number;

    const showGlitch = () => {
      // Random chance of showing text
      if (Math.random() < 0.4) {
        const frag = GLITCH_FRAGMENTS[Math.floor(Math.random() * GLITCH_FRAGMENTS.length)];
        el.textContent = frag;
        el.style.opacity = (0.15 + Math.random() * 0.4).toString();
        el.style.top = `${10 + Math.random() * 70}%`;
        el.style.left = `${5 + Math.random() * 30}%`;

        // Clear after brief flash
        setTimeout(() => {
          el.style.opacity = '0';
        }, 100 + Math.random() * 400);
      }

      // Schedule next glitch at random interval
      timeout = window.setTimeout(showGlitch, 500 + Math.random() * 3000);
    };

    timeout = window.setTimeout(showGlitch, 2000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="mystery-device">
      <div className="mystery-device-frame">
        <div className="mystery-device-label">
          <span>???</span>
        </div>
        <div className="mystery-crt">
          <canvas ref={canvasRef} className="mystery-canvas" />
          <div ref={textRef} className="mystery-glitch-text" />
          <div className="mystery-crt-overlay" />
        </div>
        <div className="mystery-controls">
          <div className="mystery-knob disabled" />
          <div className="mystery-led off" />
          <div className="mystery-knob disabled" />
        </div>
      </div>
    </div>
  );
}
