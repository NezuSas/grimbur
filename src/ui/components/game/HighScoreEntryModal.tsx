import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Text from "../Text";

import { formatTime } from '../../../shared/utils/formatTime';
import { checkName } from '../../../core/leaderboard/validation';
import OverlayContainer from './OverlayContainer';
import { MIN_TOUCH } from '../../layout/useGameLayout';
import { useT } from '../../../i18n/useT';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  score: number;
  level: number;
  totalCoins: number;
  time: number;
  /** Should save the score; rejects when it could not be saved. */
  onSubmit: (name: string) => Promise<void>;
  onSkip: () => void;
};

const HighScoreEntryModal = ({ visible, score, level, totalCoins, time, onSubmit, onSkip }: Props) => {
  const { t, plural } = useT();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const inputRef = useRef<TextInput>(null);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: visible ? 1 : 0, duration: 250, useNativeDriver: true }).start();
    if (visible) {
      setName('');
      setError(null);
      setSaving(false);
      // Focus after the fade-in so the keyboard does not fight the animation.
      const timer = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  // With the keyboard up a landscape phone has ~150 dp: use a compact two-column card.
  const compact = height < 460;

  const submit = async () => {
    if (saving || submitting.current) return; // guards double taps (the ref is set at once; the state only on the next render)
    const result = checkName(name);
    if (!result.ok) {
      setError(result.reason === 'blocked' ? t('entry.errBlocked') : t('entry.errEmpty'));
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      await onSubmit(result.name);
    } catch {
      setError(t('entry.errFailed'));
      setSaving(false);
      submitting.current = false;
    }
  };

  const summary = (
    <View style={styles.summary}>
      <Text style={styles.badge} maxFontSizeMultiplier={1.3}>
        🏆 {t('entry.badge').toLocaleUpperCase()}
      </Text>
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
        {t('entry.title').toLocaleUpperCase()}
      </Text>
      <Text style={styles.score} maxFontSizeMultiplier={1.3}>
        {t('entry.points', { score: score.toLocaleString() })}
      </Text>
      <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
        {t('entry.subtitle', { floor: level, gems: plural('common.gems', totalCoins), time: formatTime(time) })}
      </Text>
    </View>
  );

  const form = (
    <View style={styles.form}>
      <TextInput
        ref={inputRef}
        style={[styles.input, { fontFamily: "Fredoka_600SemiBold" }]}
        placeholder={t('entry.placeholder')}
        placeholderTextColor="#8a8a8a"
        value={name}
        onChangeText={text => {
          setName(text);
          setError(null);
        }}
        maxLength={20}
        selectionColor="#FFD700"
        returnKeyType="done"
        onSubmitEditing={submit}
        editable={!saving}
        accessibilityLabel={t('entry.placeholder')}
      />
      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.3}>
          {error}
        </Text>
      )}

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
          disabled={saving}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('common.skip')}
        >
          <Text style={styles.skipText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {t('common.skip').toLocaleUpperCase()}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, (!name.trim() || saving) && { opacity: 0.45 }]}
          onPress={submit}
          disabled={!name.trim() || saving}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('entry.save')}
          accessibilityState={{ disabled: !name.trim() || saving, busy: saving }}
        >
          <Text style={styles.saveText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
            {(saving ? t('entry.saving') : t('entry.save')).toLocaleUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 1001 }]} pointerEvents="box-none">
      <OverlayContainer keyboardAvoiding>
        <View style={[styles.card, { width: Math.min((width - Math.max(insets.left, 12) - Math.max(insets.right, 12)) * 0.98, compact ? 640 : 380) }, compact && styles.cardRow]}>
          {summary}
          {form}
        </View>
      </OverlayContainer>
    </Animated.View>
  );
};

export default HighScoreEntryModal;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
    padding: 16,
    gap: 10,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 20,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  summary: { alignItems: 'center', gap: 4, flex: 1 },
  form: { gap: 8, flex: 1.2, width: '100%' },
  badge: { color: '#fff', fontSize: 18, fontWeight: '900' },
  title: { color: '#FFD700', fontWeight: '900', fontSize: 17, letterSpacing: 2, textAlign: 'center' },
  score: { color: '#fff', fontWeight: '900', fontSize: 22 },
  subtitle: { color: '#b5b5b5', fontSize: 12, letterSpacing: 0.5, textAlign: 'center' },
  input: {
    width: '100%',
    minHeight: MIN_TOUCH,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  error: { color: '#FF8A80', fontSize: 12, fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: 10 },
  skipButton: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  skipText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  saveButton: {
    flex: 1.6,
    minHeight: MIN_TOUCH,
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  saveText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
