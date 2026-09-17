/**
 * src/screening/components/ScrubShowcase.tsx
 * Memory-safe 60-frame showcase scrub engine.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Image as RNImage } from 'react-native';
import { THEME } from '../constants/theme';

const TOTAL_FRAMES = 60;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScrubShowcaseProps {
  progress: number; // 0.0 to 1.0 (derived from scroll position)
  onReservePress?: () => void;
}

export const ScrubShowcase: React.FC<ScrubShowcaseProps> = ({ progress, onReservePress }) => {
  const frameIndex = useMemo(() => {
    const scrubP = Math.min(1, Math.max(0, progress / 0.75));
    return Math.min(TOTAL_FRAMES - 1, Math.floor(scrubP * (TOTAL_FRAMES - 1)));
  }, [progress]);

  const posterOpacity = useMemo(() => {
    if (progress <= 0.75) return 0;
    if (progress >= 0.88) return 1;
    return (progress - 0.75) / 0.13;
  }, [progress]);

  const framePad = String(frameIndex).padStart(2, '0');
  const frameUri = `/assets/showcase-frames/frame_${framePad}.webp`;

  return (
    <View style={styles.showcaseContainer}>
      {/* 1. Base Frame */}
      <RNImage
        source={{ uri: frameUri }}
        style={styles.frameImage}
        resizeMode="cover"
      />

      {/* 2. Cross-fade Poster */}
      <RNImage
        source={{ uri: '/assets/showcase-poster.jpg' }}
        style={[styles.posterOverlay, { opacity: posterOpacity }]}
        resizeMode="cover"
      />

      {/* 3. Dark Aesthetic Vignette & Gradient Shade */}
      <View style={styles.shadeOverlay} />

      {/* 4. Foreground Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.badgeText}>Featured Presentation</Text>
        <Text style={styles.mainTitle}>
          Cinema, <Text style={styles.highlightText}>One Cube at a Time</Text>
        </Text>
        <Text style={styles.description}>
          Scroll on and watch scattered light resolve into a single frame.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  showcaseContainer: {
    width: '100%',
    height: 480,
    backgroundColor: THEME.colors.bg,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
  frameImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%'
  },
  posterOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%'
  },
  shadeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 11, 23, 0.45)'
  },
  contentContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
    zIndex: 10
  },
  badgeText: {
    color: THEME.colors.plumAccent,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8
  },
  mainTitle: {
    color: THEME.colors.cream,
    fontSize: 32,
    fontWeight: '700',
    fontFamily: THEME.typography.titleFont,
    textAlign: 'center',
    marginBottom: 10
  },
  highlightText: {
    color: THEME.colors.gold
  },
  description: {
    color: THEME.colors.cream,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 420,
    opacity: 0.9
  }
});
