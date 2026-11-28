import { useEffect, useRef, type CSSProperties } from 'react';

export type OrbMood = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Props {
  mood?: OrbMood;
  /** Live microphone level, 0..1 (only used while listening). */
  level?: number;
  size?: number;
  onClick?: () => void;
}

const RIBBONS = 44;
const STEPS = 120;

function colorAt(t: number): [number, number, number] {
  const w = ((t % 1) + 1) % 1;
  let r = 0;
  let g = 0;
  let b = 0;
  if (w < 0.28) {
    const k = w / 0.28;
    r = 255 * (1 - k) + 255 * k;
    g = 178 * (1 - k) + 56 * k;
    b = 72 * (1 - k) + 148 * k;
  } else if (w < 0.62) {
    const k = (w - 0.28) / 0.34;
    r = 255 * (1 - k) + 139 * k;
    g = 56 * (1 - k) + 92 * k;
    b = 148 * (1 - k) + 246 * k;
  } else if (w < 0.84) {
    const k = (w - 0.62) / 0.22;
    r = 139 * (1 - k) + 96 * k;
    g = 92 * (1 - k) + 165 * k;
    b = 246 * (1 - k) + 250 * k;
  } else {
    const k = (w - 0.84) / 0.16;
    r = 96 * (1 - k) + 255 * k;
    g = 165 * (1 - k) + 178 * k;
    b = 250 * (1 - k) + 72 * k;
  }
  return [Math.round(r), Math.round(g), Math.round(b)];
}

/**
 * 60fps sculpted 3D iridescent voice sphere: soft glowing subsurface lobes + 44 tightly-woven
 * harmonic contour strands hugging a deep velvet obsidian interior, matching the reference Dola orb.
 */
export default function Orb({ mood = 'idle', level = 0, size = 196, onClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moodRef = useRef<OrbMood>(mood);
  const levelRef = useRef(level);
  const smoothLevel = useRef(0);

  moodRef.current = mood;
  levelRef.current = level;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof requestAnimationFrame !== 'function' || /jsdom/i.test(navigator.userAgent)) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const dim = Math.round(size * 1.18);
    canvas.width = dim * dpr;
    canvas.height = dim * dpr;

    let raf = 0;
    const t0 = performance.now();

    const draw = (now: number) => {
      if (!ctx) return;
      const m = moodRef.current;
      const targetLvl = m === 'listening' ? Math.min(1, Math.max(0, levelRef.current) * 2.4) : m === 'speaking' ? 0.35 : m === 'thinking' ? 0.28 : 0;
      smoothLevel.current += (targetLvl - smoothLevel.current) * 0.16;

      const speed = m === 'thinking' ? 2.0 : m === 'listening' ? 1.45 : m === 'speaking' ? 1.25 : 0.6;
      const t = reduce ? 1.7 : ((now - t0) / 1000) * speed;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, dim, dim);

      const cx = dim / 2;
      const cy = dim / 2;
      const baseR = size * 0.42 * (1 + smoothLevel.current * 0.07);
      const dispAmp = (m === 'thinking' ? 0.145 : 0.12) + smoothLevel.current * 0.12;

      // 1. Deep velvet obsidian sphere foundation
      const coreGrad = ctx.createRadialGradient(cx, cy, baseR * 0.08, cx, cy, baseR * 1.04);
      coreGrad.addColorStop(0, '#04020a');
      coreGrad.addColorStop(0.55, '#0b0518');
      coreGrad.addColorStop(0.88, '#1a0a2e');
      coreGrad.addColorStop(1, 'rgba(12, 5, 24, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.04, 0, Math.PI * 2);
      ctx.fill();

      // 2. Sculpted iridescent crescent blooms orbiting inside the silhouette (soft liquid volume)
      ctx.globalCompositeOperation = 'screen';
      const lobes = [
        { ang: t * 0.55 - 1.2, dist: 0.46, col: 'rgba(255, 166, 72, 0.55)', rad: 0.72 },
        { ang: t * 0.45 + 1.1, dist: 0.5, col: 'rgba(236, 72, 153, 0.5)', rad: 0.75 },
        { ang: t * 0.35 + 3.0, dist: 0.48, col: 'rgba(124, 58, 237, 0.58)', rad: 0.78 },
        { ang: -t * 0.4 + 2.1, dist: 0.42, col: 'rgba(244, 63, 94, 0.38)', rad: 0.62 },
      ];
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.02, 0, Math.PI * 2);
      ctx.clip();
      for (const lb of lobes) {
        const lx = cx + Math.cos(lb.ang) * baseR * lb.dist;
        const ly = cy + Math.sin(lb.ang) * baseR * lb.dist;
        const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, baseR * lb.rad);
        lg.addColorStop(0, lb.col);
        lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(cx - baseR * 1.1, cy - baseR * 1.1, baseR * 2.2, baseR * 2.2);
      }
      // Keep the very center velvety dark like the reference sphere
      ctx.globalCompositeOperation = 'source-over';
      const centerShadow = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.64);
      centerShadow.addColorStop(0, 'rgba(4, 2, 10, 0.86)');
      centerShadow.addColorStop(0.65, 'rgba(8, 4, 18, 0.45)');
      centerShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = centerShadow;
      ctx.fillRect(cx - baseR, cy - baseR, baseR * 2, baseR * 2);
      ctx.restore();

      // 3. Seamless 3D woven silk contours (rotating great-circle slices — zero polar bullseye)
      ctx.globalCompositeOperation = 'screen';
      const rotY = t * 0.42;
      const rotX = 0.52 + Math.sin(t * 0.3) * 0.22;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      for (let ri = 0; ri < RIBBONS; ri++) {
        const half = RIBBONS / 2;
        const ortho = ri >= half;
        const idx = ortho ? ri - half : ri;
        const v = (idx + 0.5) / half;
        const lat = (v - 0.5) * Math.PI * 0.86;
        const cosLat = Math.cos(lat);
        const sinLat = Math.sin(lat);

        const huePhase = (ri / RIBBONS) * 0.85 + t * 0.065 + (m === 'thinking' ? 0.3 : 0);
        const [cr, cg, cb] = colorAt(huePhase);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        let prevX = 0;
        let prevY = 0;
        let prevVisible = false;

        for (let si = 0; si <= STEPS; si++) {
          const u = si / STEPS;
          const theta = u * Math.PI * 2;
          const a = cosLat * Math.cos(theta);
          const b = sinLat;
          const c = cosLat * Math.sin(theta);
          // Orthogonal crossed weave prevents any single polar bullseye
          const nx = ortho ? b * 0.82 - c * 0.57 : a;
          const ny = ortho ? a * 0.92 + b * 0.22 + c * 0.32 : b * 0.92 - c * 0.39;
          const nz = ortho ? -a * 0.39 + b * 0.53 + c * 0.75 : b * 0.39 + c * 0.92;

          // Organic 3D harmonic folds
          const w1 = Math.sin(nx * 3.1 + ny * 2.4 + t * 1.1);
          const w2 = Math.cos(nz * 3.0 - nx * 2.2 - t * 0.95);
          const r = baseR * (1 + dispAmp * (w1 * 0.55 + w2 * 0.45));

          const x0 = r * nx;
          const y0 = r * ny;
          const z0 = r * nz;

          const x1 = x0 * cosY - z0 * sinY;
          const z1 = x0 * sinY + z0 * cosY;
          const y2 = y0 * cosX - z1 * sinX;
          const z2 = y0 * sinX + z1 * cosX;

          const px = cx + x1;
          const py = cy + y2;
          const depth = z2 / (baseR * 1.18);

          if (depth > -0.22) {
            if (prevVisible) {
              const radial = Math.min(1.15, Math.hypot(x1, y2) / baseR);
              const foldGlow = Math.pow(Math.max(0.14, radial), 1.85) * Math.max(0.1, (depth + 0.3) * 0.65);
              const alpha = Math.min(0.68, foldGlow);
              ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
              ctx.lineWidth = (0.65 + radial * 1.0) * (size / 200);
              ctx.beginPath();
              ctx.moveTo(prevX, prevY);
              ctx.lineTo(px, py);
              ctx.stroke();
            }
            prevX = px;
            prevY = py;
            prevVisible = true;
          } else {
            prevVisible = false;
          }
        }
      }

      ctx.restore();
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  const l = mood === 'listening' ? Math.min(1, Math.max(0, level) * 2.2) : 0;
  const style = {
    '--orb-size': `${size}px`,
    transform: `scale(${1 + l * 0.14})`,
    filter: `saturate(${1 + l * 0.5}) brightness(${1 + l * 0.18})`,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      data-testid="orb"
      onClick={onClick}
      className={`orb float-slow ${onClick ? 'orb-tap' : ''} ${mood === 'thinking' ? 'orb-thinking' : ''} ${mood === 'speaking' ? 'orb-speaking' : ''}`}
      style={style}
    >
      <span className="orb-glow" />
      <span className="orb-ring" />
      <span className="orb-ring r2" />
      <span className="orb-core-shadow" />
      <canvas ref={canvasRef} className="orb-canvas" />
    </div>
  );
}
