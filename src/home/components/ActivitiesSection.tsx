/**
 * src/home/components/ActivitiesSection.tsx
 * Club initiatives, workshops, and weekly screenings.
 */

import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { THEME } from '../../screening/constants/theme';
import { ActivityItem } from '../types';

const ACTIVITIES: ActivityItem[] = [
  {
    number: '01',
    title: 'Bi-Weekly Screenings',
    desc: 'Curated double-features in D Block with director commentaries and member-led open floor debates.'
  },
  {
    number: '02',
    title: 'Camera & Lighting Labs',
    desc: 'Hands-on workshops covering anamorphic lenses, Three-point studio lighting, and color science in DaVinci Resolve.'
  },
  {
    number: '03',
    title: 'Writer Room & Pitch Labs',
    desc: 'Developing student short film treatments from first prompt to production-ready shooting scripts.'
  }
];

export const ActivitiesSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.headerBox}>
        <Text style={styles.tag}>CAMPUS INITIATIVES</Text>
        <Text style={styles.title}>What We Do</Text>
      </View>

      <View style={[styles.grid, isDesktop ? styles.rowGrid : styles.colGrid]}>
        {ACTIVITIES.map((item) => (
          <View key={item.number} style={styles.activityCard}>
            <Text style={styles.cardNum}>{item.number}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    paddingVertical: 80,
    paddingHorizontal: 28,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle
  },
  headerBox: {
    marginBottom: 36
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
    fontFamily: THEME.typography.titleFont
  },
  grid: {
    gap: 20
  },
  rowGrid: {
    flexDirection: 'row'
  },
  colGrid: {
    flexDirection: 'column'
  },
  activityCard: {
    flex: 1,
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 24
  },
  cardNum: {
    color: THEME.colors.gold,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: THEME.typography.monoFont,
    marginBottom: 12
  },
  cardTitle: {
    color: THEME.colors.cream,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10
  },
  cardDesc: {
    color: THEME.colors.muted,
    fontSize: 13,
    lineHeight: 22
  }
});
