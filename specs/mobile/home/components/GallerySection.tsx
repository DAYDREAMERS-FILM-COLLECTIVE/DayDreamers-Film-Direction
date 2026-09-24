/**
 * src/home/components/GallerySection.tsx
 * Past events & showcase reel gallery cards.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { THEME } from '../../screening/constants/theme';
import { ReelItem } from '../types';

const REEL_ITEMS: ReelItem[] = [
  {
    id: '1',
    title: 'Echoes in Monolith',
    category: 'SHORT FILM',
    year: '2024',
    tag: 'Jury Winner',
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '2',
    title: 'Late Transit',
    category: 'DOCUMENTARY',
    year: '2023',
    tag: 'Audience Choice',
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '3',
    title: 'Halogen Solitude',
    category: 'EXPERIMENTAL',
    year: '2024',
    tag: 'Official Selection',
    image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80'
  }
];

export const GallerySection: React.FC = () => {
  return (
    <View style={styles.galleryContainer} nativeID="gallery">
      <View style={styles.headerBox}>
        <Text style={styles.tag}>PAST ARCHIVE</Text>
        <Text style={styles.title}>Featured Society Films</Text>
        <Text style={styles.desc}>
          Selected works conceived, written, and produced by Daydreamers society cohorts.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsRow}
      >
        {REEL_ITEMS.map((item) => (
          <View key={item.id} style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.cardImage} />
            <View style={styles.cardOverlay}>
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>{item.tag}</Text>
              </View>
              <View>
                <Text style={styles.categoryText}>{item.category} &bull; {item.year}</Text>
                <Text style={styles.filmTitle}>{item.title}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  galleryContainer: {
    paddingVertical: 80,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle
  },
  headerBox: {
    paddingHorizontal: 28,
    marginBottom: 32
  },
  tag: {
    color: THEME.colors.plumAccent,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 8
  },
  title: {
    color: THEME.colors.cream,
    fontSize: 34,
    fontWeight: '700',
    fontFamily: THEME.typography.titleFont,
    marginBottom: 8
  },
  desc: {
    color: THEME.colors.muted,
    fontSize: 14,
    maxWidth: 500
  },
  cardsRow: {
    paddingHorizontal: 28,
    gap: 20
  },
  card: {
    width: 320,
    height: 440,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border
  },
  cardImage: {
    width: '100%',
    height: '100%'
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(26, 11, 23, 0.45)'
  },
  tagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.plumDark,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  tagText: {
    color: THEME.colors.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1
  },
  categoryText: {
    color: THEME.colors.plumAccent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4
  },
  filmTitle: {
    color: THEME.colors.cream,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: THEME.typography.titleFont
  }
});
