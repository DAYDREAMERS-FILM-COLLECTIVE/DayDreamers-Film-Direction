/**
 * src/admin/components/FilmCatalogue.tsx
 * Management interface for screening movies: list, add, and delete films.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useAdminStore } from '../store/useAdminStore';
import { fetchAdminMovies, createAdminMovie, deleteAdminMovie } from '../services/adminApi';
import { THEME } from '../../screening/constants/theme';
import { AdminMovie } from '../types';

export const FilmCatalogue: React.FC = () => {
  const { passkey, movies, setMovies } = useAdminStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formState, setFormState] = useState({
    title: '',
    director: '',
    genre: '',
    runtime: '',
    hall: 'D Block 3rd Floor',
    poster_url: '',
    blurb: ''
  });

  const loadData = async () => {
    const list = await fetchAdminMovies(passkey);
    setMovies(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (!formState.title.trim()) return;
    const ok = await createAdminMovie(formState, passkey);
    if (ok) {
      setShowAddForm(false);
      setFormState({
        title: '',
        director: '',
        genre: '',
        runtime: '',
        hall: 'D Block 3rd Floor',
        poster_url: '',
        blurb: ''
      });
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteAdminMovie(id, passkey);
    if (ok) loadData();
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Film Catalogue</Text>
        <Pressable
          onPress={() => setShowAddForm(!showAddForm)}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>
            {showAddForm ? 'Cancel' : '+ Add New Film'}
          </Text>
        </Pressable>
      </View>

      {/* Add Movie Form */}
      {showAddForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add Film to Schedule</Text>
          <View style={styles.formGrid}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                value={formState.title}
                onChangeText={(t) => setFormState({ ...formState, title: t })}
                placeholder="e.g. Neon Reverie"
                placeholderTextColor={THEME.colors.muted}
                style={styles.textInput}
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Director *</Text>
              <TextInput
                value={formState.director}
                onChangeText={(t) => setFormState({ ...formState, director: t })}
                placeholder="e.g. A. Moreau"
                placeholderTextColor={THEME.colors.muted}
                style={styles.textInput}
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Genre</Text>
              <TextInput
                value={formState.genre}
                onChangeText={(t) => setFormState({ ...formState, genre: t })}
                placeholder="e.g. Sci-Fi"
                placeholderTextColor={THEME.colors.muted}
                style={styles.textInput}
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Runtime</Text>
              <TextInput
                value={formState.runtime}
                onChangeText={(t) => setFormState({ ...formState, runtime: t })}
                placeholder="e.g. 2H 14M"
                placeholderTextColor={THEME.colors.muted}
                style={styles.textInput}
              />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable onPress={() => setShowAddForm(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save Film</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Movies List Table */}
      <ScrollView style={styles.tableCard} horizontal={true}>
        <View style={{ minWidth: 680 }}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { flex: 2 }]}>Film Title</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Director</Text>
            <Text style={[styles.th, { flex: 1 }]}>Genre</Text>
            <Text style={[styles.th, { flex: 1 }]}>Runtime</Text>
            <Text style={[styles.th, { width: 80, textAlign: 'right' }]}>Actions</Text>
          </View>

          {movies.map((m) => (
            <View key={m.id} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 2, fontWeight: '700' }]}>{m.title}</Text>
              <Text style={[styles.td, { flex: 1.5 }]}>{m.director}</Text>
              <Text style={[styles.td, { flex: 1 }]}>{m.genre}</Text>
              <Text style={[styles.td, { flex: 1 }]}>{m.runtime}</Text>
              <View style={{ width: 80, alignItems: 'flex-end' }}>
                <Pressable onPress={() => handleDelete(m.id)}>
                  <Text style={styles.deleteLink}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}
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
  sectionHeader: {
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
  addBtn: {
    backgroundColor: THEME.colors.plumAccent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6
  },
  addBtnText: {
    color: THEME.colors.bg,
    fontSize: 12,
    fontWeight: '700'
  },
  formCard: {
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 20,
    marginBottom: 24
  },
  formTitle: {
    color: THEME.colors.cream,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16
  },
  inputCol: {
    flex: 1,
    minWidth: 180
  },
  inputLabel: {
    color: THEME.colors.muted,
    fontSize: 11,
    marginBottom: 6
  },
  textInput: {
    backgroundColor: THEME.colors.bg2,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 6,
    color: THEME.colors.cream,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14
  },
  cancelBtnText: {
    color: THEME.colors.muted,
    fontSize: 12
  },
  saveBtn: {
    backgroundColor: THEME.colors.plumAccent,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 6
  },
  saveBtnText: {
    color: THEME.colors.bg,
    fontSize: 12,
    fontWeight: '700'
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
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
    backgroundColor: THEME.colors.bg2
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle
  },
  td: {
    color: THEME.colors.cream,
    fontSize: 13
  },
  deleteLink: {
    color: THEME.colors.red,
    fontSize: 12
  }
});
