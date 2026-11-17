import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { loginSchema, registerSchema } from '@exploro/validation';
import { useLanguage } from '../i18n';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, displayName: string) => Promise<void>;
  onClose: () => void;
}

export function AuthPanel({ onLogin, onRegister, onClose }: Props): React.JSX.Element {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (): Promise<void> => {
    setError(null);
    const parsed =
      mode === 'login'
        ? loginSchema.safeParse({ email, password })
        : registerSchema.safeParse({ email, password, displayName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t.auth.invalidData);
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') await onLogin(email, password);
      else await onRegister(email, password, displayName);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.auth.requestError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {mode === 'login' ? t.auth.signInTitle : t.auth.signUpTitle}
        </Text>
        <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel={t.auth.closeAria}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>{t.auth.hint}</Text>

      <View style={styles.form}>
        {mode === 'register' && (
          <TextInput
            style={styles.field}
            placeholder={t.auth.namePlaceholder}
            placeholderTextColor="#94a3b8"
            value={displayName}
            onChangeText={setDisplayName}
          />
        )}
        <TextInput
          style={styles.field}
          placeholder={t.auth.emailPlaceholder}
          placeholderTextColor="#94a3b8"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.field}
          placeholder={t.auth.passwordPlaceholder}
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {Boolean(error) && (
          <View style={styles.errorAlert}>
            <Text style={styles.errorAlertText}>{error}</Text>
          </View>
        )}

        <Pressable
          onPress={() => void submit()}
          disabled={busy}
          style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
        >
          <Text style={styles.primaryBtnText}>
            {busy
              ? t.auth.processing
              : mode === 'login'
              ? t.auth.signInSubmit
              : t.auth.signUpSubmit}
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError(null);
        }}
        style={styles.switchBtn}
      >
        <Text style={styles.switchBtnText}>
          {mode === 'login' ? t.auth.switchToSignUp : t.auth.switchToSignIn}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#dddddd',
    borderBottomWidth: 3,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  hint: {
    color: '#475569',
    fontSize: 13.5,
    marginBottom: 14,
    lineHeight: 19,
  },
  form: {
    gap: 10,
  },
  field: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#d4d4d8',
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  errorAlert: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  errorAlertText: {
    color: '#be123c',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderBottomWidth: 3.5,
    borderBottomColor: '#047857',
    borderRadius: 999,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  switchBtn: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#dddddd',
    borderBottomWidth: 3,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  switchBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13.5,
  },
});
