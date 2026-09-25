/**
 * src/menu/MenuDrawer.tsx
 * Fullscreen persistent menu room with animated wipe curtain, 3D liquid glass canvas, and staggered navigation links.
 * Matches Phase 2 specs: 1600ms body-class timeline, curtain wipe, and editorial layout.
 */

import React from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { useLayoutStore } from '../core/store/useLayoutStore';
import { MenuNavList } from './components/MenuNavList';
import { MenuFooter } from './components/MenuFooter';
import { MenuGlassCanvas } from './components/MenuGlassCanvas';

export const MenuDrawer: React.FC = () => {
  const { isMenuOpen, isMenuRunning, menuStage, toggleMenu } = useLayoutStore();

  if (!isMenuOpen && !isMenuRunning) {
    return null;
  }

  const isRevealed = menuStage === 'open';

  return (
    <Modal
      visible={isMenuOpen || isMenuRunning}
      animationType="none"
      transparent={true}
      onRequestClose={toggleMenu}
    >
      <View style={styles.fullscreen}>
        {/* 1. Backdrop Layer */}
        <View style={[styles.siteMenuBack, isRevealed && styles.siteMenuBackVisible]}>
          {/* Optional WebGL Liquid Glass Canvas */}
          <MenuGlassCanvas isOpen={isRevealed} />
        </View>

        {/* 2. Fullscreen Room Container */}
        <View style={[styles.siteMenu, isRevealed && styles.siteMenuOpen]}>
          <View style={styles.center}>
            <MenuNavList isRevealed={isRevealed} />
            <MenuFooter isRevealed={isRevealed} />
          </View>
        </View>

        {/* 3. Solid Curtain Panel: Sweeps across the viewport */}
        <View
          pointerEvents="none"
          style={[
            styles.siteMenuPanel,
            menuStage === 'running-open' && styles.panelSweepingOpen,
            menuStage === 'closing' && styles.panelSweepingClose
          ]}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent'
  },
  siteMenuBack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A0B17',
    opacity: 0
  },
  siteMenuBackVisible: {
    opacity: 1
  },
  siteMenuPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#3A1F33',
    transform: [{ translateX: -1000 }],
    zIndex: 999
  },
  panelSweepingOpen: {
    transform: [{ translateX: 0 }]
  },
  panelSweepingClose: {
    transform: [{ translateX: 0 }]
  },
  siteMenu: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 995,
    opacity: 0
  },
  siteMenuOpen: {
    opacity: 1
  },
  center: {
    flex: 1,
    paddingHorizontal: 45,
    justifyContent: 'center'
  }
});
