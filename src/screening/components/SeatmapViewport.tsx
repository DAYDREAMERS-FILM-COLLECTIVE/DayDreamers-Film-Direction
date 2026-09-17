/**
 * src/screening/components/SeatmapViewport.tsx
 * Responsive wrapper for the seat map hall.
 * Automatically activates horizontal scrolling on mobile screens (<600px).
 */

import React from 'react';
import { ScrollView, View, useWindowDimensions, StyleSheet } from 'react-native';

interface SeatmapViewportProps {
  children: React.ReactNode;
}

export const SeatmapViewport: React.FC<SeatmapViewportProps> = ({ children }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  if (isMobile) {
    return (
      <ScrollView
        horizontal
        bounces={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScrollContainer}
      >
        <View style={styles.mobileInnerHall}>{children}</View>
      </ScrollView>
    );
  }

  return <View style={styles.desktopInnerHall}>{children}</View>;
};

const styles = StyleSheet.create({
  horizontalScrollContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mobileInnerHall: {
    minWidth: 460,
    alignItems: 'center'
  },
  desktopInnerHall: {
    width: '100%',
    alignItems: 'center'
  }
});
