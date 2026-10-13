import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { formatTime } from '../../../shared/utils/formatTime';
import { checkName } from '../../../core/leaderboard/validation';
import { overlayStyles } from './overlayStyles';

const { width: screenWidth } = Dimensions.get('window');

const HighScoreEntryModal = ({
  visible, score, level, totalCoins, time, onSubmit,
}: {
  visible: boolean;
  score: number;
  level: number;
  totalCoins: number;
  time: number;
  onSubmit: (name: string) => void;
}) => {
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    if (visible) {
      setName('');
      setError(null);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[overlayStyles.overlay, { opacity: fadeAnim }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.hsCard}>
          <Text style={styles.hsBadge}>🏆 TOP 10!</Text>
          <Text style={styles.hsTitle}>NEW HIGH SCORE</Text>
          <Text style={styles.hsScore}>{score.toLocaleString()} pts</Text>
          <Text style={styles.hsSubtitle}>Level {level} · {totalCoins} gems · Time {formatTime(time)}</Text>

          <TextInput
            style={styles.hsInput}
            placeholder="Enter your name..."
            placeholderTextColor="#666"
            value={name}
            onChangeText={text => {
              setName(text);
              setError(null);
            }}
            maxLength={20}
            autoFocus
            selectionColor="#FFD700"
          />

          {error && <Text style={styles.hsError}>{error}</Text>}

          <TouchableOpacity
            style={[styles.hsSubmitBtn, !name.trim() && { opacity: 0.4 }]}
            onPress={() => {
              const result = checkName(name);
              if (result.ok) onSubmit(result.name);
              else setError(result.reason === 'blocked' ? "That name isn't allowed. Try another." : 'Enter a name.');
            }}
            activeOpacity={0.8}
            disabled={!name.trim()}
          >
            <Text style={styles.hsSubmitText}>SAVE SCORE ➔</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

export default HighScoreEntryModal;

const styles = StyleSheet.create({
  hsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
    paddingHorizontal: 28,
    paddingVertical: 24,
    alignItems: 'center',
    width: Math.min(screenWidth * 0.78, 340),
    gap: 10,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 20,
  },
  hsBadge: {
    fontSize: 26,
    color: '#fff',
  },
  hsTitle: {
    color: '#FFD700',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 2,
  },
  hsScore: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 22,
  },
  hsSubtitle: {
    color: '#888',
    fontSize: 12,
    letterSpacing: 1,
  },
  hsInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 10,
  },
  hsError: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '700',
  },
  hsSubmitBtn: {
    width: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  hsSubmitText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
});
