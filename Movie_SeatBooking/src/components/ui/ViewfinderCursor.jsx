import React, { useEffect, useRef, useState } from 'react';

/**
 * Dogstudio-Inspired 35mm Camera Viewfinder Custom Magnetic Cursor
 * Features:
 *  - Continuous requestAnimationFrame lerp tracking
 *  - 35mm camera viewfinder reticle with rangefinder frame corners
 *  - Magnetic snap & expansion on interactive elements, buttons, and seats
 */
export function ViewfinderCursor() {
  const cursorRef = useRef(null);
  const dotRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverLabel, setHoverLabel] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isJittering, setIsJittering] = useState(false);

  const mouse = useRef({ x: -100, y: -100 });
  const cursor = useRef({ x: -100, y: -100 });
  const magneticTarget = useRef(null);

  useEffect(() => {
    const handleJitter = () => {
      setIsJittering(true);
      setTimeout(() => {
        setIsJittering(false);
      }, 500);
    };

    window.addEventListener('cursor-jitter', handleJitter);
    return () => {
      window.removeEventListener('cursor-jitter', handleJitter);
    };
  }, []);

  useEffect(() => {
    // Only enable on desktop pointer devices
    if (typeof window === 'undefined' || window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const onMouseMove = (e) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      if (!isVisible) setIsVisible(true);

      // Check if hovering over magnetic element
      const target = e.target.closest('button, a, [data-cursor="magnetic"], canvas');
      if (target) {
        setIsHovered(true);
        const label = target.getAttribute('data-cursor-label') || '';
        setHoverLabel(label);

        // Calculate magnetic pull towards element center if small button
        if (target.tagName === 'BUTTON' || target.tagName === 'A') {
          const rect = target.getBoundingClientRect();
          if (rect.width < 320 && rect.height < 120) {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            magneticTarget.current = { x: centerX, y: centerY };
          } else {
            magneticTarget.current = null;
          }
        }
      } else {
        setIsHovered(false);
        setHoverLabel('');
        magneticTarget.current = null;
      }
    };

    const onMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);

    let rafId;
    const animate = () => {
      // Lerp smooth tracking
      let targetX = mouse.current.x;
      let targetY = mouse.current.y;

      if (magneticTarget.current) {
        // 35% magnetic pull toward button center
        targetX = targetX + (magneticTarget.current.x - targetX) * 0.35;
        targetY = targetY + (magneticTarget.current.y - targetY) * 0.35;
      }

      cursor.current.x += (targetX - cursor.current.x) * 0.22;
      cursor.current.y += (targetY - cursor.current.y) * 0.22;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${cursor.current.x}px, ${cursor.current.y}px, 0)`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouse.current.x}px, ${mouse.current.y}px, 0)`;
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <>
      {/* Precision Center Reticle Dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[10000] -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-[#d83128] rounded-none transition-opacity duration-200"
        style={{ opacity: isHovered ? 0.9 : 0.6 }}
      />

      {/* 35mm Viewfinder Frame Reticle */}
      <div
        ref={cursorRef}
        className={`fixed top-0 left-0 pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-[width,height,border-color] duration-200 ease-out ${
          isJittering
            ? 'w-16 h-16 border-2 border-[#d83128] bg-[#d83128]/25 animate-bounce'
            : isHovered
            ? 'w-14 h-14 border border-[#d83128] bg-[#d83128]/10'
            : 'w-8 h-8 border border-[#8c867e]/60'
        }`}
      >
        {/* Viewfinder 4-Corner Crop Marks */}
        <div className="absolute -top-1 -left-1 w-1.5 h-1.5 border-t border-l border-[#d83128]" />
        <div className="absolute -top-1 -right-1 w-1.5 h-1.5 border-t border-r border-[#d83128]" />
        <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 border-b border-l border-[#d83128]" />
        <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 border-b border-r border-[#d83128]" />

        {/* Center Crosshair Hairlines */}
        <div className="absolute w-2 h-[1px] bg-[#8c867e]/40" />
        <div className="absolute h-2 w-[1px] bg-[#8c867e]/40" />

        {/* Viewfinder Telemetry Label */}
        {(isHovered || isJittering) && (
          <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-mono tracking-widest uppercase whitespace-nowrap px-1 border ${
            isJittering
              ? 'bg-[#1e1411] text-[#d83128] border-[#d83128] font-bold'
              : 'bg-[#080706] text-[#d83128] border-[#26221f]'
          }`}>
            {isJittering ? 'CONTESTED // LOCK BUSY' : (hoverLabel || '35MM [ FOCUS ]')}
          </span>
        )}
      </div>
    </>
  );
}
