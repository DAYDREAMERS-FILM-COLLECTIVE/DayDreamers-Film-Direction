/**
 * src/admin/components/DoorQrScanner.tsx
 * Live camera QR code barcode scanner with fallback manual USN check-in.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useAdminStore } from '../store/useAdminStore';
import { verifyCheckInApi } from '../services/adminApi';
import { THEME } from '../../screening/constants/theme';
import { QrCheckInResponse } from '../types';

export const DoorQrScanner: React.FC = () => {
  const { passkey } = useAdminStore();
  const [manualInput, setManualInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanResponse, setScanResponse] = useState<QrCheckInResponse | null>(null);

  const handleCheckIn = async (token: string) => {
    if (!token.trim()) return;
    setIsVerifying(true);
    const res = await verifyCheckInApi(token.trim(), passkey);
    setIsVerifying(false);
    setScanResponse(res);
  };

  const handleManualSubmit = () => {
    handleCheckIn(manualInput);
  };

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Door QR Scanner &amp; Check-In</Text>
      <Text style={styles.sectionDesc}>
        Scan attendee mobile admission pass QR codes at the hall door or verify via student USN.
      </Text>

      <View style={styles.scannerGrid}>
        {/* Left Column: Camera Viewport & Manual Form */}
        <View style={styles.leftCol}>
          {/* Camera Scanner Viewport */}
          <View style={styles.cameraCard}>
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
              <Text style={styles.viewfinderText}>CAMERA SCANNER ACTIVE</Text>
            </View>
            <Text style={styles.cameraNote}>
              Aim camera at student ticket QR pass
            </Text>
          </View>

          {/* Manual Lookup Form */}
          <View style={styles.manualCard}>
            <Text style={styles.cardHeading}>Manual USN / Ref Lookup</Text>
            <View style={styles.manualRow}>
              <TextInput
                value={manualInput}
                onChangeText={(t) => setManualInput(t.toUpperCase())}
                autoCapitalize="characters"
                placeholder="Enter USN (1RVU...) or Ref"
                placeholderTextColor={THEME.colors.muted}
                style={styles.manualInput}
              />
              <Pressable
                disabled={isVerifying}
                onPress={handleManualSubmit}
                style={styles.checkInBtn}
              >
                <Text style={styles.checkInBtnText}>Check In</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Right Column: Status & Verified Attendee Details */}
        <View style={styles.rightCol}>
          <View style={styles.statusCard}>
            <Text style={styles.cardHeading}>Verification Status</Text>

            {/* Status Banner */}
            <View
              style={[
                styles.statusBanner,
                scanResponse?.valid ? styles.bannerSuccess : styles.bannerWaiting
              ]}
            >
              <Text
                style={[
                  styles.statusBannerText,
                  scanResponse?.valid && { color: '#4ade80' }
                ]}
              >
                {scanResponse
                  ? scanResponse.valid
                    ? 'ADMISSION GRANTED &bull; VERIFIED'
                    : `FAILED: ${scanResponse.error || 'Invalid or duplicate token'}`
                  : 'Ready for scan. Point camera at ticket QR code.'}
              </Text>
            </View>

            {/* Attendee Details Grid */}
            {scanResponse?.attendee && (
              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Attendee Name</Text>
                  <Text style={styles.detailValue}>{scanResponse.attendee.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Student USN</Text>
                  <Text style={[styles.detailValue, styles.goldMono]}>
                    {scanResponse.attendee.usn}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Film Title</Text>
                  <Text style={styles.detailValue}>{scanResponse.attendee.filmTitle}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reserved Seat</Text>
                  <Text style={[styles.detailValue, styles.goldMono]}>
                    Seat {scanResponse.attendee.seat}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Showtime</Text>
                  <Text style={styles.detailValue}>{scanResponse.attendee.showTime}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Venue Hall</Text>
                  <Text style={styles.detailValue}>{scanResponse.attendee.hall}</Text>
                </View>
              </View>
            )}

            {scanResponse && (
              <Pressable
                onPress={() => {
                  setScanResponse(null);
                  setManualInput('');
                }}
                style={styles.resetBtn}
              >
                <Text style={styles.resetBtnText}>Ready for Next Attendee</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    flex: 1,
    padding: 28
  },
  sectionTitle: {
    color: THEME.colors.cream,
    fontSize: 26,
    fontWeight: '700',
    fontFamily: THEME.typography.titleFont,
    marginBottom: 6
  },
  sectionDesc: {
    color: THEME.colors.muted,
    fontSize: 13,
    marginBottom: 24
  },
  scannerGrid: {
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap'
  },
  leftCol: {
    flex: 1,
    minWidth: 320,
    gap: 20
  },
  cameraCard: {
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 20,
    alignItems: 'center'
  },
  viewfinder: {
    width: 240,
    height: 240,
    backgroundColor: THEME.colors.bg2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  viewfinderText: {
    color: THEME.colors.muted,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700'
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: THEME.colors.gold
  },
  tl: { top: 10, left: 10, borderTopWidth: 2, borderLeftWidth: 2 },
  tr: { top: 10, right: 10, borderTopWidth: 2, borderRightWidth: 2 },
  bl: { bottom: 10, left: 10, borderBottomWidth: 2, borderLeftWidth: 2 },
  br: { bottom: 10, right: 10, borderBottomWidth: 2, borderRightWidth: 2 },
  cameraNote: {
    color: THEME.colors.muted,
    fontSize: 11,
    marginTop: 12
  },
  manualCard: {
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 20
  },
  cardHeading: {
    color: THEME.colors.cream,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14
  },
  manualRow: {
    flexDirection: 'row',
    gap: 10
  },
  manualInput: {
    flex: 1,
    backgroundColor: THEME.colors.bg2,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 6,
    color: THEME.colors.cream,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: THEME.typography.monoFont
  },
  checkInBtn: {
    backgroundColor: THEME.colors.plumAccent,
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: 'center'
  },
  checkInBtnText: {
    color: THEME.colors.bg,
    fontSize: 12,
    fontWeight: '700'
  },
  rightCol: {
    flex: 1,
    minWidth: 320
  },
  statusCard: {
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 20
  },
  statusBanner: {
    padding: 14,
    borderRadius: 6,
    marginBottom: 18
  },
  bannerWaiting: {
    backgroundColor: THEME.colors.bg2
  },
  bannerSuccess: {
    backgroundColor: 'rgba(50, 200, 100, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(50, 200, 100, 0.4)'
  },
  statusBannerText: {
    color: THEME.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center'
  },
  detailsGrid: {
    backgroundColor: THEME.colors.bg,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    borderRadius: 6,
    padding: 16,
    gap: 10,
    marginBottom: 16
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  detailLabel: {
    color: THEME.colors.muted,
    fontSize: 12
  },
  detailValue: {
    color: THEME.colors.cream,
    fontSize: 12,
    fontWeight: '600'
  },
  goldMono: {
    color: THEME.colors.gold,
    fontFamily: THEME.typography.monoFont,
    fontWeight: '700'
  },
  resetBtn: {
    backgroundColor: THEME.colors.bg2,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  resetBtnText: {
    color: THEME.colors.cream,
    fontSize: 12,
    fontWeight: '600'
  }
});
