import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Character } from '../../../data/characters';
import type { EntityType } from '../../../core/engine/types';
import { formatTime } from '../../../shared/utils/formatTime';
import { overlayStyles } from './overlayStyles';
import characters from '../../../data/characters';

const { width: screenWidth } = Dimensions.get('window');

const GameOverOverlay = ({
  visible,
  score,
  level,
  totalCoins,
  time,
  character,
  deathCause,
  victory = false,
  bestScore,
  isNewBest,
  dailyLabel,
  streak,
  unlockedHeroes,
  onShare,
  onRetry,
  onMainMenu,
}: {
  visible: boolean;
  score: number;
  level: number;
  totalCoins: number;
  time: number;
  character: Character;
  deathCause: EntityType | null;
  victory?: boolean;
  bestScore?: number;
  isNewBest?: boolean;
  /** Set for daily-challenge runs: the UTC day being played. */
  dailyLabel?: string;
  streak?: number;
  /** Hero indices unlocked by this run. */
  unlockedHeroes?: number[];
  onShare?: () => void;
  onRetry: () => void;
  onMainMenu: () => void;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(cardAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      cardAnim.setValue(0.8);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[overlayStyles.overlay, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.gameOverCard, victory && styles.victoryCard, { transform: [{ scale: cardAnim }] }]}>

        {/* Character or Killer image */}
        <Image
          source={
            (deathCause === 'enemy' || deathCause === 'boss') ? require("../../../assets/sprites/enemies/Guardian_Enemy.png") :
            deathCause === 'pit'   ? require("../../../assets/sprites/tiles/Danger_Vortex.png") :
            (character?.loseImage ?? character?.scoreImage)
          }
          style={[
            styles.gameOverImage, 
            (deathCause === 'enemy' || deathCause === 'boss' || deathCause === 'pit') && { width: 90, height: 90, marginBottom: 10 }
          ]}
          resizeMode="contain"
        />

        <Text style={[styles.gameOverTitle, victory && styles.victoryTitle]}>
          {victory ? 'EXPEDITION COMPLETE' : 'GAME OVER'}
        </Text>
        {dailyLabel && (
          <Text style={styles.dailyLabel}>
            📅 DAILY {dailyLabel}{streak ? `  ·  🔥 ${streak}` : ''}
          </Text>
        )}
        {isNewBest ? (
          <Text style={styles.newBest}>{dailyLabel ? '🏅 NEW DAILY BEST!' : '🏅 NEW PERSONAL BEST!'}</Text>
        ) : bestScore ? (
          <Text style={styles.bestScore}>{dailyLabel ? "TODAY'S BEST" : 'BEST'} {bestScore.toLocaleString()}</Text>
        ) : null}

        {unlockedHeroes && unlockedHeroes.length > 0 && (
          <Text style={styles.unlocked}>
            🔓 UNLOCKED: {unlockedHeroes.map(i => characters[i]?.playerName.toUpperCase()).join(', ')}
          </Text>
        )}

        {/* Stats */}
        <View style={styles.gameOverStats}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>LEVEL</Text>
            <Text style={styles.statValue}>{level}</Text>
          </View>
          <View style={[styles.statRow, styles.statDivider]} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>SCORE</Text>
            <Text style={[styles.statValue, { color: '#FFD700' }]}>{score}</Text>
          </View>
          <View style={[styles.statRow, styles.statDivider]} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>GEMS</Text>
            <Text style={[styles.statValue, { color: '#FFD700' }]}>{totalCoins}</Text>
          </View>
          <View style={[styles.statRow, styles.statDivider]} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>TIME</Text>
            <Text style={[styles.statValue, { color: '#00BFFF' }]}>{formatTime(time)}</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.gameOverButtons}>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>🔄  RETRY</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={onMainMenu} activeOpacity={0.8}>
            <Text style={styles.menuButtonText}>🏠  MENU</Text>
          </TouchableOpacity>
        </View>
        {onShare && (
          <TouchableOpacity style={styles.shareButton} onPress={onShare} activeOpacity={0.8}>
            <Text style={styles.shareButtonText}>📤  SHARE RESULT</Text>
          </TouchableOpacity>
        )}

      </Animated.View>
    </Animated.View>
  );
};

export default GameOverOverlay;

const styles = StyleSheet.create({
  gameOverCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
    width: Math.min(screenWidth * 0.78, 340),
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 20,
    gap: 12,
  },
  gameOverImage: {
    width: 72,
    height: 72,
  },
  gameOverTitle: {
    color: '#FF3B30',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  unlocked: { color: '#76FF03', fontWeight: '900', fontSize: 12, letterSpacing: 1.5, textAlign: 'center' },
  victoryCard: { borderColor: '#FFD700', shadowColor: '#FFD700' },
  victoryTitle: { color: '#FFD700' },
  dailyLabel: {
    color: '#4FC3F7',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  shareButton: {
    width: '100%',
    backgroundColor: '#4FC3F7',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  newBest: {
    color: '#FFD700',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1.5,
  },
  bestScore: {
    color: '#888',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  gameOverStats: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  statDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: '#777',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 2,
  },
  statValue: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  gameOverButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0,0,0,0.3)',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  menuButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  menuButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
});
