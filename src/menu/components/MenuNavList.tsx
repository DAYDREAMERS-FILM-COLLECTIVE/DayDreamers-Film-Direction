/**
 * src/menu/components/MenuNavList.tsx
 * The 5 primary drawer navigation links with 01-05 geometric counters and staggered cascade.
 * Editorial typography: Heebo Thin 200, 60px light links with tight leading.
 * Styled in Screening Deep Plum & Rosé Gold tokens.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLayoutStore } from '../../core/store/useLayoutStore';
import { PageRoute } from '../../core/types';

interface NavItem {
  number: string;
  label: string;
  route?: PageRoute;
  anchor?: string;
}

const NAV_ITEMS: NavItem[] = [
  { number: '01', label: 'Home', route: 'home' },
  { number: '02', label: 'Screening', route: 'screening' },
  { number: '03', label: 'Past Events', route: 'home', anchor: '#gallery' },
  { number: '04', label: 'About Us', route: 'home', anchor: '#about' },
  { number: '05', label: 'Join Us', route: 'home', anchor: '#join' }
];

interface MenuNavListProps {
  isRevealed?: boolean;
}

export const MenuNavList: React.FC<MenuNavListProps> = ({ isRevealed = true }) => {
  const { setRoute, hideMenu, setTransitioning, setCursor, resetCursor } = useLayoutStore();

  const handleNav = (item: NavItem) => {
    hideMenu();
    if (item.route) {
      setTransitioning(true);
      setTimeout(() => {
        setRoute(item.route!);
        if (item.anchor && typeof window !== 'undefined') {
          const el = document.querySelector(item.anchor);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 800);
    }
  };

  return (
    <View style={styles.navList}>
      {NAV_ITEMS.map((item) => (
        <Pressable
          key={item.number}
          onPress={() => handleNav(item)}
          onHoverIn={() => setCursor('GO', item.label.toUpperCase())}
          onHoverOut={resetCursor}
          style={({ pressed }) => [
            styles.navItem,
            isRevealed && styles.navItemRevealed,
            pressed && styles.itemPressed
          ]}
        >
          {/* 10px Bold geometric-grotesk tracking counter: 30px gap left of text */}
          <Text style={styles.itemNumber}>{item.number}</Text>
          {/* Heebo Thin 200 60px light link label */}
          <Text style={styles.itemLabel}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  navList: {
    marginLeft: '10%',
    gap: 0,
    justifyContent: 'center'
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    position: 'relative',
    paddingVertical: 13,
    opacity: 0,
    transform: [{ translateY: 40 }]
  },
  navItemRevealed: {
    opacity: 1,
    transform: [{ translateY: 0 }]
  },
  itemNumber: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3.6,
    color: 'rgba(200, 155, 178, 0.22)',
    marginRight: 30,
    transform: [{ translateY: -10 }]
  },
  itemLabel: {
    color: 'rgba(200, 155, 178, 0.75)',
    fontSize: 52,
    fontWeight: '200',
    letterSpacing: -1,
    lineHeight: 48
  },
  itemPressed: {
    opacity: 0.9
  }
});
