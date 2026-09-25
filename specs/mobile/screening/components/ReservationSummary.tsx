/**
 * src/screening/components/ReservationSummary.tsx
 * Cart summary aside displaying selected movie, showing, picked seat badges,
 * mode toggle, and confirmation trigger.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useScreeningStore } from '../store';
import { THEME } from '../constants/theme';

interface ReservationSummaryProps {
  onConfirmPress: () => void;
}

export const ReservationSummary: React.FC<ReservationSummaryProps> = ({ onConfirmPress }) => {
  const { selectedMovie, pickedSeats, getActiveShowing, bookingMode, setBookingMode } = useScreeningStore();
  const activeShowing = getActiveShowing();
  const sortedSeats = [...pickedSeats].sort();
  const canConfirm = sortedSeats.length > 0 && !!selectedMovie && !!activeShowing;

  return (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryHeading}>Your Reservation</Text>

      {/* Mode Selector */}
      <View style={styles.modeToggleRow}>
        <Pressable
          onPress={() => setBookingMode('individual')}
          style={[styles.modeBtn, bookingMode === 'individual' && styles.activeModeBtn]}
        >
          <Text style={[styles.modeBtnText, bookingMode === 'individual' && styles.activeModeText]}>
            Individual (1)
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setBookingMode('group')}
          style={[styles.modeBtn, bookingMode === 'group' && styles.activeModeBtn]}
        >
          <Text style={[styles.modeBtnText, bookingMode === 'group' && styles.activeModeText]}>
            Group (Max 4)
          </Text>
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Film</Text>
        <Text style={styles.metaValue}>{selectedMovie?.rawTitle || selectedMovie?.title || 'Choose a film'}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Hall</Text>
        <Text style={styles.metaValue}>{activeShowing?.hall || 'See details'}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Date</Text>
        <Text style={styles.metaValue}>{activeShowing?.fullDateStr || 'Pick a date'}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Showtime</Text>
        <Text style={styles.metaValue}>{activeShowing?.time || '21:00'}</Text>
      </View>

      {/* Seats Picked Badges */}
      <View style={styles.chipsContainer}>
        {sortedSeats.length === 0 ? (
          <Text style={styles.emptyChipsText}>No seats selected yet.</Text>
        ) : (
          sortedSeats.map((seatId) => (
            <View key={seatId} style={styles.seatChip}>
              <Text style={styles.chipText}>{seatId}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.sumCountRow}>
        <Text style={styles.metaLabel}>Seats selected</Text>
        <Text style={styles.countNumber}>{sortedSeats.length}</Text>
      </View>

      <Pressable
        disabled={!canConfirm}
        onPress={onConfirmPress}
        style={({ pressed }) => [
          styles.confirmBtn,
          !canConfirm && styles.disabledConfirmBtn,
          pressed && canConfirm && styles.pressedConfirmBtn
        ]}
      >
        <Text style={styles.confirmBtnText}>Confirm Reservation</Text>
      </Pressable>

      <Text style={styles.tierNotes}>
        Rows A to B, Front{'\n'}Rows C to E, Prime{'\n'}Rows F to G, Recliner
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryContainer: {
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 20,
    width: '100%',
    maxWidth: 360
  },
  summaryHeading: {
    color: THEME.colors.cream,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: THEME.typography.titleFont,
    marginBottom: 16
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.bg2,
    borderRadius: 6,
    padding: 3,
    marginBottom: 16
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 4
  },
  activeModeBtn: {
    backgroundColor: THEME.colors.plumAccent
  },
  modeBtnText: {
    color: THEME.colors.muted,
    fontSize: 11,
    fontWeight: '600'
  },
  activeModeText: {
    color: THEME.colors.bg,
    fontWeight: '700'
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  metaLabel: {
    color: THEME.colors.muted,
    fontSize: 12
  },
  metaValue: {
    color: THEME.colors.cream,
    fontSize: 12,
    fontWeight: '600'
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 14,
    minHeight: 32,
    alignItems: 'center'
  },
  emptyChipsText: {
    color: THEME.colors.muted,
    fontSize: 12,
    fontStyle: 'italic'
  },
  seatChip: {
    backgroundColor: THEME.colors.plumAccent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4
  },
  chipText: {
    color: THEME.colors.bg,
    fontSize: 11,
    fontWeight: '700'
  },
  sumCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  countNumber: {
    color: THEME.colors.gold,
    fontSize: 18,
    fontWeight: '700'
  },
  confirmBtn: {
    backgroundColor: THEME.colors.plumAccent,
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  disabledConfirmBtn: {
    opacity: 0.35
  },
  pressedConfirmBtn: {
    opacity: 0.85
  },
  confirmBtnText: {
    color: THEME.colors.bg,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1
  },
  tierNotes: {
    color: THEME.colors.muted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center'
  }
});
