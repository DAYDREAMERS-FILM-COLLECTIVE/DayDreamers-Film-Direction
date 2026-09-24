/**
 * src/screening/components/Seatmap.tsx
 * Cinema seating chart with cross-platform 3D amphitheater perspective.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useScreeningStore } from '../store';
import { ROWS, SEATS_PER_ROW, getSeatTransform } from '../constants/seatmapConfig';
import { SeatButton } from './SeatButton';
import { SeatmapViewport } from './SeatmapViewport';
import { THEME } from '../constants/theme';

export const Seatmap: React.FC = () => {
  const {
    selectedMovie,
    pickedSeats,
    occupiedSeats,
    toggleSeat,
    is2DFallback
  } = useScreeningStore();

  if (!selectedMovie) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Choose a film above to load the seating plan.</Text>
      </View>
    );
  }

  const pickedSet = new Set(pickedSeats);

  return (
    <View style={styles.hallWrapper}>
      <SeatmapViewport>
        {/* Curved Cinema Screen */}
        <View style={styles.screenWrapper}>
          <View style={styles.screenBar}>
            <Text style={styles.screenText}>SCREEN</Text>
          </View>
        </View>

        {/* Rows Grid */}
        <View style={styles.gridContainer}>
          {ROWS.map((rowLetter, rowIndex) => (
            <View key={rowLetter} style={styles.rowLine}>
              <Text style={styles.rowLabel}>{rowLetter}</Text>
              <View style={styles.sideAisle} />

              {Array.from({ length: SEATS_PER_ROW }).map((_, seatIdx) => {
                const seatNum = seatIdx + 1;
                const seatId = `${rowLetter}${seatNum}`;
                const isOccupied = occupiedSeats.has(seatId);
                const isSelected = pickedSet.has(seatId);
                const transformStyle = getSeatTransform(seatIdx, is2DFallback);

                return (
                  <View key={seatId} style={transformStyle}>
                    <SeatButton
                      id={seatId}
                      isOccupied={isOccupied}
                      isSelected={isSelected}
                      onPress={toggleSeat}
                    />
                  </View>
                );
              })}

              <View style={styles.sideAisle} />
            </View>
          ))}
        </View>

        {/* Seat Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: THEME.colors.seatAvailable }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: THEME.colors.seatSelected }]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: THEME.colors.seatOccupied }]} />
            <Text style={styles.legendText}>Occupied</Text>
          </View>
        </View>
      </SeatmapViewport>
    </View>
  );
};

const styles = StyleSheet.create({
  hallWrapper: {
    width: '100%',
    paddingVertical: 24,
    alignItems: 'center'
  },
  emptyContainer: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    color: THEME.colors.muted,
    fontSize: 14,
    fontFamily: THEME.typography.bodyFont
  },
  screenWrapper: {
    width: '85%',
    maxWidth: 420,
    marginBottom: 28,
    alignItems: 'center'
  },
  screenBar: {
    width: '100%',
    height: 12,
    backgroundColor: THEME.colors.plumDark,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    borderTopWidth: 2,
    borderColor: THEME.colors.plumAccent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.plumAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4
  },
  screenText: {
    color: THEME.colors.gold,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '700'
  },
  gridContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4
  },
  rowLabel: {
    width: 20,
    textAlign: 'center',
    color: THEME.colors.muted,
    fontSize: 11,
    fontWeight: '600'
  },
  sideAisle: {
    width: 12
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
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
    fontSize: 12,
    fontFamily: THEME.typography.bodyFont
  }
});
