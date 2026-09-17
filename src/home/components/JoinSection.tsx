/**
 * src/home/components/JoinSection.tsx
 * Membership callout with direct society contact and reserve link.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLayoutStore } from '../../core/store/useLayoutStore';
import { THEME } from '../../screening/constants/theme';

export const JoinSection: React.FC = () => {
  const { setRoute, setTransitioning, setCursor, resetCursor } = useLayoutStore();

  const handleReserve = () => {
    setTransitioning(true);
    setTimeout(() => {
      setRoute('screening');
    }, 300);
  };

  return (
    <View style={styles.joinContainer} nativeID="join">
      <View style={styles.card}>
        <Text style={styles.tag}>JOIN THE COLLECTIVE</Text>
        <Text style={styles.heading}>Make films with us.</Text>
        <Text style={styles.desc}>
          Membership is open to all university students across all semesters and majors.
          No prior cinematography or editing experience is required—only curiosity.
        </Text>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={handleReserve}
            onHoverIn={() => setCursor('GO', 'RESERVE')}
            onHoverOut={resetCursor}
            style={({ pressed }) => [styles.btnSolid, pressed && styles.btnPressed]}
          >
            <Text style={styles.btnSolidText}>Reserve Upcoming Screening</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  joinContainer: {
    paddingVertical: 80,
    paddingHorizontal: 28,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
    alignItems: 'center'
  },
  card: {
    width: '100%',
    maxWidth: 760,
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center'
  },
  tag: {
    color: THEME.colors.plumAccent,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 12
  },
  heading: {
    color: THEME.colors.cream,
    fontSize: 38,
    fontWeight: '700',
    fontFamily: THEME.typography.titleFont,
    marginBottom: 16,
    textAlign: 'center'
  },
  desc: {
    color: THEME.colors.cream,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 540,
    opacity: 0.85,
    marginBottom: 28
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16
  },
  btnSolid: {
    backgroundColor: THEME.colors.plumAccent,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 6
  },
  btnSolidText: {
    color: THEME.colors.bg,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1
  },
  btnPressed: {
    opacity: 0.85
  }
});
