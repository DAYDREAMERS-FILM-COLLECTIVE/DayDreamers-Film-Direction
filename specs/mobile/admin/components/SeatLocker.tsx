/**
 * src/admin/components/SeatLocker.tsx
 * Visual seat locker grid allowing admins to lock VIP seats or release seats.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAdminStore } from '../store/useAdminStore';
import { toggleSeatLockApi } from '../services/adminApi';
import { ROWS, SEATS_PER_ROW } from '../../screening/constants/seatmapConfig';
import { THEME } from '../../screening/constants/theme';

export const SeatLocker: React.FC = () => {
  const { passkey, lockedSeats, setLockedSeats, bookedSeats } = useAdminStore();
  const [selectedShowingId] = useState('demo-showing-1');

  const handleSeatClick = async (seatId: string) => {
    if (bookedSeats.has(seatId)) return; // Cannot lock booked seats

    const isLocked = lockedSeats.has(seatId);
    const nextLocked = new Set(lockedSeats);
    if (isLocked) nextLocked.delete(seatId);
    else nextLocked.add(seatId);

    // Optimistic UI update
    setLockedSeats(nextLocked);

    await toggleSeatLockApi(selectedShowingId, seatId, !isLocked, passkey);
  };

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Seat Locker</Text>
      <Text style={styles.sectionDesc}>
        Manually lock VIP, reserved, or broken seats. Changes sync immediately with the public booking engine.
      </Text>

      <View style={styles.card}>
        {/* Screen Bar */}
        <View style={styles.screenBar}>
          <Text style={styles.screenText}>SCREEN</Text>
        </View>

        {/* 70 Seat Grid */}
        <View style={styles.grid}>
          {ROWS.map((row) => (
            <View key={row} style={styles.rowLine}>
              <Text style={styles.rowLabel}>{row}</Text>
              {Array.from({ length: SEATS_PER_ROW }).map((_, i) => {
                const seatId = `${row}${i + 1}`;
                const isBooked = bookedSeats.has(seatId);
                const isLocked = lockedSeats.has(seatId);

                const seatBg = isBooked
                  ? THEME.colors.red
                  : isLocked
                  ? THEME.colors.gold
                  : THEME.colors.bg2;

                const seatBorder = isLocked
                  ? THEME.colors.cream
                  : THEME.colors.border;

                return (
                  <Pressable
                    key={seatId}
                    disabled={isBooked}
                    onPress={() => handleSeatClick(seatId)}
                    style={[
                      styles.seatBtn,
                      { backgroundColor: seatBg, borderColor: seatBorder }
                    ]}
                  >
                    <Text
                      style={[
                        styles.seatText,
                        (isLocked || isBooked) && { color: THEME.colors.bg, fontWeight: '700' }
                      ]}
                    >
                      {seatId}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: THEME.colors.bg2 }]} />
            <Text style={styles.legendText}>Available (Click to Lock)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: THEME.colors.gold }]} />
            <Text style={styles.legendText}>Locked by Admin (Click to Unlock)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: THEME.colors.red }]} />
            <Text style={styles.legendText}>Booked by Attendee</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    flex: 1,
    padding: 28
  },
  sectionTitle: {
    color: THEME.colors.cream,
    fontSize: 26,
    fontWeight: '700',
    fontFamily: THEME.typography.titleFont,
    marginBottom: 6
  },
  sectionDesc: {
    color: THEME.colors.muted,
    fontSize: 13,
    marginBottom: 24
  },
  card: {
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 28,
    alignItems: 'center'
  },
  screenBar: {
    width: '70%',
    maxWidth: 360,
    height: 10,
    backgroundColor: THEME.colors.plumDark,
    borderRadius: 4,
    borderTopWidth: 2,
    borderColor: THEME.colors.plumAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  screenText: {
    color: THEME.colors.gold,
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: '700'
  },
  grid: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 24
  },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  rowLabel: {
    width: 20,
    color: THEME.colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center'
  },
  seatBtn: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  seatText: {
    color: THEME.colors.cream,
    fontSize: 9
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
    paddingTop: 16
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  legendText: {
    color: THEME.colors.cream,
    fontSize: 12
  }
});
