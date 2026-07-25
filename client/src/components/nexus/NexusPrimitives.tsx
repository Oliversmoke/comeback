'use client';

/**
 * Neo Nexus — flagship dashboard primitives.
 *
 * A small kit of holographic, motion-first building blocks used by the
 * dashboard. Every continuous interaction (tilt, spotlight) is driven by
 * Framer Motion motion values (not React state) so it stays 60fps and never
 * re-renders the tree. Everything degrades to a clean static state under
 * `prefers-reduced-motion`.
 */

import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  animate,
  useMotionValue,
  useMotionTemplate,
  useSpring,
  useReducedMotion,
} from 'framer-motion';
import { cn } from '@/lib/utils';

export type NexusGlow = 'blue' | 'red' | 'cyan' | 'violet' | 'green';

const GLOW: Record<NexusGlow, { spot: string; ring: string; hex: string }> = {
  blue: { spot: '0, 168, 255', ring: 'rgba(0, 168, 255, 0.4)', hex: '#00A8FF' },
  red: { spot: '255, 32, 85', ring: 'rgba(255, 32, 85, 0.38)', hex: '#FF2055' },
  cyan: { spot: '77, 234, 255', ring: 'rgba(77, 234, 255, 0.38)', hex: '#4DEAFF' },
  violet: { spot: '255, 61, 113', ring: 'rgba(255, 61, 113, 0.36)', hex: '#FF3D71' },
  green: { spot: '102, 252, 241', ring: 'rgba(102, 252, 241, 0.34)', hex: '#66FCF1' },
};

export function glowHex(glow: NexusGlow) {
  return GLOW[glow].hex;
}

/* --------------------------------------------------------------------------
 * HoloCard — glass panel with pointer-reactive 3D tilt + cursor spotlight.
 * ------------------------------------------------------------------------ */
interface HoloCardProps {
  children: ReactNode;
  className?: string;
  glow?: NexusGlow;
  tilt?: boolean;
}

export function HoloCard({ children, className, glow = 'blue', tilt = true }: HoloCardProps) {
  const reduce = useReducedMotion();
  const g = GLOW[glow];

  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const mx = useMotionValue(50);
  const my = useMotionValue(50);

  const springX = useSpring(rotX, { stiffness: 150, damping: 18, mass: 0.4 });
  const springY = useSpring(rotY, { stiffness: 150, damping: 18, mass: 0.4 });

  const spotlight = useMotionTemplate`radial-gradient(240px circle at ${mx}% ${my}%, rgba(${g.spot}, 0.18), transparent 62%)`;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce || !tilt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rotY.set((px - 0.5) * 8);
    rotX.set((0.5 - py) * 8);
    mx.set(px * 100);
    my.set(py * 100);
  };

  const reset = () => {
    rotX.set(0);
    rotY.set(0);
    mx.set(50);
    my.set(50);
  };

  return (
    <motion.div
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={
        reduce
          ? ({ ['--glow']: g.ring } as React.CSSProperties)
          : ({
              rotateX: springX,
              rotateY: springY,
              transformPerspective: 900,
              ['--glow']: g.ring,
            } as React.CSSProperties)
      }
      className={cn('nexus-panel group', className)}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: spotlight }}
      />
      <div className="relative z-[1] h-full">{children}</div>
    </motion.div>
  );
}

/* --------------------------------------------------------------------------
 * AnimatedCounter — counts up to a number without per-frame React renders.
 * ------------------------------------------------------------------------ */
export function AnimatedCounter({
  value,
  className,
  format = true,
}: {
  value: number;
  className?: string;
  format?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const render = (v: number) => {
      const n = Math.round(v);
      node.textContent = format ? n.toLocaleString() : String(n);
    };
    if (reduce) {
      render(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: render,
    });
    return () => controls.stop();
  }, [value, reduce, format]);

  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}

/* --------------------------------------------------------------------------
 * ProgressRing — HUD-style circular progress with a neon glow.
 * ------------------------------------------------------------------------ */
export function ProgressRing({
  value,
  size = 72,
  stroke = 6,
  glow = 'blue',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  glow?: NexusGlow;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const color = GLOW[glow].hex;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduce ? offset : circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 5px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * NeonBar — animated horizontal progress bar with a glowing fill.
 * ------------------------------------------------------------------------ */
export function NeonBar({ value, glow = 'blue' }: { value: number; glow?: NexusGlow }) {
  const reduce = useReducedMotion();
  const color = GLOW[glow].hex;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        className="h-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 10px ${color}80`,
        }}
        initial={{ width: reduce ? `${clamped}%` : 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: reduce ? 0 : 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

/* --------------------------------------------------------------------------
 * GlowChip — status pill with a pulsing indicator dot (real live status).
 * ------------------------------------------------------------------------ */
export function GlowChip({
  children,
  glow = 'green',
}: {
  children: ReactNode;
  glow?: NexusGlow;
}) {
  const reduce = useReducedMotion();
  const color = GLOW[glow].hex;
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium tracking-wide"
      style={{ borderColor: `${color}40`, background: `${color}14`, color }}
    >
      <motion.span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        animate={reduce ? undefined : { opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {children}
    </span>
  );
}

/* --------------------------------------------------------------------------
 * AICoachOrb — a "living" AI presence: concentric pulse rings + core.
 * ------------------------------------------------------------------------ */
export function AICoachOrb({
  children,
  size = 40,
  active = true,
}: {
  children: ReactNode;
  size?: number;
  active?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {!reduce &&
        active &&
        [0, 1].map((i) => (
          <motion.span
            key={i}
            className="absolute rounded-full border border-primary-400/40"
            style={{ width: size, height: size }}
            initial={{ scale: 0.6, opacity: 0.6 }}
            animate={{ scale: 1.7, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 1.2, ease: 'easeOut' }}
          />
        ))}
      <div
        className="relative flex items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-accent-500 text-white"
        style={{ width: size * 0.82, height: size * 0.82, boxShadow: '0 0 20px rgba(0,168,255,0.5)' }}
      >
        {children}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * TaskCompleteButton — check control that bursts particles on complete.
 * Communicates the "reward" of finishing a task (feedback, not decoration).
 * ------------------------------------------------------------------------ */
export function TaskCompleteButton({ onComplete }: { onComplete: () => void }) {
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState(false);

  const handle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reduce) {
      setBurst(true);
      window.setTimeout(() => setBurst(false), 600);
    }
    onComplete();
  };

  return (
    <button
      type="button"
      onClick={handle}
      aria-label="Complete task"
      className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-white/30 transition-all hover:border-green-400 hover:bg-green-400/20 active:scale-90"
    >
      <span className="h-2.5 w-2.5 rounded-full bg-transparent transition-colors group-hover:bg-green-400" />
      <AnimatePresence>
        {burst &&
          Array.from({ length: 6 }).map((_, i) => {
            const angle = (i / 6) * Math.PI * 2;
            return (
              <motion.span
                key={i}
                className="absolute h-1 w-1 rounded-full bg-green-400"
                style={{ boxShadow: '0 0 6px #66FCF1' }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos(angle) * 18, y: Math.sin(angle) * 18, opacity: 0, scale: 0.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            );
          })}
      </AnimatePresence>
    </button>
  );
}

/* --------------------------------------------------------------------------
 * NexusBackground — ambient energy field (grid + aurora + light streaks).
 * Pure CSS animation; auto-disables under reduced motion.
 * ------------------------------------------------------------------------ */
export function NexusBackground() {
  return (
    <div
      aria-hidden
      className="nexus-bg pointer-events-none absolute -inset-x-4 -top-4 bottom-0 -z-10 overflow-hidden lg:-inset-x-8 lg:-top-8"
    >
      <div className="nexus-grid absolute inset-0" />
      <div className="nexus-aurora nexus-aurora-1" />
      <div className="nexus-aurora nexus-aurora-2" />
      <div className="nexus-streak nexus-streak-1" />
      <div className="nexus-streak nexus-streak-2" />
    </div>
  );
}
