/**
 * src/screening/components/HeroSection.tsx
 * Hero billboard with movie details, poster artwork, and reservation action.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { useScreeningStore } from '../store';
import { DateCarousel } from './DateCarousel';
import { THEME } from '../constants/theme';

interface HeroSectionProps {
  onReservePress: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onReservePress }) => {
  const { selectedMovie } = useScreeningStore();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;

  if (!selectedMovie) return null;

  return (
    <View style={[styles.heroContainer, isDesktop ? styles.desktopLayout : styles.mobileLayout]}>
      {/* 1. Left: Poster Artwork Frame */}
      <View style={styles.posterContainer}>
        {selectedMovie.poster_url ? (
          <Image
            source={{ uri: selectedMovie.poster_url }}
            style={styles.posterImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.posterFallback,
              { backgroundColor: selectedMovie.gradient[0] || THEME.colors.plumDark }
            ]}
          >
            <Text style={styles.glyphText}>{selectedMovie.glyph}</Text>
          </View>
        )}
      </View>

      {/* 2. Center: Movie Information */}
      <View style={styles.infoContainer}>
        <Text style={styles.eyebrow}>{selectedMovie.hall.toUpperCase()}</Text>
        <Text style={styles.title}>{selectedMovie.rawTitle || selectedMovie.title}</Text>
        <Text style={styles.director}>— {selectedMovie.dir.toUpperCase()}</Text>
        <Text style={styles.metadata}>
          {selectedMovie.genre}  |  {selectedMovie.runtime}  |  {selectedMovie.year}  |  {selectedMovie.rating}
        </Text>
        <Text style={styles.blurb}>{selectedMovie.blurb}</Text>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={onReservePress}
            style={({ pressed }) => [styles.reserveBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.reserveBtnText}>Reserve Seats</Text>
          </Pressable>
        </View>
      </View>

      {/* 3. Right: Showtimes & Date Carousel */}
      <View style={styles.datesColumn}>
        <DateCarousel />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle
  },
  desktopLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 32
  },
  mobileLayout: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24
  },
  posterContainer: {
    width: 200,
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  posterImage: {
    width: '100%',
    height: '100%'
  },
  posterFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  glyphText: {
    fontSize: 72,
    fontWeight: '800',
    color: THEME.colors.gold
  },
  infoContainer: {
    flex: 1,
    maxWidth: 520
  },
  eyebrow: {
    color: THEME.colors.plumAccent,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 6
  },
  title: {
    color: THEME.colors.cream,
    fontSize: 34,
    fontWeight: '700',
    fontFamily: THEME.typography.titleFont,
    marginBottom: 6
  },
  director: {
    color: THEME.colors.gold,
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 12
  },
  metadata: {
    color: THEME.colors.muted,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 14
  },
  blurb: {
    color: THEME.colors.cream,
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.85,
    marginBottom: 20
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 14
  },
  reserveBtn: {
    backgroundColor: THEME.colors.plumAccent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6
  },
  reserveBtnText: {
    color: THEME.colors.bg,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }]
  },
  datesColumn: {
    alignItems: 'center',
    justifyContent: 'center'
  }
});
