/**
 * src/home/components/HeroSection.tsx
 * Home page cinematic hero with floating badge and callout.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLayoutStore } from '../../core/store/useLayoutStore';
import { THEME } from '../../screening/constants/theme';

interface HeroSectionProps {
  onExplorePress: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onExplorePress }) => {
  const { setCursor, resetCursor } = useLayoutStore();

  return (
    <View style={styles.heroContainer}>
      <View style={styles.contentBox}>
        <Text style={styles.eyebrow}>
          &bull; DAYDREAMERS &middot; STUDENT FILM SOCIETY
        </Text>

        <Text style={styles.mainTitle}>
          Create.{'\n'}
          <Text style={styles.italicTitle}>Learn.</Text> Connect.
        </Text>

        <Text style={styles.introText}>
          A student-led filmmaking community for creating, discussing and exploring
          cinema and storytelling on campus.
        </Text>

        <Pressable
          onPress={onExplorePress}
          onHoverIn={() => setCursor('GO', 'EXPLORE')}
          onHoverOut={resetCursor}
          style={({ pressed }) => [styles.ctaLink, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>Explore Daydreamers &darr;</Text>
        </Pressable>
      </View>

      <View style={styles.stampBadge}>
        <Text style={styles.stampText}>
          CREATE &middot; LEARN{'\n'}DISCUSS &middot; CONNECT
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    minHeight: 640,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 80,
    position: 'relative'
  },
  contentBox: {
    maxWidth: 620
  },
  eyebrow: {
    color: THEME.colors.plumAccent,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 16
  },
  mainTitle: {
    color: THEME.colors.cream,
    fontSize: 54,
    lineHeight: 62,
    fontWeight: '700',
    fontFamily: THEME.typography.titleFont,
    marginBottom: 20
  },
  italicTitle: {
    fontStyle: 'italic',
    color: THEME.colors.gold
  },
  introText: {
    color: THEME.colors.cream,
    fontSize: 16,
    lineHeight: 26,
    opacity: 0.85,
    marginBottom: 32
  },
  ctaLink: {
    alignSelf: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.gold,
    paddingBottom: 4
  },
  ctaText: {
    color: THEME.colors.gold,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1
  },
  ctaPressed: {
    opacity: 0.7
  },
  stampBadge: {
    position: 'absolute',
    right: 28,
    bottom: 40,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    borderRadius: 6,
    padding: 12,
    backgroundColor: THEME.colors.panel
  },
  stampText: {
    color: THEME.colors.muted,
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: THEME.typography.monoFont
  }
});
