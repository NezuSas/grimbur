import React from "react";
import GameOverOverlay from "../../ui/components/game/GameOverOverlay";
import HighScoreEntryModal from "../../ui/components/game/HighScoreEntryModal";
import IntermissionOverlay from "../../ui/components/game/IntermissionOverlay";
import PauseOverlay from "../../ui/components/game/PauseOverlay";
import RelicDraftOverlay from "../../ui/components/game/RelicDraftOverlay";
import ReviveOverlay from "../../ui/components/game/ReviveOverlay";
import RunLoadingCover from "../../ui/components/game/RunLoadingCover";
import { altarIsFree } from "../../core/engine/reducer";
import { biomeFor, isNewBiome } from "../../core/engine/biomes";
import { isLairFloor } from "../../core/engine/lair";
import { GAME_CONFIG } from "../../config/gameConfig";
import type { Character } from "../../data/characters";
import type { GameState } from "../../core/engine/types";
import type { RelicId } from "../../core/engine/relics";
import type { Door, ShopItem } from "../../core/engine/shop";
import type { RunResult } from "./types";

type Props = {
  state: GameState;
  character: Character;
  /** Seconds played (read from the session clock when the card is drawn). */
  time: number;
  /** The opaque cover shown until the first board has really been drawn. */
  bootCover: boolean;
  /** Between two floors: the shop and the fork. */
  shop: {
    visible: boolean;
    doors: [Door, Door] | null;
    chosen: 0 | 1;
    onChoose: (door: 0 | 1) => void;
    onBuy: (item: ShopItem) => void;
    onAltar: () => void;
    onGo: () => void;
  };
  onPickRelic: (id: RelicId) => void;
  pause: { visible: boolean; saveOnExit: boolean; canRestart: boolean; onResume: () => void; onRestart: () => void; onMainMenu: () => void };
  gameOver: {
    visible: boolean;
    result: RunResult | null;
    isDaily: boolean;
    dailyDate: string;
    /** The code of a friend challenge, when the run is one. */
    challengeLabel?: string | null;
    /** The standing of a live duel, when the run is one. */
    duelResult?: { headline: string; line: string; prize: string; color: string } | null;
    ascension: number;
    endless: boolean;
    /** The free part of the game ended: the card is the demo summary with the unlock button. */
    demo: boolean;
    onTryUnlock: (kind: "hero" | "depth" | "endless" | "skin", detail?: { hero: number; skin: string }) => void;
    onShare: () => void;
    /** Copies the daily's text (only offered on the daily); resolves with whether it was copied. */
    onCopyText?: () => Promise<boolean>;
    onUnlock: () => void;
    onForge: () => void;
    onRetry: () => void;
    retryLabel?: string;
    onMainMenu: () => void;
  };
  revive: { visible: boolean; price: number; embers: number; used: number; busy: boolean; onRevive: () => void; onDecline: () => void };
  highScore: { visible: boolean; daily?: boolean; challenge?: boolean; onSubmit: (name: string) => Promise<void>; onSkip: () => void };
};

/**
 * Every overlay that covers the game screen: the shop between floors, the relic draft, the pause card, the result card and the
 * high-score entry. The screen decides when each is visible; this only draws them from the state.
 */
const GameOverlays: React.FC<Props> = ({ state, character, time, bootCover, shop, onPickRelic, pause, gameOver, revive, highScore }) => {
  const result = gameOver.result;
  const levelUpWindow = state.isLevelUp && !state.isVictory;
  return (
    <>
      <IntermissionOverlay
        visible={shop.visible && levelUpWindow}
        nextFloor={state.level + 1}
        nextIsLair={isLairFloor(state.mode, state.level + 1)}
        newBiome={isNewBiome(state.level + 1, state.mode) ? biomeFor(state.level + 1, state.mode) : null}
        gems={state.gems}
        shield={state.shield}
        altarFree={altarIsFree(state)}
        items={state.items}
        doors={shop.doors}
        chosen={shop.chosen}
        onChoose={shop.onChoose}
        onBuy={shop.onBuy}
        altarUsed={state.altarUsed}
        onAltar={shop.onAltar}
        onGo={shop.onGo}
      />

      <RelicDraftOverlay offer={state.pendingDraft} floor={state.level} lairNext={isLairFloor(state.mode, state.level)} onPick={onPickRelic} />

      <PauseOverlay visible={pause.visible} saveOnExit={pause.saveOnExit} canRestart={pause.canRestart} onResume={pause.onResume} onRestart={pause.onRestart} onMainMenu={pause.onMainMenu} />

      <ReviveOverlay visible={revive.visible} price={revive.price} embers={revive.embers} used={revive.used} busy={revive.busy} onRevive={revive.onRevive} onDecline={revive.onDecline} />

      <GameOverOverlay
        visible={gameOver.visible}
        score={state.score}
        level={state.level}
        totalCoins={state.totalCoins}
        time={time}
        character={character}
        deathCause={state.deathCause}
        victory={state.isVictory}
        bestScore={result?.bestScore}
        isNewBest={result?.isNewBest}
        dailyLabel={gameOver.isDaily ? gameOver.dailyDate : undefined}
        challengeLabel={gameOver.challengeLabel}
        duelResult={gameOver.duelResult}
        depth={gameOver.ascension}
        streak={result?.streak}
        unlockedHeroes={result?.unlocked}
        achievements={result?.achievements}
        embers={result?.embers}
        payout={result?.payout}
        streakLost={result?.streakLost}
        bestStreak={result?.bestStreak}
        freezeUsed={result?.freezeUsed}
        freezeEarned={result?.freezeEarned}
        unlocks={result?.unlocks}
        onTryUnlock={gameOver.onTryUnlock}
        goals={result?.goals}
        canBuyNow={result?.canBuyNow}
        explainEmbers={result?.early}
        missionsDone={result?.missionsDone}
        rankUp={result?.rankUp}
        gemsLeft={state.isGameOver ? state.coins : undefined}
        onShare={gameOver.onShare}
        onCopyText={gameOver.onCopyText}
        floors={GAME_CONFIG.expedition.floors}
        endless={gameOver.endless}
        demo={gameOver.demo}
        onUnlock={gameOver.onUnlock}
        onForge={gameOver.onForge}
        onRetry={gameOver.onRetry}
        retryLabel={gameOver.retryLabel}
        onMainMenu={gameOver.onMainMenu}
      />

      <RunLoadingCover visible={bootCover} />

      <HighScoreEntryModal
        visible={highScore.visible}
        daily={highScore.daily}
        challenge={highScore.challenge}
        score={state.score}
        level={state.level}
        totalCoins={state.totalCoins}
        time={time}
        onSubmit={highScore.onSubmit}
        onSkip={highScore.onSkip}
      />
    </>
  );
};

export default GameOverlays;
