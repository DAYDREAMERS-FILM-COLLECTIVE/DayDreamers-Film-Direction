/**
 * src/home/HomeScreen.tsx
 * Root Home Page assembling cinematic Hero, Manifesto, Gallery, Activities, and Join sections.
 */

import React, { useRef } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { HeroSection } from './components/HeroSection';
import { ManifestoSection } from './components/ManifestoSection';
import { GallerySection } from './components/GallerySection';
import { ActivitiesSection } from './components/ActivitiesSection';
import { JoinSection } from './components/JoinSection';
import { Footer } from '../core/components/Footer';
import { THEME } from '../screening/constants/theme';

export const HomeScreen: React.FC = () => {
  const scrollRef = useRef<ScrollView>(null);

  const scrollToSection = (yOffset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: yOffset, animated: true });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 1. Hero Section */}
        <HeroSection onExplorePress={() => scrollToSection(600)} />

        {/* 2. Manifesto Split Section */}
        <ManifestoSection />

        {/* 3. Featured Reel / Past Events Gallery */}
        <GallerySection />

        {/* 4. Society Initiatives & Workshops */}
        <ActivitiesSection />

        {/* 5. Membership Callout */}
        <JoinSection />

        {/* 6. Society Footer */}
        <Footer />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg
  },
  scrollView: {
    flex: 1
  }
});
