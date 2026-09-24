/**
 * src/core/components/Header.tsx
 * Fixed glassmorphic navigation header with brand SVG icon and animated burger trigger.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLayoutStore } from '../store/useLayoutStore';
import { BurgerToggle } from '../../menu/components/BurgerToggle';
import { THEME } from '../../screening/constants/theme';

export const Header: React.FC = () => {
  const { isMenuOpen, toggleMenu, setRoute, setCursor, resetCursor } = useLayoutStore();

  return (
    <View style={styles.headerContainer}>
      {/* Brand Logo & Society Name */}
      <Pressable
        onPress={() => setRoute('home')}
        onHoverIn={() => setCursor('TOP', 'HOME')}
        onHoverOut={resetCursor}
        style={styles.brandLink}
      >
        <Svg viewBox="0 0 32 32" width={26} height={26}>
          <Path
            d="M22.5 19.5A9.5 9.5 0 1 1 12.5 5.8 7.4 7.4 0 0 0 22.5 19.5Z"
            fill={THEME.colors.gold}
          />
          <Path
            d="M24.5 4.5c.5 2.3 1.2 3 3.5 3.5-2.3.5-3 1.2-3.5 3.5-.5-2.3-1.2-3-3.5-3.5 2.3-.5 3-1.2 3.5-3.5Z"
            fill={THEME.colors.gold}
          />
        </Svg>
        <Text style={styles.brandTitle}>
          DAYDREAMERS <Text style={styles.brandTag}>FILM</Text>
        </Text>
      </Pressable>

      {/* Hamburger Toggle Button */}
      <BurgerToggle />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 72,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 1000,
    backgroundColor: 'transparent'
  },
  brandLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  brandTitle: {
    color: THEME.colors.cream,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 3
  },
  brandTag: {
    color: THEME.colors.gold,
    fontWeight: '500'
  },
  burgerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center'
  },
  burgerIcon: {
    width: 24,
    height: 16,
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  bar: {
    width: 24,
    height: 1.5,
    backgroundColor: '#ffffff',
    borderRadius: 1
  },
  barTopOpen: {
    transform: [{ translateY: 7 }, { rotate: '45deg' }]
  },
  barMidOpen: {
    opacity: 0
  },
  barBottomOpen: {
    transform: [{ translateY: -7 }, { rotate: '-45deg' }]
  }
});
