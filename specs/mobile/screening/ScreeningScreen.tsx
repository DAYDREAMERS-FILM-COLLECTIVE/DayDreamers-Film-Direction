/**
 * src/screening/ScreeningScreen.tsx
 * Root Screening & Seat Reservation Screen for React Native.
 * Orchestrates movie catalog, 3D amphitheater seatmap, frame scrub showcase, and reservation modal.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions
} from 'react-native';
import { useScreeningStore } from './store';
import { fetchMovies, fetchShowings, fetchSeatStatus } from './api';
import { HeroSection } from './components/HeroSection';
import { MovieGrid } from './components/MovieGrid';
import { ScrubShowcase } from './components/ScrubShowcase';
import { Seatmap } from './components/Seatmap';
import { ReservationSummary } from './components/ReservationSummary';
import { BookingModal } from './components/BookingModal';
import { THEME } from './constants/theme';

export const ScreeningScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    setMovies,
    selectMovie,
    setShowings,
    setOccupiedSeats,
    setModalOpen,
    getActiveShowing,
    selectedMovie
  } = useScreeningStore();

  const [scrubProgress, setScrubProgress] = useState(0);
  const [bookingLayoutY, setBookingLayoutY] = useState(0);

  // Initialize catalog data
  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      const movies = await fetchMovies();
      if (!isMounted) return;
      setMovies(movies);

      if (movies.length > 0) {
        selectMovie(movies[0]);
        const showings = await fetchShowings(movies[0].id);
        if (!isMounted) return;
        setShowings(showings, 0);

        if (showings.length > 0) {
          const occupied = await fetchSeatStatus(showings[0].id);
          if (!isMounted) return;
          setOccupiedSeats(occupied);
        }
      }
    }

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update live seat availability when showing changes
  const activeShowing = getActiveShowing();
  useEffect(() => {
    if (activeShowing?.id) {
      fetchSeatStatus(activeShowing.id).then((occupied) => {
        setOccupiedSeats(occupied);
      });
    }
  }, [activeShowing?.id]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const currentY = contentOffset.y;
    const maxScroll = contentSize.height - layoutMeasurement.height;

    if (maxScroll > 0) {
      const progress = Math.min(1, Math.max(0, currentY / (layoutMeasurement.height * 1.5)));
      setScrubProgress(progress);
    }
  };

  const scrollToBooking = () => {
    if (bookingLayoutY > 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: bookingLayoutY, animated: true });
    }
  };

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <Text style={styles.brandTitle}>DAYDREAMERS</Text>
          <Text style={styles.navSubtitle}>BOX OFFICE</Text>
        </View>

        {/* 1. Hero Section */}
        <HeroSection onReservePress={scrollToBooking} />

        {/* 2. Now Screening Bill */}
        <MovieGrid onMovieSelected={() => scrollToBooking()} />

        {/* 3. Featured Presentation 60-Frame Scrub Showcase */}
        <ScrubShowcase progress={scrubProgress} onReservePress={scrollToBooking} />

        {/* 4. Box Office & Seating Chart */}
        <View
          onLayout={(e) => setBookingLayoutY(e.nativeEvent.layout.y)}
          style={styles.bookingSection}
        >
          <View style={styles.bookingHead}>
            <Text style={styles.eyebrow}>ADMIT ONE, BOX OFFICE</Text>
            <Text style={styles.sectionTitle}>Select Your Seat</Text>
            <Text style={styles.sectionSubtitle}>
              {selectedMovie
                ? `${selectedMovie.rawTitle || selectedMovie.title} • ${activeShowing?.fullDateStr || ''} • ${activeShowing?.time || ''}`
                : 'Browse the bill above to begin your reservation.'}
            </Text>
          </View>

          <View style={[styles.bookingContent, isDesktop ? styles.desktopRow : styles.mobileCol]}>
            <View style={styles.seatmapCol}>
              <Seatmap />
            </View>
            <View style={styles.summaryCol}>
              <ReservationSummary onConfirmPress={() => setModalOpen(true)} />
            </View>
          </View>
        </View>

        {/* 5. Venue Information */}
        <View style={styles.venueSection}>
          <Text style={styles.eyebrow}>VENUE</Text>
          <Text style={styles.sectionTitle}>The Screening Room</Text>
          <Text style={styles.venueDesc}>
            All club screenings are held on campus. The hall for each title is fixed and printed on your ticket.
          </Text>

          <View style={[styles.venueCardsRow, isDesktop ? styles.venueDesktop : styles.venueMobile]}>
            <View style={styles.venueCard}>
              <Text style={styles.cardNum}>Hall 01</Text>
              <Text style={styles.cardTitle}>D Block, 3rd Floor</Text>
              <Text style={styles.cardBody}>
                Main club screening room with rows A to G. Doors open 30 minutes before showtime.
              </Text>
            </View>
            <View style={styles.venueCard}>
              <Text style={styles.cardNum}>Hall 02</Text>
              <Text style={styles.cardTitle}>D Block, 4th Floor</Text>
              <Text style={styles.cardBody}>
                Second screening room used for overflow and repeat shows.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Multi-Attendee Ticket Modal */}
      <BookingModal />
    </View>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: THEME.colors.bg
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 60
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle
  },
  brandTitle: {
    color: THEME.colors.cream,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2
  },
  navSubtitle: {
    color: THEME.colors.plumAccent,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700'
  },
  bookingSection: {
    paddingVertical: 40,
    paddingHorizontal: 20
  },
  bookingHead: {
    alignItems: 'center',
    marginBottom: 28
  },
  eyebrow: {
    color: THEME.colors.plumAccent,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 6
  },
  sectionTitle: {
    color: THEME.colors.cream,
    fontSize: 30,
    fontWeight: '700',
    fontFamily: THEME.typography.titleFont,
    marginBottom: 6
  },
  sectionSubtitle: {
    color: THEME.colors.muted,
    fontSize: 13,
    textAlign: 'center'
  },
  bookingContent: {
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 32
  },
  desktopRow: {
    flexDirection: 'row'
  },
  mobileCol: {
    flexDirection: 'column',
    alignItems: 'center'
  },
  seatmapCol: {
    flex: 1,
    width: '100%',
    alignItems: 'center'
  },
  summaryCol: {
    alignItems: 'center'
  },
  venueSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
    alignItems: 'center'
  },
  venueDesc: {
    color: THEME.colors.muted,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 500,
    marginBottom: 28
  },
  venueCardsRow: {
    width: '100%',
    maxWidth: 800,
    gap: 20
  },
  venueDesktop: {
    flexDirection: 'row'
  },
  venueMobile: {
    flexDirection: 'column'
  },
  venueCard: {
    flex: 1,
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 20
  },
  cardNum: {
    color: THEME.colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8
  },
  cardTitle: {
    color: THEME.colors.cream,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8
  },
  cardBody: {
    color: THEME.colors.muted,
    fontSize: 12,
    lineHeight: 18
  }
});
