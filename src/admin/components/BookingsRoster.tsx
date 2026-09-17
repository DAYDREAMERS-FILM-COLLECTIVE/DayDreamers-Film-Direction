/**
 * src/admin/components/BookingsRoster.tsx
 * Attendee reservation roster with live search by USN/Name/Ref and CSV export.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useAdminStore } from '../store/useAdminStore';
import { fetchAdminBookings } from '../services/adminApi';
import { THEME } from '../../screening/constants/theme';
import { AdminBooking } from '../types';

export const BookingsRoster: React.FC = () => {
  const { passkey, bookings, setBookings } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAdminBookings(passkey).then(setBookings);
  }, []);

  const filtered = bookings.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.user_name.toLowerCase().includes(term) ||
      b.user_usn.toLowerCase().includes(term) ||
      b.ref_code.toLowerCase().includes(term) ||
      b.film_title.toLowerCase().includes(term)
    );
  });

  const exportCsv = () => {
    if (typeof window === 'undefined') return;
    const headers = 'Ref,Film,Attendee,USN,Email,Seat,Date,Time,Checked In\n';
    const rows = filtered
      .map(
        (b) =>
          `"${b.ref_code}","${b.film_title}","${b.user_name}","${b.user_usn}","${b.user_email}","${b.seat_designation}","${b.show_date}","${b.show_time}","${b.checked_in ? 'Yes' : 'No'}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daydreamers-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Attendee Bookings</Text>
        <View style={styles.actionsRow}>
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search USN, Name, Ref..."
            placeholderTextColor={THEME.colors.muted}
            style={styles.searchInput}
          />
          <Pressable onPress={exportCsv} style={styles.exportBtn}>
            <Text style={styles.exportBtnText}>Export CSV</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.tableCard} horizontal={true}>
        <View style={{ minWidth: 820 }}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { width: 90 }]}>Ref Code</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Film</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Attendee</Text>
            <Text style={[styles.th, { width: 120 }]}>USN</Text>
            <Text style={[styles.th, { width: 70 }]}>Seat</Text>
            <Text style={[styles.th, { width: 140 }]}>Date &amp; Time</Text>
            <Text style={[styles.th, { width: 90 }]}>Check-In</Text>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No reservations found matching search.</Text>
            </View>
          ) : (
            filtered.map((b) => (
              <View key={b.id || b.ref_code} style={styles.tableRow}>
                <Text style={[styles.td, styles.goldMono, { width: 90 }]}>{b.ref_code}</Text>
                <Text style={[styles.td, { flex: 1.5, fontWeight: '600' }]}>{b.film_title}</Text>
                <Text style={[styles.td, { flex: 1.5 }]}>{b.user_name}</Text>
                <Text style={[styles.td, styles.monoText, { width: 120 }]}>{b.user_usn}</Text>
                <Text style={[styles.td, styles.goldText, { width: 70 }]}>{b.seat_designation}</Text>
                <Text style={[styles.td, { width: 140 }]}>{b.show_date} | {b.show_time}</Text>
                <View style={{ width: 90 }}>
                  <Text style={[styles.statusBadge, b.checked_in ? styles.badgeCheckedIn : styles.badgePending]}>
                    {b.checked_in ? 'Arrived' : 'Pending'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    flex: 1,
    padding: 28
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  sectionTitle: {
    color: THEME.colors.cream,
    fontSize: 26,
    fontWeight: '700',
    fontFamily: THEME.typography.titleFont
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12
  },
  searchInput: {
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 6,
    color: THEME.colors.cream,
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: 220,
    fontSize: 13
  },
  exportBtn: {
    backgroundColor: THEME.colors.bg2,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center'
  },
  exportBtnText: {
    color: THEME.colors.cream,
    fontSize: 12,
    fontWeight: '600'
  },
  tableCard: {
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.bg2,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle
  },
  th: {
    color: THEME.colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle
  },
  td: {
    color: THEME.colors.cream,
    fontSize: 12
  },
  goldMono: {
    color: THEME.colors.gold,
    fontFamily: THEME.typography.monoFont,
    fontWeight: '700'
  },
  monoText: {
    fontFamily: THEME.typography.monoFont
  },
  goldText: {
    color: THEME.colors.gold,
    fontWeight: '700'
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    textAlign: 'center'
  },
  badgeCheckedIn: {
    backgroundColor: 'rgba(50, 200, 100, 0.2)',
    color: '#4ade80'
  },
  badgePending: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: THEME.colors.muted
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center'
  },
  emptyText: {
    color: THEME.colors.muted,
    fontSize: 13
  }
});
