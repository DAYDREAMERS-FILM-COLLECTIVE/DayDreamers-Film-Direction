/**
 * src/App.tsx
 * Root Application Router coordinating global shell, transitions, and screens:
 * - Home Screen (/)
 * - Screening & Seat Booking Screen (/screening)
 * - Admin CMS & Door Scanner Screen (/admin)
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLayoutStore } from './core/store/useLayoutStore';
import { Header } from './core/components/Header';
import { StarCursor } from './core/components/StarCursor';
import { SweepWall } from './core/components/SweepWall';
import { MenuDrawer } from './menu/MenuDrawer';
import { HomeScreen } from './home/HomeScreen';
import { ScreeningScreen } from './screening/ScreeningScreen';
import { AdminScreen } from './admin/AdminScreen';
import { THEME } from './screening/constants/theme';

export const App: React.FC = () => {
  const { currentRoute, setRoute } = useLayoutStore();

  // Listen to browser hash or URL changes on web
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncRouteFromLocation = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path.includes('admin') || hash.includes('admin')) {
        setRoute('admin');
      } else if (path.includes('screening') || hash.includes('screening') || hash.includes('booking')) {
        setRoute('screening');
      } else {
        setRoute('home');
      }
    };

    syncRouteFromLocation();
    window.addEventListener('popstate', syncRouteFromLocation);
    return () => window.removeEventListener('popstate', syncRouteFromLocation);
  }, []);

  return (
    <View style={styles.appRoot}>
      {/* Global Interactive Shell */}
      <Header />
      <MenuDrawer />
      <SweepWall />
      <StarCursor />

      {/* Screen Router */}
      <View style={styles.screenContainer}>
        {currentRoute === 'home' && <HomeScreen />}
        {currentRoute === 'screening' && <ScreeningScreen />}
        {currentRoute === 'admin' && <AdminScreen />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: THEME.colors.bg
  },
  screenContainer: {
    flex: 1
  }
});

export default App;
