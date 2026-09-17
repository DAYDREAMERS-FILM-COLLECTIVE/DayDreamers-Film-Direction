/**
 * src/core/components/SweepWall.tsx
 * Continuous Dogstudio Horizontal Sweep Wall curtain transition.
 * Executes smooth page route wipes with cubic easing and box-shadow depth.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import { useLayoutStore } from '../store/useLayoutStore';
import { THEME } from '../../screening/constants/theme';

const { width: WINDOW_WIDTH } = Dimensions.get('window');

export const SweepWall: React.FC = () => {
  const { isTransitioning, setTransitioning } = useLayoutStore();
  const slideAnim = useRef(new Animated.Value(-WINDOW_WIDTH)).current;

  useEffect(() => {
    if (isTransitioning) {
      slideAnim.setValue(-WINDOW_WIDTH);
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: WINDOW_WIDTH,
          duration: 450,
          useNativeDriver: true
        })
      ]).start(() => {
        setTransitioning(false);
        slideAnim.setValue(-WINDOW_WIDTH);
      });
    }
  }, [isTransitioning]);

  if (!isTransitioning) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wall,
        {
          transform: [{ translateX: slideAnim }]
        }
      ]}
    />
  );
};

const styles = StyleSheet.create({
  wall: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: THEME.colors.plumDark,
    borderRightWidth: 2,
    borderRightColor: THEME.colors.plumAccent,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 25, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 50,
    elevation: 20
  }
});
