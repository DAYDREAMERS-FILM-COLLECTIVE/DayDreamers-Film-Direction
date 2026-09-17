/**
 * src/screening/components/BookingModal.tsx
 * Multi-step Attendee Registration and Cryptographic Ticket Pass Modal.
 * Integrates Zod validation schema for student USN & official @rvu.edu.in email uniqueness.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useScreeningStore } from '../store';
import { submitBooking } from '../api';
import { bookingFormSchema } from '../schema';
import { ConfirmedPass } from '../types';
import { THEME } from '../constants/theme';

interface AttendeeState {
  name: string;
  usn: string;
  email: string;
  seat: string;
}

export const BookingModal: React.FC = () => {
  const {
    isModalOpen,
    setModalOpen,
    pickedSeats,
    selectedMovie,
    getActiveShowing,
    bookingMode,
    clearPickedSeats
  } = useScreeningStore();

  const activeShowing = getActiveShowing();
  const sortedSeats = [...pickedSeats].sort();

  const [attendees, setAttendees] = useState<AttendeeState[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedPasses, setConfirmedPasses] = useState<ConfirmedPass[]>([]);

  // Synchronize attendee input rows when picked seats change
  useEffect(() => {
    if (isModalOpen && sortedSeats.length > 0) {
      setAttendees(
        sortedSeats.map((seat, i) => ({
          name: attendees[i]?.name || '',
          usn: attendees[i]?.usn || '',
          email: attendees[i]?.email || '',
          seat
        }))
      );
      setErrorMessage(null);
      setConfirmedPasses([]);
    }
  }, [isModalOpen, pickedSeats.join(',')]);

  const updateAttendee = (index: number, field: keyof AttendeeState, value: string) => {
    setAttendees((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setModalOpen(false);
    setErrorMessage(null);
    setConfirmedPasses([]);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);

    // 1. Zod schema validation
    const validation = bookingFormSchema.safeParse({ attendees });
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      setErrorMessage(firstIssue.message);
      return;
    }

    if (!activeShowing || !selectedMovie) {
      setErrorMessage('Selection error: active movie or showing not resolved.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      showingId: activeShowing.id,
      showing_id: activeShowing.id,
      bookingMode,
      attendees: attendees.map((a) => ({
        name: a.name.trim(),
        usn: a.usn.trim().toUpperCase(),
        email: a.email.trim().toLowerCase(),
        seat: a.seat
      }))
    };

    const res = await submitBooking(payload);
    setIsSubmitting(false);

    if (!res.ok) {
      setErrorMessage(res.data.error || res.data.message || `Server error (${res.status})`);
      return;
    }

    // Success: render confirmed passes
    const passes = res.data.bookings || (res.data.booking ? [res.data.booking] : []);
    setConfirmedPasses(passes);
    clearPickedSeats();
  };

  return (
    <Modal
      visible={isModalOpen}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.brandTitle}>DAYDREAMERS</Text>
              <Text style={styles.modalSubtitle}>
                {confirmedPasses.length > 0
                  ? 'Official Admission Pass'
                  : sortedSeats.length > 1
                  ? `Group Reservation (${sortedSeats.length} Seats)`
                  : 'Individual Reservation (1 Seat)'}
              </Text>
            </View>
            <Pressable
              disabled={isSubmitting}
              onPress={handleClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>&times;</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Step 1: Form View */}
            {confirmedPasses.length === 0 ? (
              <View>
                {/* Film Summary Pill */}
                <View style={styles.pillSummary}>
                  <Text style={styles.pillText}>
                    <Text style={styles.pillBold}>{selectedMovie?.rawTitle || selectedMovie?.title}</Text>
                    {'  '}&bull;{'  '}{activeShowing?.fullDateStr} | {activeShowing?.time}
                    {'  '}&bull;{'  '}<Text style={{ color: THEME.colors.gold }}>{sortedSeats.join(', ')}</Text>
                  </Text>
                </View>

                {/* Attendee Form Rows */}
                {attendees.map((attendee, index) => (
                  <View key={attendee.seat} style={styles.attendeeBlock}>
                    <View style={styles.attendeeBlockHeader}>
                      <Text style={styles.attendeeTitle}>
                        {attendees.length > 1 ? `Attendee #${index + 1}` : 'Attendee Details'}
                      </Text>
                      <View style={styles.seatBadge}>
                        <Text style={styles.seatBadgeText}>Seat {attendee.seat}</Text>
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Full Name *</Text>
                      <TextInput
                        value={attendee.name}
                        onChangeText={(val) => updateAttendee(index, 'name', val)}
                        placeholder="Student Name"
                        placeholderTextColor={THEME.colors.muted}
                        style={styles.textInput}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>University Serial Number (USN) *</Text>
                      <TextInput
                        value={attendee.usn}
                        onChangeText={(val) => updateAttendee(index, 'usn', val.toUpperCase())}
                        autoCapitalize="characters"
                        placeholder="e.g. 1RVU24CSE045"
                        placeholderTextColor={THEME.colors.muted}
                        style={[styles.textInput, styles.monoInput]}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>RVU Email (@rvu.edu.in or @blr.rvu.edu.in) *</Text>
                      <TextInput
                        value={attendee.email}
                        onChangeText={(val) => updateAttendee(index, 'email', val.toLowerCase())}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder="student@rvu.edu.in"
                        placeholderTextColor={THEME.colors.muted}
                        style={styles.textInput}
                      />
                    </View>
                  </View>
                ))}

                {/* Error Banner */}
                {errorMessage && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Submit Action */}
                <Pressable
                  disabled={isSubmitting}
                  onPress={handleSubmit}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    isSubmitting && styles.submitBtnDisabled,
                    pressed && !isSubmitting && styles.submitBtnPressed
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={THEME.colors.bg} />
                  ) : (
                    <Text style={styles.submitBtnText}>Confirm &amp; Generate Ticket Pass</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              /* Step 2: Confirmed Cryptographic Passes View */
              <View>
                {confirmedPasses.map((pass, pIdx) => (
                  <View key={pass.refCode || pIdx} style={styles.passCard}>
                    <View style={styles.passRow}>
                      <Text style={styles.passLabel}>Film</Text>
                      <Text style={styles.passValue}>{pass.filmTitle}</Text>
                    </View>
                    <View style={styles.passRow}>
                      <Text style={styles.passLabel}>Attendee</Text>
                      <Text style={styles.passValue}>{pass.userName}</Text>
                    </View>
                    <View style={styles.passRow}>
                      <Text style={styles.passLabel}>USN</Text>
                      <Text style={[styles.passValue, styles.goldMono]}>{pass.userUsn}</Text>
                    </View>
                    <View style={styles.passRow}>
                      <Text style={styles.passLabel}>Seat</Text>
                      <Text style={[styles.passValue, styles.goldMono]}>Seat {pass.seat}</Text>
                    </View>
                    <View style={styles.passRow}>
                      <Text style={styles.passLabel}>Ref Code</Text>
                      <Text style={[styles.passValue, styles.goldMono]}>{pass.refCode}</Text>
                    </View>

                    {/* QR Code Placeholder Graphic */}
                    <View style={styles.qrContainer}>
                      <Svg width={140} height={140} viewBox="0 0 140 140">
                        <Rect width="140" height="140" fill="#ffffff" rx={6} />
                        <Rect x="15" y="15" width="35" height="35" fill="#1A0B17" />
                        <Rect x="90" y="15" width="35" height="35" fill="#1A0B17" />
                        <Rect x="15" y="90" width="35" height="35" fill="#1A0B17" />
                        <Rect x="60" y="60" width="20" height="20" fill="#C89BB2" />
                      </Svg>
                      <Text style={styles.qrLabel}>SCAN AT DOOR</Text>
                    </View>
                  </View>
                ))}

                <Text style={styles.footerNote}>
                  Cryptographic pass issued. Present QR code at the hall door scanner.
                </Text>

                <Pressable onPress={handleClose} style={styles.doneBtn}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 5, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    overflow: 'hidden'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle
  },
  brandTitle: {
    color: THEME.colors.gold,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2
  },
  modalSubtitle: {
    color: THEME.colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  closeBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeBtnText: {
    color: THEME.colors.cream,
    fontSize: 26,
    lineHeight: 28
  },
  modalBody: {
    padding: 20
  },
  pillSummary: {
    backgroundColor: THEME.colors.bg2,
    padding: 12,
    borderRadius: 6,
    marginBottom: 16
  },
  pillText: {
    color: THEME.colors.cream,
    fontSize: 12
  },
  pillBold: {
    fontWeight: '700'
  },
  attendeeBlock: {
    backgroundColor: THEME.colors.bg,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16
  },
  attendeeBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  attendeeTitle: {
    color: THEME.colors.cream,
    fontSize: 13,
    fontWeight: '700'
  },
  seatBadge: {
    backgroundColor: THEME.colors.plumAccent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  seatBadgeText: {
    color: THEME.colors.bg,
    fontSize: 11,
    fontWeight: '700'
  },
  inputGroup: {
    marginBottom: 10
  },
  inputLabel: {
    color: THEME.colors.muted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4
  },
  textInput: {
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 6,
    color: THEME.colors.cream,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13
  },
  monoInput: {
    fontFamily: THEME.typography.monoFont
  },
  errorBox: {
    backgroundColor: THEME.colors.errorBg,
    borderWidth: 1,
    borderColor: THEME.colors.errorBorder,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16
  },
  errorText: {
    color: THEME.colors.errorText,
    fontSize: 12,
    lineHeight: 18
  },
  submitBtn: {
    backgroundColor: THEME.colors.plumAccent,
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10
  },
  submitBtnDisabled: {
    opacity: 0.5
  },
  submitBtnPressed: {
    opacity: 0.85
  },
  submitBtnText: {
    color: THEME.colors.bg,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1
  },
  passCard: {
    backgroundColor: THEME.colors.bg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16
  },
  passRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4
  },
  passLabel: {
    color: THEME.colors.muted,
    fontSize: 12
  },
  passValue: {
    color: THEME.colors.cream,
    fontSize: 12,
    fontWeight: '600'
  },
  goldMono: {
    color: THEME.colors.gold,
    fontFamily: THEME.typography.monoFont
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 18
  },
  qrLabel: {
    color: THEME.colors.muted,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 8
  },
  footerNote: {
    color: THEME.colors.muted,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 16
  },
  doneBtn: {
    backgroundColor: THEME.colors.plumAccent,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  doneBtnText: {
    color: THEME.colors.bg,
    fontSize: 13,
    fontWeight: '700'
  }
});
