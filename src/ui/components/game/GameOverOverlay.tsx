import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

import type { Character } from '../../../data/characters';
import type { EntityType } from '../../../core/engine/types';
import { formatTime } from '../../../shared/utils/formatTime';
import OverlayContainer from './OverlayContainer';
import { MIN_TOUCH } from '../../layout/useGameLayout';
import { useT } from '../../../i18n/useT';
import { achievementText, heroText } from '../../../i18n/keys';
import type { AchievementId } from '../../../core/stats/achievements';

type Props = {
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
  /** Depth (ascension) of the run; shown when above 0. */
  depth?: number;
  streak?: number;
  /** Hero indices unlocked by this run. */
  unlockedHeroes?: number[];
  /** Achievement ids earned by this run. */
  achievements?: string[];
  /** Embers earned by this run (Forge currency). */
  embers?: number;
  /** Gems still on the floor when the run ended (for the near-miss line). */
  gemsLeft?: number;
  onShare?: () => void;
  onRetry: () => void;
  onMainMenu: () => void;
};

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
  depth = 0,
  streak,
  unlockedHeroes,
  achievements,
  embers,
  gemsLeft,
  onShare,
  onRetry,
  onMainMenu,
}: Props) => {
  const { t, plural } = useT();
  const { width, height } = useWindowDimensions();
  const cardAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (visible) Animated.spring(cardAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    else cardAnim.setValue(0.85);
  }, [visible]);

  if (!visible) return null;

  // Short landscape windows get a two-column card so it never outgrows the screen.
  const compact = height < 460;
  const accent = victory ? '#FFD700' : '#FF3B30';
  const killer = deathCause === 'enemy' || deathCause === 'boss' || deathCause === 'stalker' || deathCause === 'pit';
  const imageSize = compact ? 56 : killer ? 84 : 72;

  const image = victory
    ? character.winImage
    : deathCause === 'enemy' || deathCause === 'boss' || deathCause === 'stalker'
    ? require('../../../assets/sprites/enemies/Guardian_Enemy.png')
    : deathCause === 'pit'
    ? require('../../../assets/sprites/tiles/Danger_Vortex.png')
    : character.loseImage ?? character.scoreImage;

  const causeText = !victory && killer ? t(`over.cause.${deathCause}` as 'over.cause.enemy') : null;

  const stats = [
    { label: t('over.floor'), value: String(level), color: '#fff' },
    { label: t('over.score'), value: score.toLocaleString(), color: '#FFD700' },
    { label: t('over.gems'), value: String(totalCoins), color: '#FFD700' },
    { label: t('over.time'), value: formatTime(time), color: '#00BFFF' },
  ];

  const bestText = dailyLabel
    ? t('over.bestToday', { score: (bestScore ?? 0).toLocaleString() })
    : t('over.best', { score: (bestScore ?? 0).toLocaleString() });

  const header = (
    <View style={styles.headerColumn}>
      <Image source={image} style={{ width: imageSize, height: imageSize }} resizeMode="contain" accessibilityIgnoresInvertColors />
      <Text
        style={[styles.title, { color: accent }]}
        accessibilityRole="header"
        maxFontSizeMultiplier={1.3}
        numberOfLines={2}
        adjustsFontSizeToFit
      >
        {(victory ? t('over.victory') : t('over.defeat')).toLocaleUpperCase()}
      </Text>
      {causeText && (
        <Text style={styles.cause} maxFontSizeMultiplier={1.3}>
          {causeText}
        </Text>
      )}
      {depth > 0 && (
        <Text style={styles.depth} maxFontSizeMultiplier={1.3}>
          🔥 {t('over.depth', { n: depth }).toLocaleUpperCase()}
        </Text>
      )}
      {dailyLabel && (
        <Text style={styles.daily} maxFontSizeMultiplier={1.3}>
          📅 {t('over.daily', { date: dailyLabel }).toLocaleUpperCase()}
          {streak ? `  ·  🔥 ${plural('over.streak', streak)}` : ''}
        </Text>
      )}
      {isNewBest ? (
        <Text style={styles.newBest} maxFontSizeMultiplier={1.3}>
          🏅 {(dailyLabel ? t('over.newDailyBest') : t('over.newBest')).toLocaleUpperCase()}
        </Text>
      ) : bestScore ? (
        <Text style={styles.best} maxFontSizeMultiplier={1.3}>
          {bestText.toLocaleUpperCase()}
        </Text>
      ) : null}
      {!victory && gemsLeft !== undefined && gemsLeft > 0 && gemsLeft <= 2 ? (
        <Text style={styles.nearMiss} maxFontSizeMultiplier={1.3}>
          {plural('over.gemsLeft', gemsLeft, { floor: level })}
        </Text>
      ) : null}
      {!victory && !isNewBest && bestScore && score >= bestScore * 0.75 && score < bestScore ? (
        <Text style={styles.nearMiss} maxFontSizeMultiplier={1.3}>
          {t('over.shortOfBest', { points: bestScore - score })}
        </Text>
      ) : null}
      {embers && embers > 0 ? (
        <Text style={styles.embers} maxFontSizeMultiplier={1.3}>
          🔥 {plural('over.embers', embers).toLocaleUpperCase()}
        </Text>
      ) : null}
      {achievements && achievements.length > 0 && (
        <Text style={styles.achievement} maxFontSizeMultiplier={1.3}>
          🏆{' '}
          {plural('over.achievements', achievements.length, {
            names: achievements.map(id => achievementText(t, id as AchievementId, 'name')).join(', '),
          }).toLocaleUpperCase()}
        </Text>
      )}
      {unlockedHeroes && unlockedHeroes.length > 0 && (
        <Text style={styles.unlocked} maxFontSizeMultiplier={1.3}>
          🔓{' '}
          {plural('over.unlocked', unlockedHeroes.length, {
            names: unlockedHeroes.map(i => heroText(t, i, 'name')).join(', '),
          }).toLocaleUpperCase()}
        </Text>
      )}
    </View>
  );

  const body = (
    <View style={styles.bodyColumn}>
      <View style={styles.statsGrid}>
        {stats.map(s => (
          <View key={s.label} style={styles.statTile} accessible accessibilityLabel={`${s.label}: ${s.value}`}>
            <Text style={styles.statLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {s.label.toLocaleUpperCase()}
            </Text>
            <Text
              style={[styles.statValue, { color: s.color }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1.2}
            >
              {s.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: accent }]}
          onPress={onRetry}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('over.retry')}
        >
          <Text
            style={[styles.retryText, victory && { color: '#000' }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.3}
          >
            🔄  {t('over.retry').toLocaleUpperCase()}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onMainMenu}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('over.menu')}
        >
          <Text style={styles.menuText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
            🏠  {t('over.menu').toLocaleUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {onShare && (
        <TouchableOpacity
          style={styles.shareButton}
          onPress={onShare}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('over.share')}
        >
          <Text style={styles.shareText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
            📤  {t('over.share').toLocaleUpperCase()}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <OverlayContainer>
      <Animated.View
        style={[
          styles.card,
          { borderColor: accent, shadowColor: accent, width: Math.min(width * 0.94, compact ? 640 : 380) },
          compact && styles.cardRow,
          { transform: [{ scale: cardAnim }] },
        ]}
      >
        {header}
        {body}
      </Animated.View>
    </OverlayContainer>
  );
};

export default GameOverOverlay;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 20,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  headerColumn: { alignItems: 'center', gap: 6, flex: 1 },
  bodyColumn: { gap: 10, flex: 1.2, width: '100%' },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  cause: { color: '#bdbdbd', fontSize: 12, textAlign: 'center' },
  depth: { color: '#FF7043', fontWeight: '900', fontSize: 12, letterSpacing: 1.5, textAlign: 'center' },
  daily: { color: '#4FC3F7', fontWeight: '800', fontSize: 12, letterSpacing: 1.2, textAlign: 'center' },
  newBest: { color: '#FFD700', fontWeight: '900', fontSize: 13, letterSpacing: 1.5, textAlign: 'center' },
  best: { color: '#a8a8a8', fontWeight: '700', fontSize: 12, letterSpacing: 1.5, textAlign: 'center' },
  nearMiss: { color: '#80DEEA', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  embers: { color: '#FFAB40', fontWeight: '900', fontSize: 12, letterSpacing: 1.2, textAlign: 'center' },
  achievement: { color: '#FFD54F', fontWeight: '900', fontSize: 12, letterSpacing: 1.2, textAlign: 'center' },
  unlocked: { color: '#76FF03', fontWeight: '900', fontSize: 12, letterSpacing: 1.2, textAlign: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  statTile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statLabel: { color: '#9a9a9a', fontWeight: '900', fontSize: 11, letterSpacing: 1.5 },
  statValue: { fontWeight: '900', fontSize: 20 },
  buttons: { flexDirection: 'row', gap: 10, width: '100%' },
  retryButton: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: 14,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0,0,0,0.3)',
  },
  retryText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  menuButton: {
    flex: 1,
    minHeight: MIN_TOUCH,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  menuText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  shareButton: {
    width: '100%',
    minHeight: MIN_TOUCH,
    backgroundColor: '#4FC3F7',
    borderRadius: 14,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
