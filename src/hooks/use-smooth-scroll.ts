'use client';

import { useEffect, useState, useCallback } from 'react';

export function useSmoothScroll() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [targetScroll, setTargetScroll] = useState(0);

  // Smooth interpolation (lerp)
  const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
  };

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;
    setTargetScroll(scrollPercent);
  }, []);

  useEffect(() => {
    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    // Smooth animation loop
    let rafId: number;

    const animate = () => {
      setScrollProgress((prev) => {
        const newValue = lerp(prev, targetScroll, 0.1);
        // Continue animating if not close enough to target
        if (Math.abs(newValue - targetScroll) > 0.001) {
          rafId = requestAnimationFrame(animate);
        }
        return newValue;
      });
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [targetScroll]);

  return scrollProgress;
}
