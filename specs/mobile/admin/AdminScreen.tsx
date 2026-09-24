/**
 * src/admin/AdminScreen.tsx
 * Root Admin CMS Screen coordinating AuthGate, Sidebar, and active sections.
 */

import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useAdminStore } from './store/useAdminStore';
import { AuthGate } from './components/AuthGate';
import { AdminSidebar } from './components/AdminSidebar';
import { FilmCatalogue } from './components/FilmCatalogue';
import { SeatLocker } from './components/SeatLocker';
import { BookingsRoster } from './components/BookingsRoster';
import { DoorQrScanner } from './components/DoorQrScanner';
import { THEME } from '../screening/constants/theme';

export const AdminScreen: React.FC = () => {
  const { isAuthenticated, currentSection } = useAdminStore();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  if (!isAuthenticated) {
    return <AuthGate />;
  }

  return (
    <View style={[styles.adminRoot, isDesktop ? styles.desktopLayout : styles.mobileLayout]}>
      {/* Sidebar Navigation */}
      <AdminSidebar />

      {/* Dynamic Content Body */}
      <View style={styles.contentBody}>
        {currentSection === 'movies' && <FilmCatalogue />}
        {currentSection === 'seats' && <SeatLocker />}
        {currentSection === 'bookings' && <BookingsRoster />}
        {currentSection === 'scanner' && <DoorQrScanner />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  adminRoot: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: THEME.colors.bg
  },
  desktopLayout: {
    flexDirection: 'row'
  },
  mobileLayout: {
    flexDirection: 'column'
  },
  contentBody: {
    flex: 1
  }
});
