import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Text from "../Text";
import { Ionicons } from '@expo/vector-icons';

import type { Character } from '../../../data/characters';
import type { EntityType } from '../../../core/engine/types';
import { formatTime } from '../../../shared/utils/formatTime';
import OverlayContainer from './OverlayContainer';
import { MIN_TOUCH } from '../../layout/useGameLayout';
import { useT } from '../../../i18n/useT';
import { achievementText, heroText, skinText } from '../../../i18n/keys';
import type { SkinId } from '../../../data/skinArt';
import type { TranslationKey } from '../../../i18n/en';
import { splitNames, type AchievementId } from '../../../core/stats/achievements';
import { missionDef } from '../../../core/stats/missions';
import type { RunPayout } from '../../../core/stats/runStats';
import type { Goal } from '../../../core/stats/goals';
import type { Unlocks } from '../../../core/stats/unlocks';
import GoalLine from '../GoalLine';
import SpriteImage from '../SpriteImage';
import GemShower from './GemShower';
import EmberParticles from '../EmberParticles';
import { useSettingsStore } from '../../../state/settings/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CountedScore, KILLERS, Reveal } from './overOverlayParts';

type Props = {
  visible: boolean;
  score: number;
  level: number;
  /** Floors of the expedition (the progress bar shows how far the run got). */
  floors?: number;
  /** The endless descent: no ten-floor bar, and the record is a floor, not a score. */
  endless?: boolean;
  /** The free part of the game ended (not a defeat): a demo-complete summary with the unlock call to action. */
  demo?: boolean;
  /** Opens the paywall from the demo summary. */
  onUnlock?: () => void;
  totalCoins: number;
  time: number;
  character: Character;
  deathCause: EntityType | null;
  victory?: boolean;
  bestScore?: number;
  isNewBest?: boolean;
  /** Set for daily-challenge runs: the local day being played. */
  dailyLabel?: string;
  /** The code of a friend challenge (shown instead of the daily line). */
  challengeLabel?: string | null;
  /** Depth (ascension) of the run; shown when above 0. */
  depth?: number;
  streak?: number;
  /** Hero indices unlocked by this run. */
  unlockedHeroes?: number[];
  /** Achievement ids earned by this run. */
  achievements?: string[];
  /** Embers earned by this run (Forge currency). */
  embers?: number;
  /** Where `embers` came from; the breakdown adds up to `embers`. */
  payout?: RunPayout;
  /** Length of the daily streak this run found broken (0 or undefined: it was alive). */
  streakLost?: number;
  bestStreak?: number;
  freezeUsed?: boolean;
  freezeEarned?: boolean;
  /** Heroes, depth and endless mode this run opened. */
  unlocks?: Unlocks | null;
  /** Opens the screen where the new unlock can be tried. */
  onTryUnlock?: (kind: 'hero' | 'depth' | 'endless' | 'skin', detail?: { hero: number; skin: string }) => void;
  /** The closest goals (at most two) and whether the run just made a Forge purchase possible. */
  goals?: Goal[];
  canBuyNow?: boolean;
  /** Missions this run completed (their ids) and the new rank when the run raised it. */
  missionsDone?: string[];
  rankUp?: number | null;
  /** One of the first runs: a line says gems stay in the run while embers are kept for good. */
  explainEmbers?: boolean;
  /** Gems still on the floor when the run ended (for the near-miss line). */
  gemsLeft?: number;
  onShare?: () => void;
  /** Opens the Forge (shown when the run earned embers). */
  onForge?: () => void;
  onRetry: () => void;
  onMainMenu: () => void;
};

const GameOverOverlay = ({
  visible,
  score,
  level,
  floors = 10,
  endless = false,
  demo = false,
  onUnlock,
  totalCoins,
  time,
  character,
  deathCause,
  victory = false,
  bestScore,
  isNewBest,
  dailyLabel,
  challengeLabel,
  depth = 0,
  streak,
  unlockedHeroes,
  achievements,
  embers,
  explainEmbers,
  payout,
  streakLost,
  bestStreak,
  freezeUsed,
  freezeEarned,
  unlocks,
  onTryUnlock,
  goals,
  canBuyNow,
  missionsDone,
  rankUp,
  gemsLeft,
  onShare,
  onForge,
  onRetry,
  onMainMenu,
}: Props) => {
  const { t, plural } = useT();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardAnim = useRef(new Animated.Value(0.9)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const calm = useSettingsStore(st => st.reduceFlash);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(cardAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      cardAnim.setValue(0.9);
      fade.setValue(0);
    }
  }, [visible]);

  // The hero pops in and then floats gently; the embers breakdown folds away until it is asked for.
  const heroPop = useRef(new Animated.Value(0.82)).current;
  const heroFloat = useRef(new Animated.Value(0)).current;
  const [showBreakdown, setShowBreakdown] = useState(false);
  useEffect(() => {
    if (!visible) {
      heroPop.setValue(0.82);
      setShowBreakdown(false);
      return;
    }
    if (calm) {
      heroPop.setValue(1);
      return;
    }
    Animated.spring(heroPop, { toValue: 1, friction: 6, tension: 90, delay: 120, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(heroFloat, { toValue: 1, duration: 1900, useNativeDriver: true }),
        Animated.timing(heroFloat, { toValue: 0, duration: 1900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, calm, heroPop, heroFloat]);

  if (!visible) return null;

  const wide = width >= 560;
  const compact = height < 460;
  // On a very short window the buttons share one row: a big Retry plus icon-only Menu / Forge / Share.
  const short = height < 340;
  const accent = victory || demo ? '#FFD54F' : '#FF5252';
  const killerSprite = !victory && deathCause ? KILLERS[deathCause] : undefined;
  const heroSprite = victory || demo ? character.winImage : (character.loseImage ?? character.scoreImage);
  // The hero's own defeat pose is the picture; whoever struck is a small badge beside it (and named under it).
  const sprite = heroSprite;
  const spriteSize = height < 330 ? 104 : compact ? 132 : 196;
  const haloSize = Math.round(spriteSize * 1.2);
  // The notch / gesture insets are padding of the overlay, so the card must fit what is left of them.
  const usable = width - Math.max(insets.left, 12) - Math.max(insets.right, 12);
  const cardWidth = Math.min(usable * 0.98, wide ? 820 : 400);

  const heroNo = character.id - 1;
  const quote = demo ? null : t(`story.${victory ? 'win' : 'lose'}.${heroNo}` as TranslationKey);
  const killerName = !victory && deathCause ? t(`over.killer.${deathCause}` as TranslationKey) : null;
  const tip = !victory && deathCause ? t(`over.tip.${deathCause}` as TranslationKey) : null;

  const title = demo ? t('over.demo.title') : victory ? t('over.victory') : t('over.fell', { floor: level });
  const nearGems = !victory && gemsLeft !== undefined && gemsLeft > 0 && gemsLeft <= 2;
  const nearBest = !endless && !victory && !isNewBest && !!bestScore && score >= bestScore * 0.75 && score < bestScore;

  const stats = [
    { icon: 'diamond' as const, label: t('over.gems'), value: String(totalCoins), color: '#4FC3F7' },
    { icon: 'time' as const, label: t('over.time'), value: formatTime(time), color: '#B39DDB' },
  ];

  const parts = payout
    ? [
        payout.run > 0 && t('over.part.run', { n: payout.run }),
        payout.milestone > 0 && t('over.part.milestone', { n: payout.milestone }),
        payout.daily > 0 && t('over.part.daily', { n: payout.daily }),
        payout.achievements > 0 && t('over.part.achievements', { n: payout.achievements }),
      ].filter((p): p is string => !!p)
    : [];
  // A single source needs no breakdown: the pill already says it.
  const breakdown = parts.length > 1 || (payout && payout.welcomeBack > 0 && parts.length > 0) ? parts.join('  ·  ') : null;

  const achievementList = splitNames(achievements ?? []);
  const achievementNames =
    achievementList.shown.map(id => achievementText(t, id as AchievementId, 'name')).join(', ') +
    (achievementList.more > 0 ? ` ${t('over.andMore', { count: achievementList.more })}` : '');

  const unlockRows: { kind: 'hero' | 'depth' | 'endless' | 'skin'; text: string; skin?: { hero: number; skin: string } }[] = [
    ...(unlockedHeroes ?? unlocks?.heroes ?? []).map(i => ({ kind: 'hero' as const, text: t('over.unlock.hero', { name: heroText(t, i, 'name') }) })),
    ...(unlocks?.depth ? [{ kind: 'depth' as const, text: t('over.unlock.depth', { name: t(`ascension.label.${unlocks.depth}` as TranslationKey) }) }] : []),
    ...(unlocks?.endless ? [{ kind: 'endless' as const, text: t('over.unlock.endless') }] : []),
    ...(unlocks?.skins ?? []).map(s => ({ kind: 'skin' as const, skin: s, text: t('over.unlock.skin', { name: `${heroText(t, s.hero, 'name')} · ${skinText(t, s.skin as SkinId)}` }) })),
  ];

  /** The text of a mission that this run completed ("Reach floor 5 in a single run"). */
  const missionLabel = (id: string): string => {
    const def = missionDef(id);
    if (!def) return id;
    return def.metric === 'wins' || def.metric === 'daily'
      ? plural(`mission.desc.${def.metric}` as never, def.target, { n: def.target })
      : t(`mission.desc.${def.metric}` as TranslationKey, { n: def.target.toLocaleString() });
  };

  const notes: { key: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; text: string }[] = [
    ...(explainEmbers && embers && embers > 0 ? [{ key: 'explain', icon: 'information-circle' as const, color: '#FFCC80', text: t('over.explainEmbers') }] : []),
    ...(payout && payout.welcomeBack > 0 ? [{ key: 'welcome', icon: 'gift' as const, color: '#9ee37d', text: t('over.welcomeBack', { count: payout.welcomeBack }) }] : []),
    ...(rankUp ? [{ key: 'rank', icon: 'medal' as const, color: '#FFD54F', text: t('over.rankUp', { name: t(`rank.${rankUp}` as TranslationKey) }) }] : []),
    ...(missionsDone ?? []).map(id => ({ key: `m-${id}`, icon: 'flag' as const, color: '#4FC3F7', text: t('over.mission', { name: missionLabel(id) }) })),
    ...(achievements && achievements.length > 0 ? [{ key: 'ach', icon: 'trophy' as const, color: '#FFD54F', text: plural('over.achievements', achievements.length, { names: achievementNames }) }] : []),
    ...(dailyLabel && streakLost ? [{ key: 'lost', icon: 'heart-dislike' as const, color: '#ff8a80', text: t('over.streakLost', { best: bestStreak ?? streakLost }) }] : []),
    ...(dailyLabel && freezeUsed ? [{ key: 'fused', icon: 'snow' as const, color: '#80D8FF', text: t('over.freezeUsed') }] : []),
    ...(dailyLabel && freezeEarned ? [{ key: 'fearn', icon: 'snow' as const, color: '#80D8FF', text: t('over.freezeEarned') }] : []),
  ];

  const left = (
    <View style={[styles.left, wide && { width: '38%' }]}>
      <View style={{ width: haloSize, height: haloSize, alignItems: 'center', justifyContent: 'center' }}>
        {/* A halo of light in the colour of the moment (gold for a win, red for a defeat) instead of a frame */}
        <View pointerEvents="none" style={[styles.halo, { width: haloSize, height: haloSize, borderRadius: haloSize / 2, backgroundColor: accent + '14' }]} />
        <View pointerEvents="none" style={[styles.halo, { width: haloSize * 0.78, height: haloSize * 0.78, borderRadius: haloSize, backgroundColor: accent + '22' }]} />
        <View pointerEvents="none" style={[styles.halo, { width: haloSize * 0.56, height: haloSize * 0.56, borderRadius: haloSize, backgroundColor: accent + '30' }]} />
        <Animated.View
          style={{
            transform: [
              { scale: heroPop },
              { translateY: heroFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
            ],
          }}
        >
          <SpriteImage source={sprite} style={{ width: spriteSize, height: spriteSize }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Animated.View>
        {killerSprite ? (
          <View style={[styles.killerBadge, { borderColor: accent, width: spriteSize * 0.36, height: spriteSize * 0.36, borderRadius: spriteSize * 0.18, right: haloSize * 0.04, bottom: haloSize * 0.05 }]}>
            <SpriteImage source={killerSprite} style={{ width: spriteSize * 0.3, height: spriteSize * 0.3 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
        ) : null}
      </View>
      {killerName && (
        <Text style={[styles.killer, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
          {killerName.toLocaleUpperCase()}
        </Text>
      )}
      {depth > 0 && (
        <Text style={styles.depth} maxFontSizeMultiplier={1.2}>
          🔥 {t('over.depth', { name: t(`ascension.label.${depth}` as TranslationKey) }).toLocaleUpperCase()}
        </Text>
      )}
      {challengeLabel ? (
        <Text style={styles.daily} maxFontSizeMultiplier={1.2}>
          🧩 {t('challenge.label', { code: challengeLabel }).toLocaleUpperCase()}
        </Text>
      ) : null}
      {dailyLabel && (
        <Text style={styles.daily} maxFontSizeMultiplier={1.2}>
          📅 {t('over.daily', { date: dailyLabel }).toLocaleUpperCase()}
          {streak ? `  ·  🔥 ${plural('over.streak', streak)}` : ''}
        </Text>
      )}
    </View>
  );

  const info = (
    <>
      <Text style={[styles.title, { color: accent }, victory && width >= 760 && height >= 380 && { fontSize: 30 }, short && { fontSize: 20, letterSpacing: 1 }]} accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
        {title.toLocaleUpperCase()}
      </Text>

      {/* The hero speaks: a line in their own voice for the win or the fall */}
      {quote ? (
        <Text style={[styles.quote, { color: accent }]} maxFontSizeMultiplier={1.3}>
          {"“"}{quote}{"”"}
        </Text>
      ) : null}

      {/* How far the run got: one pip per floor */}
      {!endless && height >= 340 && (
      <View style={styles.pips} accessible accessibilityLabel={t('over.progress', { floor: level, floors })}>
        {Array.from({ length: floors }, (_, i) => (
          <View key={i} style={[styles.pip, i < level && { backgroundColor: accent }, i === level - 1 && !victory && styles.pipLast]} />
        ))}
      </View>
      )}

      <View style={styles.scoreRow} accessible accessibilityLabel={`${t('over.score')}: ${score}`}>
        <Text style={styles.scoreLabel} maxFontSizeMultiplier={1.2}>{t('over.score').toLocaleUpperCase()}</Text>
        <CountedScore score={score} active={visible} calm={calm} style={styles.scoreValue} />
        {isNewBest ? (
          <Text style={styles.newBest} maxFontSizeMultiplier={1.2}>
            🏅 {(endless ? t('over.newBestFloor') : dailyLabel ? t('over.newDailyBest') : t('over.newBest')).toLocaleUpperCase()}
          </Text>
        ) : bestScore ? (
          <Text style={styles.best} maxFontSizeMultiplier={1.2}>
            {(endless
              ? t('over.bestFloor', { floor: bestScore })
              : dailyLabel
              ? t('over.bestToday', { score: bestScore.toLocaleString() })
              : t('over.best', { score: bestScore.toLocaleString() })
            ).toLocaleUpperCase()}
          </Text>
        ) : null}
      </View>

      {(nearGems || nearBest) && (
        <View style={styles.headline} accessibilityLiveRegion="polite">
          <Ionicons name="flag" size={18} color="#FFD54F" />
          <Text style={styles.headlineText} maxFontSizeMultiplier={1.2}>
            {nearGems ? plural('over.gemsLeft', gemsLeft as number, { floor: level }) : t('over.shortOfBest', { points: (bestScore ?? 0) - score })}
          </Text>
        </View>
      )}

      <View style={styles.statsRow}>
        {stats.map(s => (
          <View key={s.label} style={styles.stat} accessible accessibilityLabel={`${s.label}: ${s.value}`}>
            <Ionicons name={s.icon} size={16} color={s.color} />
            <Text style={[styles.statValue, { color: s.color }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {s.value}
            </Text>
          </View>
        ))}
        {embers && embers > 0 ? (
          <TouchableOpacity
            style={[styles.stat, styles.embersPill]}
            onPress={breakdown ? () => setShowBreakdown(v => !v) : undefined}
            disabled={!breakdown}
            activeOpacity={0.8}
            accessibilityRole={breakdown ? 'button' : 'text'}
            accessibilityState={breakdown ? { expanded: showBreakdown } : undefined}
            accessibilityLabel={`${plural('over.embers', embers)}${breakdown ? `. ${breakdown}` : ''}`}
          >
            <Text style={styles.embersText} maxFontSizeMultiplier={1.2}>🔥 {plural('over.embers', embers).toLocaleUpperCase()}</Text>
            {breakdown ? <Ionicons name={showBreakdown ? 'chevron-up' : 'chevron-down'} size={14} color="#FFAB40" /> : null}
          </TouchableOpacity>
        ) : null}
      </View>

      {breakdown && showBreakdown ? (
        <Text style={styles.breakdown} maxFontSizeMultiplier={1.2}>
          {breakdown}
        </Text>
      ) : null}

      {notes.length > 0 && (
        <View style={styles.notes}>
          {notes.map((n, i) => (
            <Reveal key={n.key} delay={450 + i * 260} calm={calm}>
              <View style={styles.noteRow}>
                <Ionicons name={n.icon} size={16} color={n.color} style={styles.noteIcon} />
                <Text style={[styles.noteText, { color: n.color }]} maxFontSizeMultiplier={1.2}>{n.text}</Text>
              </View>
            </Reveal>
          ))}
        </View>
      )}
      {unlockRows.length > 0 && (
        <Reveal delay={1000} calm={calm}>
        <View style={styles.unlockCard} accessibilityLiveRegion="polite">
          <Text style={styles.unlockTitle} maxFontSizeMultiplier={1.2}>🔓 {t('over.unlock.title').toLocaleUpperCase()}</Text>
          {unlockRows.map(row => (
            <View key={`${row.kind}${row.skin ? `-${row.skin.hero}-${row.skin.skin}` : ''}`} style={styles.unlockRow}>
              <Text style={styles.unlockText} numberOfLines={2} maxFontSizeMultiplier={1.2}>{row.text}</Text>
              {onTryUnlock ? (
                <TouchableOpacity style={styles.tryButton} onPress={() => onTryUnlock(row.kind, row.skin)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${t('over.unlock.try')}: ${row.text}`}>
                  <Text style={styles.tryText} numberOfLines={1} maxFontSizeMultiplier={1.2}>{t('over.unlock.try').toLocaleUpperCase()}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>
        </Reveal>
      )}
      {!demo && goals && goals.length > 0 && (
        <Reveal delay={1300} calm={calm}>
          <View style={styles.goals} accessible accessibilityLabel={t('over.goalTitle')}>
            {goals.map((g, i) => (
              <GoalLine key={`${g.kind}${i}`} goal={g} highlight={!!canBuyNow && g.kind === 'forge' && g.affordable} />
            ))}
          </View>
        </Reveal>
      )}
      {demo && (
        <Text style={styles.demoBody} maxFontSizeMultiplier={1.2}>
          {t('over.demo.body', { floor: level })}
        </Text>
      )}
      {tip && height >= 340 && (
        <View style={styles.tip}>
          <Ionicons name="bulb" size={16} color="#FFD54F" />
          <Text style={styles.tipText} maxFontSizeMultiplier={1.2}>{tip}</Text>
        </View>
      )}

    </>
  );

  const actions = (
    <>
      {demo && onUnlock ? (
        <TouchableOpacity
          style={[styles.retry, { backgroundColor: accent }]}
          onPress={onUnlock}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('over.demo.cta')}
        >
          <Ionicons name="lock-open" size={22} color="#000" />
          <Text style={[styles.retryText, { color: '#000' }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
            {t('over.demo.cta').toLocaleUpperCase()}
          </Text>
        </TouchableOpacity>
      ) : (
      <TouchableOpacity
        style={[styles.retry, { backgroundColor: accent }]}
        onPress={onRetry}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('over.retry')}
      >
        <Ionicons name="refresh" size={22} color={victory ? '#000' : '#fff'} />
        <Text style={[styles.retryText, victory && { color: '#000' }, short && { fontSize: 14, letterSpacing: 0.5 }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
          {t('over.retry').toLocaleUpperCase()}
        </Text>
      </TouchableOpacity>
      )}

      <View style={[styles.secondary, short && { flexShrink: 0 }]}>
        {demo && onUnlock ? (
          <TouchableOpacity style={styles.sideButton} onPress={onRetry} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('over.retry')}>
            <Ionicons name="refresh" size={18} color="#fff" />
            {!short && <Text style={styles.sideText} numberOfLines={1} maxFontSizeMultiplier={1.2}>{t('over.retry').toLocaleUpperCase()}</Text>}
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.sideButton, short && styles.iconButton, short && styles.iconShort]} onPress={onMainMenu} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('over.menu')}>
          <Ionicons name="home" size={18} color="#fff" />
          {!short && <Text style={styles.sideText} numberOfLines={1} maxFontSizeMultiplier={1.2}>{t('over.menu').toLocaleUpperCase()}</Text>}
        </TouchableOpacity>
        {onForge && embers && embers > 0 ? (
          <TouchableOpacity style={[styles.sideButton, styles.forgeButton, canBuyNow && styles.forgeButtonPrimary, short && styles.iconButton, short && styles.iconShort]} onPress={onForge} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('cover.forge')}>
            <Ionicons name="hammer" size={18} color={canBuyNow ? '#1a0f00' : '#FFAB40'} />
            {!short && <Text style={[styles.sideText, { color: canBuyNow ? '#1a0f00' : '#FFAB40' }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{t('cover.forge').toLocaleUpperCase()}</Text>}
          </TouchableOpacity>
        ) : null}
        {onShare ? (
          <TouchableOpacity style={[styles.sideButton, styles.iconButton]} onPress={onShare} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('over.share')}>
            <Ionicons name="share-social" size={20} color="#4FC3F7" />
          </TouchableOpacity>
        ) : null}
      </View>
    </>
  );

  // A wide (landscape) card never grows taller than the screen: its information scrolls inside the right column
  // while the buttons stay visible under it, so "Retry" is always one tap away on a small phone, however many
  // lines a run produced (record, embers breakdown, achievements, unlocks, goals).
  const availableHeight = height - Math.max(insets.top, 8) - Math.max(insets.bottom, 8) - 8;
  const right = wide ? (
    <View style={[styles.right, { maxHeight: availableHeight - 32 }]}>
      <ScrollView style={styles.infoScroll} contentContainerStyle={styles.infoContent} showsVerticalScrollIndicator={false}>
        {info}
      </ScrollView>
      <View style={[styles.actions, short && styles.actionsShort]}>{actions}</View>
    </View>
  ) : (
    <View style={styles.right}>
      {info}
      {actions}
    </View>
  );

  // Only a victory is celebrated, with the game's own gems and arrows raining over the cave and embers rising.
  // A defeat gets a quieter mood: a few embers drifting up from the dark.
  const celebrate = !calm && victory;

  return (
    <OverlayContainer>
      {!calm && <EmberParticles count={victory ? 18 : 8} />}
      <Animated.View
        style={[
          styles.card,
          { borderColor: accent, shadowColor: accent, width: cardWidth, opacity: fade, transform: [{ scale: cardAnim }] },
          wide && styles.cardRow,
        ]}
      >
        {left}
        {right}
      </Animated.View>
      {celebrate && <GemShower count={width >= 900 ? 38 : 26} />}
    </OverlayContainer>
  );
};

export default GameOverOverlay;

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(16, 12, 30, 0.97)',
    borderRadius: 26,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 24,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  left: { alignItems: 'center', gap: 8 },
  halo: { position: 'absolute' },
  quote: { fontStyle: 'italic', fontWeight: '700', fontSize: 14, opacity: 0.95 },
  headline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(255,213,79,0.12)', borderWidth: 1, borderColor: 'rgba(255,213,79,0.5)' },
  headlineText: { flex: 1, color: '#FFD54F', fontWeight: '900', fontSize: 14 },
  killerBadge: { position: 'absolute', backgroundColor: '#1a1030', borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  spriteRing: {
    borderWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  killer: { fontWeight: '900', fontSize: 14, letterSpacing: 2, textAlign: 'center', maxWidth: '100%' },
  depth: { color: '#FF7043', fontWeight: '900', fontSize: 12, letterSpacing: 1.5, textAlign: 'center' },
  daily: { color: '#4FC3F7', fontWeight: '800', fontSize: 12, letterSpacing: 1.2, textAlign: 'center' },
  right: { flex: 1, width: '100%', gap: 8 },
  infoScroll: { flexShrink: 1, flexGrow: 0 },
  infoContent: { gap: 8 },
  actions: { gap: 8 },
  actionsShort: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  pips: { flexDirection: 'row', gap: 4 },
  pip: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.14)' },
  pipLast: { borderWidth: 1, borderColor: '#fff' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 },
  scoreLabel: { color: '#9a9ab0', fontWeight: '900', fontSize: 12, letterSpacing: 2 },
  scoreValue: { color: '#FFD54F', fontWeight: '900', fontSize: 38, minWidth: 110 },
  newBest: { color: '#FFD54F', fontWeight: '900', fontSize: 12, letterSpacing: 1.4 },
  best: { color: '#8f8fa8', fontWeight: '800', fontSize: 11, letterSpacing: 1.2 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statValue: { fontWeight: '900', fontSize: 16 },
  embersPill: { backgroundColor: 'rgba(255,171,64,0.16)' },
  explain: { color: '#FFCC80', fontSize: 12, fontWeight: '700', textAlign: 'center', maxWidth: 440 },
  embersText: { color: '#FFAB40', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  bonus: { color: '#9ee37d', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  breakdown: { color: '#c9b79a', fontWeight: '700', fontSize: 11, letterSpacing: 0.4 },
  streakLost: { color: '#ff8a80', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  goals: { gap: 6, alignSelf: 'stretch' },
  notes: { gap: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteIcon: { marginTop: 1 },
  noteText: { flex: 1, fontWeight: '700', fontSize: 12.5, lineHeight: 17 },
  unlockCard: { gap: 6, backgroundColor: 'rgba(118,255,3,0.1)', borderColor: 'rgba(118,255,3,0.7)', borderWidth: 2, borderRadius: 14, padding: 10 },
  unlockTitle: { color: '#76FF03', fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },
  unlockRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unlockText: { flex: 1, color: '#f4ffe6', fontWeight: '800', fontSize: 14 },
  tryButton: { minHeight: MIN_TOUCH - 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#76FF03', alignItems: 'center', justifyContent: 'center' },
  tryText: { color: '#10260a', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  demoBody: { color: '#FFE9A8', fontSize: 13, fontWeight: '700' },
  nearMiss: { color: '#80DEEA', fontWeight: '800', fontSize: 13 },
  achievement: { color: '#FFD54F', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  unlocked: { color: '#76FF03', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  tip: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,213,79,0.1)',
    borderRadius: 12,
    padding: 8,
  },
  tipText: { color: '#e6e0c8', fontSize: 12, flex: 1 },
  retry: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: MIN_TOUCH + 6,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.3)',
  },
  retryText: { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 2 },
  secondary: { flexDirection: 'row', gap: 8 },
  sideButton: {
    flex: 1,
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
  },
  forgeButton: { borderColor: 'rgba(255,171,64,0.6)', backgroundColor: 'rgba(255,171,64,0.12)' },
  forgeButtonPrimary: { backgroundColor: '#FFAB40', borderColor: '#FFD180' },
  iconButton: { flexGrow: 0, flexShrink: 0, flexBasis: MIN_TOUCH, width: MIN_TOUCH, minWidth: MIN_TOUCH, paddingHorizontal: 0 },
  iconShort: { flexBasis: 38, width: 38, minWidth: 38 },
  sideText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
});
