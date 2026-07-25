'use client';

import React, { useEffect, useRef } from 'react';

export const JinxEffects = () => {
  const mouseLightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = mouseLightRef.current;
    if (!glow) return;

    const handleMouseMove = (e: MouseEvent) => {
      glow.style.left = `${e.clientX - 250}px`;
      glow.style.top = `${e.clientY - 250}px`;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      <div className="jinx-background" />
      <div ref={mouseLightRef} className="mouse-light" />
    </>
  );
};
