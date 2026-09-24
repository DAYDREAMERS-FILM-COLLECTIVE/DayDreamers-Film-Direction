/**
 * src/admin/components/AdminSidebar.tsx
 * Sidebar navigation panel for the Admin CMS.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAdminStore } from '../store/useAdminStore';
import { useLayoutStore } from '../../core/store/useLayoutStore';
import { THEME } from '../../screening/constants/theme';
import { AdminSection } from '../types';

interface NavOption {
  id: AdminSection;
  label: string;
}

const NAV_OPTIONS: NavOption[] = [
  { id: 'movies', label: 'Film Catalogue' },
  { id: 'seats', label: 'Seat Locker' },
  { id: 'bookings', label: 'Attendee Bookings' },
  { id: 'scanner', label: 'Door QR Scanner' }
];

export const AdminSidebar: React.FC = () => {
  const { currentSection, setSection, logout } = useAdminStore();
  const { setRoute, setTransitioning } = useLayoutStore();

  const handleBackToSite = () => {
    setTransitioning(true);
    setTimeout(() => {
      setRoute('screening');
    }, 300);
  };

  return (
    <View style={styles.sidebarContainer}>
      <View>
        <Text style={styles.brandTitle}>
          Daydreamers <Text style={styles.brandTag}>CMS</Text>
        </Text>

        <View style={styles.navStack}>
          {NAV_OPTIONS.map((opt) => {
            const isActive = currentSection === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setSection(opt.id)}
                style={[styles.navItem, isActive && styles.activeNavItem]}
              >
                <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}

          <Pressable onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>
      </View>

      <Pressable onPress={handleBackToSite} style={styles.backLink}>
        <Text style={styles.backLinkText}>&larr; Back to Screenings</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    width: 240,
    backgroundColor: THEME.colors.panel,
    borderRightWidth: 1,
    borderRightColor: THEME.colors.border,
    padding: 24,
    justifyContent: 'space-between'
  },
  brandTitle: {
    color: THEME.colors.cream,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 32
  },
  brandTag: {
    color: THEME.colors.gold
  },
  navStack: {
    gap: 8
  },
  navItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6
  },
  activeNavItem: {
    backgroundColor: THEME.colors.bg2,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.plumAccent
  },
  navLabel: {
    color: THEME.colors.muted,
    fontSize: 13,
    fontWeight: '600'
  },
  activeNavLabel: {
    color: THEME.colors.cream,
    fontWeight: '700'
  },
  logoutBtn: {
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  logoutText: {
    color: THEME.colors.red,
    fontSize: 13,
    fontWeight: '600'
  },
  backLink: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle
  },
  backLinkText: {
    color: THEME.colors.muted,
    fontSize: 12
  }
});
