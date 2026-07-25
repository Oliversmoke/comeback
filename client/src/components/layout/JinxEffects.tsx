'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Cinematic ambient background for the Comeback.AI cyberpunk glass UI.
 *
 * Layers (all pointer-events: none, all fixed/absolute, none touch scrolling):
 *   - .jinx-background  : parallaxing Comeback logo + blue/red brand glow
 *   - canvas particles  : drifting blue + red motes with faint constellation links
 *   - .jinx-energy       : two sweeping energy lines (blue -> red)
 *   - .cursor-spotlight  : soft light that tracks the cursor (CSS vars, no React state)
 *   - .mouse-light       : larger blurred halo that trails the cursor
 *
 * Everything collapses under prefers-reduced-motion. The canvas runs on rAF
 * and is torn down on unmount; particle count scales to viewport area.
 */

const BLUE = '0, 168, 255';
const RED = '255, 32, 85';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export const JinxEffects = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseLightRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  // Particle field
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      color: string;
    }[] = [];

    const seed = () => {
      const area = width * height;
      const count = Math.min(90, Math.max(28, Math.round(area / 22000)));
      particles.length = 0;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r: Math.random() * 1.6 + 0.6,
          color: Math.random() > 0.5 ? BLUE : RED,
        });
      }
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, 0.55)`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(${p.color}, ${0.1 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reduced]);

  // Cursor-reactive light (direct DOM writes, no React re-render)
  useEffect(() => {
    if (reduced) return;
    const light = mouseLightRef.current;
    const spot = spotlightRef.current;
    if (!light && !spot) return;

    const handleMove = (e: MouseEvent) => {
      if (light) {
        light.style.left = `${e.clientX - 260}px`;
        light.style.top = `${e.clientY - 260}px`;
      }
      if (spot) {
        spot.style.setProperty('--mx', `${e.clientX}px`);
        spot.style.setProperty('--my', `${e.clientY}px`);
      }
    };

    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [reduced]);

  return (
    <>
      <div className="jinx-background" />
      <canvas ref={canvasRef} className="jinx-particles" aria-hidden />
      <div className="jinx-energy" aria-hidden />
      <div ref={spotlightRef} className="cursor-spotlight" aria-hidden />
      <div ref={mouseLightRef} className="mouse-light" aria-hidden />
      <div className="jinx-grain" aria-hidden />
    </>
  );
};
