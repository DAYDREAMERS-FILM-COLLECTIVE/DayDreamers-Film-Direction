/**
 * src/screening/components/MovieGrid.tsx
 * "Now Screening" film catalog grid with selection indicators.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useScreeningStore } from '../store';
import { fetchShowings } from '../api';
import { THEME } from '../constants/theme';
import { Movie } from '../types';

interface MovieGridProps {
  onMovieSelected?: (movie: Movie) => void;
}

export const MovieGrid: React.FC<MovieGridProps> = ({ onMovieSelected }) => {
  const { movies, selectedMovie, selectMovie, setShowings } = useScreeningStore();

  const handleSelectMovie = async (movie: Movie) => {
    selectMovie(movie);
    const showings = await fetchShowings(movie.id);
    setShowings(showings, 0);
    if (onMovieSelected) {
      onMovieSelected(movie);
    }
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.headerArea}>
        <Text style={styles.tag}>CURRENT BILL</Text>
        <Text style={styles.sectionTitle}>Now Screening</Text>
        <Text style={styles.sectionDesc}>
          Select Reserve Seats on any title to load it in the box office below.
        </Text>
      </View>

      <View style={styles.gridContainer}>
        {movies.map((movie) => {
          const isSelected = selectedMovie?.id === movie.id;
          return (
            <Pressable
              key={movie.id}
              onPress={() => handleSelectMovie(movie)}
              style={({ pressed }) => [
                styles.movieCard,
                isSelected && styles.selectedCard,
                pressed && styles.cardPressed
              ]}
            >
              <View style={styles.cardTop}>
                {movie.poster_url ? (
                  <Image source={{ uri: movie.poster_url }} style={styles.thumbnail} />
                ) : (
                  <View style={[styles.fallbackThumb, { backgroundColor: movie.gradient[0] }]}>
                    <Text style={styles.thumbGlyph}>{movie.glyph}</Text>
                  </View>
                )}
                <View style={styles.cardMeta}>
                  <Text style={styles.movieTitle}>{movie.rawTitle || movie.title}</Text>
                  <Text style={styles.movieDirector}>{movie.dir}</Text>
                  <Text style={styles.movieTags}>{movie.genre} &bull; {movie.runtime}</Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <Text style={styles.hallText}>{movie.hall}</Text>
                <Text style={styles.reserveAction}>RESERVE SEATS &rarr;</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    paddingVertical: 36,
    paddingHorizontal: 20
  },
  headerArea: {
    marginBottom: 24
  },
  tag: {
    color: THEME.colors.plumAccent,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 4
  },
  sectionTitle: {
    color: THEME.colors.cream,
    fontSize: 28,
    fontWeight: '700',
    fontFamily: THEME.typography.titleFont,
    marginBottom: 8
  },
  sectionDesc: {
    color: THEME.colors.muted,
    fontSize: 13,
    maxWidth: 580
  },
  gridContainer: {
    gap: 16
  },
  movieCard: {
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 16
  },
  selectedCard: {
    borderColor: THEME.colors.plumAccent,
    borderWidth: 1.5,
    backgroundColor: THEME.colors.bg2
  },
  cardPressed: {
    opacity: 0.85
  },
  cardTop: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14
  },
  thumbnail: {
    width: 60,
    height: 90,
    borderRadius: 4
  },
  fallbackThumb: {
    width: 60,
    height: 90,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  thumbGlyph: {
    color: THEME.colors.gold,
    fontSize: 24,
    fontWeight: '800'
  },
  cardMeta: {
    flex: 1,
    justifyContent: 'center'
  },
  movieTitle: {
    color: THEME.colors.cream,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4
  },
  movieDirector: {
    color: THEME.colors.plumAccent,
    fontSize: 12,
    marginBottom: 6
  },
  movieTags: {
    color: THEME.colors.muted,
    fontSize: 11
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle
  },
  hallText: {
    color: THEME.colors.muted,
    fontSize: 12
  },
  reserveAction: {
    color: THEME.colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1
  }
});
