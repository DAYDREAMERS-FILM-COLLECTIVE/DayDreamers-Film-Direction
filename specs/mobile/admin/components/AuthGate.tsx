/**
 * src/admin/components/AuthGate.tsx
 * Passkey authorization gate guarding the admin dashboard.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useAdminStore } from '../store/useAdminStore';
import { verifyPasskeyApi } from '../services/adminApi';
import { THEME } from '../../screening/constants/theme';

export const AuthGate: React.FC = () => {
  const { setPasskey, setAuthenticated } = useAdminStore();
  const [inputKey, setInputKey] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleUnlock = async () => {
    if (!inputKey.trim()) {
      setErrorMsg('Please enter the admin passkey.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    const res = await verifyPasskeyApi(inputKey.trim());
    setIsVerifying(false);

    if (res.valid) {
      setPasskey(inputKey.trim());
      setAuthenticated(true);
    } else {
      setErrorMsg(res.error || 'Invalid passkey. Access denied.');
    }
  };

  return (
    <View style={styles.gateOverlay}>
      <View style={styles.authCard}>
        <Text style={styles.brandTitle}>
          DAYDREAMERS <Text style={styles.goldText}>CMS</Text>
        </Text>
        <Text style={styles.heading}>Door &amp; Admin Access</Text>
        <Text style={styles.desc}>
          Enter your authorization passkey to manage film catalogue, seat locks, and door check-ins.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Passkey</Text>
          <TextInput
            secureTextEntry={true}
            value={inputKey}
            onChangeText={(t) => setInputKey(t)}
            placeholder="Enter passkey..."
            placeholderTextColor={THEME.colors.muted}
            style={styles.textInput}
          />
        </View>

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <Pressable
          disabled={isVerifying}
          onPress={handleUnlock}
          style={({ pressed }) => [styles.unlockBtn, pressed && styles.btnPressed]}
        >
          {isVerifying ? (
            <ActivityIndicator color={THEME.colors.bg} />
          ) : (
            <Text style={styles.unlockBtnText}>Unlock CMS &rarr;</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gateOverlay: {
    flex: 1,
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: THEME.colors.bg
  },
  authCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: THEME.colors.panel,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    padding: 32,
    alignItems: 'center'
  },
  brandTitle: {
    color: THEME.colors.cream,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12
  },
  goldText: {
    color: THEME.colors.gold
  },
  heading: {
    color: THEME.colors.cream,
    fontSize: 24,
    fontWeight: '700',
    fontFamily: THEME.typography.titleFont,
    marginBottom: 8
  },
  desc: {
    color: THEME.colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16
  },
  inputLabel: {
    color: THEME.colors.muted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6
  },
  textInput: {
    backgroundColor: THEME.colors.bg2,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 6,
    color: THEME.colors.cream,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14
  },
  errorBox: {
    width: '100%',
    backgroundColor: THEME.colors.errorBg,
    borderWidth: 1,
    borderColor: THEME.colors.errorBorder,
    borderRadius: 6,
    padding: 10,
    marginBottom: 16
  },
  errorText: {
    color: THEME.colors.errorText,
    fontSize: 12,
    textAlign: 'center'
  },
  unlockBtn: {
    width: '100%',
    backgroundColor: THEME.colors.plumAccent,
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  unlockBtnText: {
    color: THEME.colors.bg,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1
  },
  btnPressed: {
    opacity: 0.85
  }
});
