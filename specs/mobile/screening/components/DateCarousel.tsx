/**
 * src/screening/components/DateCarousel.tsx
 * Horizontal date selection pills with previous/next scroll controls.
 */

import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useScreeningStore } from '../store';
import { THEME } from '../constants/theme';

export const DateCarousel: React.FC = () => {
  const { currentShowings, selectedShowingIdx, selectShowingIdx } = useScreeningStore();

  if (!currentShowings.length) return null;

  return (
    <View style={styles.carouselContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>NEXT SHOW</Text>
        <Text style={styles.timeText}>{currentShowings[selectedShowingIdx]?.time || '21:00'}</Text>
      </View>
      <View style={styles.divider} />

      <View style={styles.scrollRow}>
        <Pressable
          disabled={selectedShowingIdx === 0}
          onPress={() => selectShowingIdx(selectedShowingIdx - 1)}
          style={({ pressed }) => [
            styles.arrowButton,
            selectedShowingIdx === 0 && styles.disabledArrow,
            pressed && styles.pressedArrow
          ]}
        >
          <Text style={styles.arrowText}>&lt;</Text>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsList}
        >
          {currentShowings.map((showing, idx) => {
            const isActive = idx === selectedShowingIdx;
            return (
              <Pressable
                key={showing.id || idx}
                onPress={() => selectShowingIdx(idx)}
                style={[styles.dateCard, isActive && styles.activeDateCard]}
              >
                <Text style={[styles.dayNum, isActive && styles.activeText]}>
                  {showing.dayNum}
                </Text>
                <Text style={[styles.monthStr, isActive && styles.activeText]}>
                  {showing.monthStr}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          disabled={selectedShowingIdx === currentShowings.length - 1}
          onPress={() => selectShowingIdx(selectedShowingIdx + 1)}
          style={({ pressed }) => [
            styles.arrowButton,
            selectedShowingIdx === currentShowings.length - 1 && styles.disabledArrow,
            pressed && styles.pressedArrow
          ]}
        >
          <Text style={styles.arrowText}>&gt;</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 16,
    width: '100%',
    maxWidth: 320
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8
  },
  label: {
    color: THEME.colors.muted,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700'
  },
  timeText: {
    color: THEME.colors.gold,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: THEME.typography.monoFont
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.borderSubtle,
    marginVertical: 10
  },
  scrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  arrowButton: {
    width: 28,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.bg2,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    borderRadius: 4
  },
  arrowText: {
    color: THEME.colors.cream,
    fontSize: 14,
    fontWeight: '600'
  },
  disabledArrow: {
    opacity: 0.3
  },
  pressedArrow: {
    opacity: 0.7
  },
  pillsList: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 6
  },
  dateCard: {
    width: 52,
    height: 52,
    borderRadius: 6,
    backgroundColor: THEME.colors.bg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeDateCard: {
    backgroundColor: THEME.colors.plumAccent,
    borderColor: THEME.colors.cream
  },
  dayNum: {
    color: THEME.colors.cream,
    fontSize: 16,
    fontWeight: '700'
  },
  monthStr: {
    color: THEME.colors.muted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  activeText: {
    color: THEME.colors.bg
  }
});
