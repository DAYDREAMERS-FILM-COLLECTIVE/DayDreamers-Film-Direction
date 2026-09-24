/**
 * src/menu/components/BurgerToggle.tsx
 * High-performance, GPU-composited 3-bar hamburger button trigger with accessible ARIA attributes.
 * Matches Phase 1 toggle specs: -180deg container spin, scaleX hover micro-interaction, ±45deg X formation.
 */

import React, { useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useLayoutStore } from '../../core/store/useLayoutStore';

export const BurgerToggle: React.FC = () => {
  const { isMenuOpen, toggleMenu, setCursor, resetCursor } = useLayoutStore();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      onPress={toggleMenu}
      onHoverIn={() => {
        setIsHovered(true);
        setCursor('MENU', isMenuOpen ? 'CLOSE' : 'MENU');
      }}
      onHoverOut={() => {
        setIsHovered(false);
        resetCursor();
      }}
      accessibilityRole="button"
      accessibilityLabel={isMenuOpen ? 'Close Menu' : 'Open Menu'}
      accessibilityState={{ expanded: isMenuOpen }}
      aria-controls="site-menu"
      style={[styles.toggleBtn, isMenuOpen && styles.toggleBtnOpen]}
    >
      <View style={styles.iconBox}>
        {/* Bar 1: translateY(-6px) -> rotate(45deg) */}
        <View style={[styles.bar, styles.bar1, isMenuOpen && styles.bar1Open]} />

        {/* Bar 2: scaleX(0.8) -> hover scaleX(1) -> open opacity: 0 */}
        <View
          style={[
            styles.bar,
            styles.bar2,
            isHovered && !isMenuOpen && styles.bar2Hover,
            isMenuOpen && styles.bar2Open
          ]}
        />

        {/* Bar 3: translateY(6px) -> rotate(-45deg) */}
        <View style={[styles.bar, styles.bar3, isMenuOpen && styles.bar3Open]} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  toggleBtn: {
    width: 32,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    transform: [{ rotate: '0deg' }]
  },
  toggleBtnOpen: {
    transform: [{ rotate: '-180deg' }]
  },
  iconBox: {
    width: 20,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1
  },
  bar1: {
    transform: [{ translateY: -6 }]
  },
  bar1Open: {
    transform: [{ translateY: 0 }, { rotate: '45deg' }]
  },
  bar2: {
    transform: [{ scaleX: 0.8 }],
    transformOrigin: 'right' as any
  },
  bar2Hover: {
    transform: [{ scaleX: 1 }]
  },
  bar2Open: {
    opacity: 0
  },
  bar3: {
    transform: [{ translateY: 6 }]
  },
  bar3Open: {
    transform: [{ translateY: 0 }, { rotate: '-45deg' }]
  }
});
