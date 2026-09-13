'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';
import Lenis from 'lenis';
import { useShowcaseStore } from '@/store/useShowcaseStore';

export const useScrollAnimation = () => {
  const animationRef = useRef<anime.AnimeTimelineInstance | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const setScrollState = useShowcaseStore((s) => s.setScrollState);

  useEffect(() => {
    // 1. Define Anime.js timeline (paused, linear scrub)
    animationRef.current = anime.timeline({
      autoplay: false,
      duration: 1000,
      easing: 'linear',
    });

    // 2. Add editorial scroll scrubbing targets
    animationRef.current
      .add({
        targets: '.hero-heading',
        opacity: [1, 0],
        translateY: [0, -60],
        duration: 300,
      })
      .add(
        {
          targets: '.movie-slide-card',
          translateY: [120, 0],
          opacity: [0.2, 1],
          delay: anime.stagger(150),
          duration: 700,
        },
        '-=100'
      );

    // 3. Initialize Lenis Virtual Scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    // 4. Bind Lenis scroll progress (0 to 1) directly to Anime.js timeline seek()
    lenis.on('scroll', (e: { progress?: number; scroll?: number; velocity?: number }) => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = typeof e.progress === 'number' ? e.progress : (maxScroll > 0 ? (e.scroll || 0) / maxScroll : 0);
      const clampedProgress = Math.max(0, Math.min(1, progress));

      // Scrub anime timeline
      if (animationRef.current) {
        const seekProgress = clampedProgress * animationRef.current.duration;
        animationRef.current.seek(seekProgress);
      }

      setScrollState(clampedProgress, e.velocity || 0);
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [setScrollState]);

  return { lenis: lenisRef.current };
};
