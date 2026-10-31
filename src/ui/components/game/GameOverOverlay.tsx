import React, { useEffect, useRef, useState } from 'react';
import { Animated, ImageBackground, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Text from "../Text";
import EmberIcon from "../EmberIcon";
import GlyphIcon from "../GlyphIcon";
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
import SpriteImage from '../SpriteImage';
import GemShower from './GemShower';
import { CELEBRATION_LOOKS } from '../../cosmeticArt';
import { equippedCosmetic } from '../../../core/cosmetics/cosmetics';
import { peekLocalStats } from '../../../services/localStats';
import EmberParticles from '../EmberParticles';
import { useSettingsStore } from '../../../state/settings/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
  /** The standing of a live duel: a headline (who won), the rival's line and the colour of the headline. */
  duelResult?: { headline: string; line: string; prize: string; color: string } | null;
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
  masteryUp?: { hero: number; level: number } | null;
  /** One of the first runs: a line says gems stay in the run while embers are kept for good. */
  explainEmbers?: boolean;
  /** Gems still on the floor when the run ended (for the near-miss line). */
  gemsLeft?: number;
  onShare?: () => void;
  /** Copies the daily's text to paste in a chat; resolves with whether it was copied. */
  onCopyText?: () => Promise<boolean>;
  /** Opens the Forge (shown when the run earned embers). */
  onForge?: () => void;
  onRetry: () => void;
  /** A different name for the main button (a duel offers a rematch). */
  retryLabel?: string;
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
  duelResult,
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
  masteryUp,
  gemsLeft,
  onShare,
  onCopyText,
  onForge,
  onRetry,
  retryLabel,
  onMainMenu,
}: Props) => {
  // The copy button answers with a check for a moment (the text itself is out of sight, in the clipboard).
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const copyText = async () => {
    if (onCopyText && (await onCopyText())) setCopied(true);
  };
  const { t, plural } = useT();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardAnim = useRef(new Animated.Value(0.9)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const calm = useSettingsStore(st => st.reduceFlash);
  // The celebration worn in the Collection, read once.
  const [celebration] = useState(() => {
    const saved = peekLocalStats();
    const id = saved ? equippedCosmetic(saved, 'celebration') : null;
    return id ? CELEBRATION_LOOKS[id] : undefined;
  });

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
  // The scrolling extras (landscape): how tall the box is, how tall its content, and whether it is scrolled to the end.
  const [extrasBox, setExtrasBox] = useState(0);
  const [extrasContent, setExtrasContent] = useState(0);
  const [extrasAtEnd, setExtrasAtEnd] = useState(false);
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
  // A landscape phone (height runs out): the same two rows of buttons, a little lower, so the run's rewards keep room.
  const snug = wide && height < 430;
  const accent = victory || demo ? '#FFD54F' : '#FF5252';
  const killerSprite = !victory && deathCause ? KILLERS[deathCause] : undefined;
  const heroSprite = victory || demo ? character.winImage : (character.loseImage ?? character.scoreImage);
  const sprite = heroSprite;
  const spriteSize = height < 330 ? 104 : compact ? 132 : 196;
  // The notch / gesture insets are padding of the overlay, so the card must fit what is left of them.
  const usable = width - Math.max(insets.left, 12) - Math.max(insets.right, 12);
  const cardWidth = Math.min(usable * 0.98, wide ? 820 : 400);

  const killerName = !victory && deathCause ? t(`over.killer.${deathCause}` as TranslationKey) : null;


  const stats = [
    { art: require('../../../assets/sprites/items/Icon_Gem.png'), label: t('over.gems'), value: String(totalCoins), color: '#7FE3FF' },
    { art: require('../../../assets/sprites/tools/Tool_Undo.png'), label: t('over.time'), value: formatTime(time), color: '#C8B6FF' },
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
      : t(`mission.desc.${def.metric}` as TranslationKey, { n: def.target });
  };

  const notes: { key: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; text: string }[] = [
    ...(payout && payout.welcomeBack > 0 ? [{ key: 'welcome', icon: 'gift' as const, color: '#9ee37d', text: t('over.welcomeBack', { count: payout.welcomeBack }) }] : []),
    ...(rankUp ? [{ key: 'rank', icon: 'medal' as const, color: '#FFD54F', text: t('over.rankUp', { name: t(`rank.${rankUp}` as TranslationKey) }) }] : []),
    ...(masteryUp ? [{ key: 'mastery', icon: 'star' as const, color: '#FFB74D', text: t('mastery.up', { name: heroText(t, masteryUp.hero, 'name'), level: masteryUp.level }) }] : []),
    ...(missionsDone ?? []).map(id => ({ key: `m-${id}`, icon: 'flag' as const, color: '#4FC3F7', text: t('over.mission', { name: missionLabel(id) }) })),
    ...(achievements && achievements.length > 0 ? [{ key: 'ach', icon: 'trophy' as const, color: '#FFD54F', text: plural('over.achievements', achievements.length, { names: achievementNames }) }] : []),
    ...(dailyLabel && streakLost ? [{ key: 'lost', icon: 'heart-dislike' as const, color: '#ff8a80', text: t('over.streakLost', { best: bestStreak ?? streakLost }) }] : []),
    ...(dailyLabel && freezeUsed ? [{ key: 'fused', icon: 'snow' as const, color: '#80D8FF', text: t('over.freezeUsed') }] : []),
    ...(dailyLabel && freezeEarned ? [{ key: 'fearn', icon: 'snow' as const, color: '#80D8FF', text: t('over.freezeEarned') }] : []),
  ];

  // The left column, like the floor-cleared card: what happened in a few big words, the hero, and who struck.
  const kicker = demo
    ? t('complete.floor', { n: level })
    : victory
      ? t('over.victory')
      : endless
        ? t('over.fellEndless', { floor: level })
        : t('over.fell', { floor: level });
  const headline = demo ? t('over.demo.title') : victory ? t('over.win') : t('over.defeat');
  const glow = Math.round(spriteSize * 0.95);
  const left = (
    <View style={[styles.left, wide && { width: '38%' }]}>
      <Text style={[styles.kickerText, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>
        {kicker.toLocaleUpperCase()}
      </Text>
      <Text style={[styles.headline2, short && { fontSize: 22 }]} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>
        {headline.toLocaleUpperCase()}
      </Text>
      <View style={{ width: glow * 1.15, height: spriteSize, alignItems: 'center', justifyContent: 'center' }}>
        <View pointerEvents="none" style={[styles.glowOne, { width: glow, height: glow, borderRadius: glow / 2, backgroundColor: accent }]} />
        <Animated.View style={{ transform: [{ scale: heroPop }, { translateY: heroFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }}>
          <SpriteImage source={sprite} style={{ width: spriteSize * 1.12, height: spriteSize * 1.12 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Animated.View>
      </View>
      {killerSprite && killerName ? (
        <View style={[styles.killerPill, { borderColor: accent + '88' }]} accessible accessibilityLabel={`${t('over.killedBy')}: ${killerName}`}>
          <SpriteImage source={killerSprite} style={styles.killerArt} resizeMode="contain" accessibilityIgnoresInvertColors />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.killerKicker} maxFontSizeMultiplier={1.1}>{t('over.killedBy').toLocaleUpperCase()}</Text>
            <Text style={[styles.killer, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>
              {killerName}
            </Text>
          </View>
        </View>
      ) : null}
      {duelResult ? (
        <View style={styles.duelBox} accessible accessibilityLabel={`${duelResult.headline}. ${duelResult.line}`}>
          <Text style={[styles.duelHeadline, { color: duelResult.color }]} maxFontSizeMultiplier={1.2}>
            <GlyphIcon name="swords" size={16} /> {duelResult.headline.toLocaleUpperCase()}
          </Text>
          <Text style={styles.duelLine} maxFontSizeMultiplier={1.2}>
            {duelResult.line}
          </Text>
          {duelResult.prize ? (
            <Text style={[styles.duelLine, { color: duelResult.color }]} maxFontSizeMultiplier={1.2}>
              <EmberIcon size={13} /> {duelResult.prize}
            </Text>
          ) : null}
        </View>
      ) : null}
      {challengeLabel ? (
        <Text style={styles.daily} maxFontSizeMultiplier={1.2}>
          <GlyphIcon name="puzzle" size={13} /> {t('challenge.label', { code: challengeLabel }).toLocaleUpperCase()}
        </Text>
      ) : null}
      {dailyLabel && (
        // The daily and its streak each get their own line, so neither breaks in the middle.
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={styles.daily} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
            <GlyphIcon name="calendar" size={13} /> {t('over.daily', { date: dailyLabel }).toLocaleUpperCase()}
          </Text>
          {streak ? (
            <Text style={[styles.daily, { color: '#FFAB40' }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              <GlyphIcon name="flame" size={13} /> {plural('over.streak', streak)}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );

  // The right column, top: a record ribbon, four painted tiles and the way down. Always in full view, never scrolled away.
  const tile = (key: string, art: number, value: React.ReactNode, label: string, color: string, onPress?: () => void) => (
    <TouchableOpacity
      key={key}
      disabled={!onPress}
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.tile2, snug && styles.tile2Snug]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
    >
      <SpriteImage source={art} style={styles.tile2Art} resizeMode="contain" />
      <View style={{ flex: 1 }}>
        {typeof value === 'string' ? (
          <Text style={[styles.tile2Value, { color }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>{value}</Text>
        ) : (
          value
        )}
        <Text style={styles.tile2Label} numberOfLines={1} maxFontSizeMultiplier={1.1}>{label.toLocaleUpperCase()}</Text>
      </View>
      {onPress ? <Ionicons name={showBreakdown ? 'chevron-up' : 'chevron-down'} size={14} color="#FFAB40" /> : null}
    </TouchableOpacity>
  );
  const essentials = (
    <>
      {isNewBest ? (
        <View style={styles.ribbon} accessibilityLiveRegion="polite">
          <GlyphIcon name="medal" size={16} />
          <Text style={styles.ribbonText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {(endless ? t('over.newBestFloor') : dailyLabel ? t('over.newDailyBest') : t('over.newBest')).toLocaleUpperCase()}
          </Text>
        </View>
      ) : null}
      <View style={styles.tiles2}>
        {tile(
          'score',
          require('../../../assets/sprites/ui/Icon_Trophy.png'),
          <CountedScore score={score} active={visible} calm={calm} style={[styles.tile2Value, { color: '#FFE7A8' }]} />,
          bestScore && !isNewBest
            ? `${t('over.score')} · ${(endless ? t('over.bestFloor', { floor: bestScore }) : t('over.best', { score: bestScore }))}`
            : t('over.score'),
          '#FFE7A8',
        )}
        {tile('gems', stats[0].art, stats[0].value, stats[0].label, stats[0].color)}
        {tile('time', stats[1].art, stats[1].value, stats[1].label, stats[1].color)}
        {embers && embers > 0
          ? tile('embers', require('../../../assets/sprites/items/Icon_Ember.png'), `+${embers}`, t('cover.embers'), '#FFAB40', breakdown ? () => setShowBreakdown(v => !v) : undefined)
          : tile('floor', require('../../../assets/sprites/ui/Icon_Flag.png'), endless ? String(level) : `${level}/${floors}`, t('over.floorLabel'), '#9EE37D')}
      </View>
      {breakdown && showBreakdown ? (
        <Text style={styles.breakdown} maxFontSizeMultiplier={1.2}>
          {breakdown}
        </Text>
      ) : null}
      {!endless && height >= 340 && (
        <View style={[styles.track, snug && styles.pipsSnug]} accessible accessibilityLabel={t('over.progress', { floor: level, floors })}>
          {Array.from({ length: floors }, (_, i) => {
            const floor = i + 1;
            const fell = !victory && floor === level;
            return (
              <React.Fragment key={i}>
                {i > 0 ? <View style={[styles.trackLine, floor <= level && { backgroundColor: accent }]} /> : null}
                {fell ? (
                  <View style={styles.fallWrap}>
                    <View style={[styles.fallGlow, { backgroundColor: accent }]} />
                    <View style={[styles.trackFall, { backgroundColor: accent }]} />
                  </View>
                ) : floor === floors ? (
                  <SpriteImage source={require('../../../assets/sprites/ui/Icon_Skull.png')} style={[styles.trackLair, victory && { opacity: 1 }]} resizeMode="contain" />
                ) : (
                  <View style={[styles.trackDot, floor <= level && { backgroundColor: accent, borderColor: accent }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
      )}
    </>
  );

  // Everything else the run produced (a near miss, notes, unlocks, goals, a tip): in landscape it scrolls under the essentials.
  const extras = (
    <>

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
          <Text style={styles.unlockTitle} maxFontSizeMultiplier={1.2}><GlyphIcon name="padlock" size={13} /> {t('over.unlock.title').toLocaleUpperCase()}</Text>
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
      {demo && (
        <Text style={styles.demoBody} maxFontSizeMultiplier={1.2}>
          {t('over.demo.body', { floor: level })}
        </Text>
      )}

    </>
  );

  const actions = (
    <>
      {demo && onUnlock ? (
        <TouchableOpacity
          style={[styles.retry, snug && styles.retrySnug, { backgroundColor: accent }]}
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
        style={[styles.retry, snug && styles.retrySnug, { backgroundColor: accent }]}
        onPress={onRetry}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={retryLabel ?? t('over.retry')}
      >
        <Ionicons name="refresh" size={22} color={victory ? '#000' : '#fff'} />
        <Text style={[styles.retryText, victory && { color: '#000' }, snug && styles.retryTextSnug, short && { fontSize: 14, letterSpacing: 0.5 }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
          {(retryLabel ?? t('over.retry')).toLocaleUpperCase()}
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
        <TouchableOpacity style={[styles.sideButton, snug && styles.sideSnug, short && styles.iconButton, short && styles.iconShort]} onPress={onMainMenu} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('over.menu')}>
          <Ionicons name="home" size={18} color="#fff" />
          {!short && <Text style={styles.sideText} numberOfLines={1} maxFontSizeMultiplier={1.2}>{t('over.menu').toLocaleUpperCase()}</Text>}
        </TouchableOpacity>
        {onForge && embers && embers > 0 ? (
          <TouchableOpacity style={[styles.sideButton, snug && styles.sideSnug, styles.forgeButton, canBuyNow && styles.forgeButtonPrimary, short && styles.iconButton, short && styles.iconShort]} onPress={onForge} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('cover.forge')}>
            <GlyphIcon name="hammer" size={20} />
            {!short && <Text style={[styles.sideText, { color: canBuyNow ? '#1a0f00' : '#FFAB40' }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{t('cover.forge').toLocaleUpperCase()}</Text>}
          </TouchableOpacity>
        ) : null}
        {onShare ? (
          <TouchableOpacity style={[styles.sideButton, snug && styles.sideSnug, styles.iconButton]} onPress={onShare} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('over.share')}>
            <Ionicons name="share-social" size={20} color="#4FC3F7" />
          </TouchableOpacity>
        ) : null}
        {onCopyText ? (
          <TouchableOpacity style={[styles.sideButton, snug && styles.sideSnug, styles.iconButton]} onPress={copyText} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t(copied ? 'over.copied' : 'over.copyText')}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={20} color={copied ? '#69F0AE' : '#4FC3F7'} />
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
    <View style={[styles.right, snug && styles.rightSnug, { maxHeight: availableHeight - 32 }]}>
      {essentials}
      <View style={styles.extrasBox}>
        <ScrollView
          style={styles.infoScroll}
          contentContainerStyle={styles.infoContent}
          showsVerticalScrollIndicator={false}
          onLayout={e => setExtrasBox(e.nativeEvent.layout.height)}
          onContentSizeChange={(_, h) => setExtrasContent(h)}
          onScroll={e => setExtrasAtEnd(e.nativeEvent.contentOffset.y + e.nativeEvent.layoutMeasurement.height >= e.nativeEvent.contentSize.height - 4)}
          scrollEventThrottle={64}
        >
          {extras}
        </ScrollView>
        {/* More below: a fade says so, instead of a row cut in half at the edge. */}
        {extrasContent > extrasBox + 4 && !extrasAtEnd ? (
          <LinearGradient pointerEvents="none" colors={['rgba(24,17,11,0)', 'rgba(24,17,11,0.95)']} style={styles.moreFade} />
        ) : null}
      </View>
      <View style={[styles.actions, short && styles.actionsShort]}>{actions}</View>
    </View>
  ) : (
    <View style={styles.right}>
      {essentials}
      {extras}
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
        <ImageBackground source={require('../../../assets/sprites/backgrounds/Cover_Background.png')} style={StyleSheet.absoluteFill} resizeMode="cover" imageStyle={{ opacity: 0.28 }} />
        <LinearGradient colors={['rgba(44,30,18,0.82)', 'rgba(18,12,8,0.97)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
        {left}
        {right}
      </Animated.View>
      {celebrate && <GemShower count={width >= 900 ? 38 : 26} look={celebration} />}
    </OverlayContainer>
  );
};

export default GameOverOverlay;

const styles = StyleSheet.create({
  duelBox: { alignSelf: 'stretch', alignItems: 'center', gap: 2, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  duelHeadline: { fontWeight: '900', fontSize: 15, letterSpacing: 1.5, textAlign: 'center' },
  duelLine: { color: '#E9E0D7', fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
  card: {
    backgroundColor: 'rgba(24, 17, 11, 0.97)',
    overflow: 'hidden',
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
  quoteLeft: { textAlign: 'center', fontSize: 13, maxWidth: 260 },
  extrasBox: { flexShrink: 1, minHeight: 0 },
  moreFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 28 },
  headline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(255,213,79,0.12)', borderWidth: 1, borderColor: 'rgba(255,213,79,0.5)' },
  headlineText: { flex: 1, color: '#FFD54F', fontWeight: '900', fontSize: 14 },
  kickerText: { fontWeight: '900', fontSize: 12.5, letterSpacing: 2.5, textAlign: 'center' },
  headline2: { color: '#fff', fontWeight: '900', fontSize: 28, letterSpacing: 3, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  glowOne: { position: 'absolute', opacity: 0.15 },
  killerPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingLeft: 4, paddingRight: 12, borderRadius: 22, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.35)', maxWidth: '100%' },
  killerArt: { width: 38, height: 38 },
  ribbon: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'stretch', paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(255,213,79,0.16)', borderWidth: 1.5, borderColor: 'rgba(255,213,79,0.6)' },
  ribbonText: { color: '#FFD54F', fontWeight: '900', fontSize: 12.5, letterSpacing: 1.5 },
  tiles2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'stretch' },
  tile2: { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.35)' },
  tile2Snug: { paddingVertical: 5 },
  tile2Art: { width: 32, height: 32 },
  tile2Value: { fontWeight: '900', fontSize: 19 },
  tile2Label: { color: '#B99A7C', fontWeight: '900', fontSize: 11, letterSpacing: 0.8 },
  killerKicker: { color: '#B99A7C', fontWeight: '900', fontSize: 11, letterSpacing: 2 },
  track: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  trackLine: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)' },
  trackDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(0,0,0,0.4)' },
  trackFall: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: '#FFE1DC' },
  fallWrap: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  fallGlow: { position: 'absolute', width: 22, height: 22, borderRadius: 11, opacity: 0.3 },
  trackLair: { width: 22, height: 22, opacity: 0.7 },
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
  scoreLabel: { color: '#C0A58A', fontWeight: '900', fontSize: 12, letterSpacing: 2 },
  // Fixed-width digits keep the counting score from jittering, so the best score can sit right beside it.
  scoreValue: { color: '#FFD54F', fontWeight: '900', fontSize: 34, fontVariant: ['tabular-nums'] },
  newBest: { color: '#FFD54F', fontWeight: '900', fontSize: 12, letterSpacing: 1.4 },
  best: { color: '#B99C7E', fontWeight: '800', fontSize: 11, letterSpacing: 1.2 },
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
  // Landscape phones: buttons at phone scale (still comfortable touch targets), so the card is not all buttons.
  sideSnug: { minHeight: 40, borderRadius: 12 },
  retryTextSnug: { fontSize: 15, letterSpacing: 1.5 },
  titleSnug: { fontSize: 19, letterSpacing: 1.5 },
  statsLeft: { justifyContent: 'center', marginTop: 2 },
  // Landscape phones: the top of the card a little tighter, so whole rows of the extras fit under it.
  rightSnug: { gap: 6 },
  pipsSnug: { marginTop: -2 },
  scoreSnug: { fontSize: 30, lineHeight: 34 },
  statSnug: { paddingVertical: 4 },
  retrySnug: { minHeight: 44, borderRadius: 14, borderBottomWidth: 3 },
  iconShort: { flexBasis: 38, width: 38, minWidth: 38 },
  sideText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
});
