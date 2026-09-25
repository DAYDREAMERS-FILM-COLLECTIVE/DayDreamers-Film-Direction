/**
 * src/core/components/StarCursor.tsx
 * Custom golden star cursor with contextual pill badges and particle burst physics.
 * Automatically enabled on pointer-equipped viewports.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useLayoutStore } from '../store/useLayoutStore';
import { CursorPosition, Particle } from '../types';
import { THEME } from '../../screening/constants/theme';

export const StarCursor: React.FC = () => {
  const { cursorLabel } = useLayoutStore();
  const [pos, setPos] = useState<CursorPosition>({ x: -100, y: -100 });
  const [visible, setVisible] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Only mount on web / desktop pointer environments
    if (typeof window === 'undefined') return;

    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!visible) setVisible(true);
    };

    const handleMouseLeave = () => setVisible(false);
    const handleMouseEnter = () => setVisible(true);

    const handleClick = (e: MouseEvent) => {
      // Spawn 8 sparkle burst particles on click
      const newParticles: Particle[] = Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        return {
          id: Date.now() + i,
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 3,
          color: i % 2 === 0 ? THEME.colors.gold : THEME.colors.cream,
          alpha: 1
        };
      });
      setParticles((prev) => [...prev.slice(-16), ...newParticles]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('click', handleClick);
    };
  }, [visible]);

  // Particle physics tick
  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            alpha: p.alpha - 0.08
          }))
          .filter((p) => p.alpha > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [particles.length]);

  if (!visible || Platform.OS !== 'web') return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {/* Golden Star Pointer */}
      <View style={[styles.cursorContainer, { transform: [{ translateX: pos.x }, { translateY: pos.y }] }]}>
        <Text style={styles.starGlyph}>✦</Text>
        {cursorLabel && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{cursorLabel}</Text>
          </View>
        )}
      </View>

      {/* Sparkle Particle Bursts */}
      {particles.map((p) => (
        <View
          key={p.id}
          style={[
            styles.particle,
            {
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.alpha,
              transform: [{ translateX: p.x }, { translateY: p.y }]
            }
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  cursorContainer: {
    position: 'absolute',
    top: -8,
    left: -8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 99999
  },
  starGlyph: {
    color: THEME.colors.gold,
    fontSize: 16,
    textShadowColor: 'rgba(200, 155, 178, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8
  },
  badgeContainer: {
    backgroundColor: THEME.colors.plumDark,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 10,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 6
  },
  badgeText: {
    color: THEME.colors.cream,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5
  },
  particle: {
    position: 'absolute',
    borderRadius: 4,
    zIndex: 99998
  }
});
