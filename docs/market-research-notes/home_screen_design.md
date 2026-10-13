# Home / title screen design for a landscape mobile roguelite puzzle game (2026-10-13)

Evidence depth: about 11 searches and 1 fetch. Search results were dominated by generic blogs. I did NOT find any teardown of the home screens of Royal Match, Brawl Stars, Clash, Balatro, Dead Cells, Vampire Survivors, Hoplite, Dungelot, Pixel Dungeon, Monument Valley or Wordle, and no A/B data on home-screen layouts. Per-game descriptions in the Inferences section come from general knowledge and were NOT verified in this session.

## 1. Findings (sourced)

### First screen and FTUE
- GameAnalytics: "Users should do something fun as soon as they open your mobile game"; do not lead with a paywall, an ad or forced account creation. Players should grasp the value within about 2-3 minutes. Track every tutorial step as a funnel and fix the biggest drop-offs. It gives no tap-count or seconds target and says nothing on menu layout. https://gameanalytics.com/blog/tips-for-a-great-first-time-user-experience-ftue-in-f2p-games
- Adinmo (vendor blog): anything the player must do before playing (extra downloads, pop-ups, early rating prompts) irritates and can cause uninstall. https://adinmo.com/first-time-user-experience-why-it-matters-and-how-to-get-it-right
- Playio (vendor blog, from the earlier notes): reach core play in about 1 minute; more than 90 s to the fun moment loses session two. Opinion, no data. https://blog.playio.co/mobile-game-onboarding-retention
- No GDC, Unity, Adjust, AppsFlyer or Deconstructor of Fun source on taps-to-play or menu depth turned up.

### Layout and visual hierarchy
- Roblox UI docs: build visual hierarchy by importance, put the key action where the thumb is, show UI contextually to avoid clutter. https://create.roblox.com/docs/tutorials/user-interface-design/wireframe-your-layouts
- UX Planet game UX guide (opinion): place store/monetization buttons in the right-thumb zone, colour-code buttons by function (positive/negative/neutral), and note that the same tricks can become "dark UX". https://uxplanet.org/game-design-ux-best-practices-guide-4a3078c32099
- Apple HIG Layout: respect safe areas (Dynamic Island, camera housing); put principal items in the upper half near the leading side; scale artwork rather than changing its aspect ratio so key content stays visible. https://developer.apple.com/design/human-interface-guidelines/layout (reached via a mirror result: https://developer-rno.apple.com/design/human-interface-guidelines/foundations/layout)
- Slay the Spire mobile: main menu shows Continue plus Abandon Run when a run is saved, otherwise a new-run option. The source is a Steam forum bug report, so it is only anecdotal. Its changelog mentions widening the menu buttons for localized text. https://steamcommunity.com/app/646570/discussions/0/516333317611638857 ; https://apptopia.com/ios/app/1491530147/about

### Retention hooks
- A 2025 arXiv paper on Korean mobile games: daily login rewards are used by about 95% of the games studied and are described as leveraging loss aversion. Descriptive; it measures no retention lift. https://arxiv.org/pdf/2504.10714
- A game director talk (Gigazine) criticises streak resets as forcing daily login. Opinion. https://gigazine.net/gsc_news/en/20260101-dark-patterns
- Badge / red-dot claims (7x retention, more clicks) come from vendor glossaries with no primary source. Treat as unverified. https://appmaster.io/glossary/notification-badge ; https://gravitec.net/blog/what-are-badges-in-notifications/
- Streak and daily mechanics, earlier notes: Wordle once-per-day model and Duolingo streak stats are vendor or press claims. See retention_engagement.md.
- A Media Psychology study reported through nerdbot (not verified at the source) says stacking reward mechanics compounds harmful-use risk in vulnerable adolescents. https://nerdbot.com/2026/08/18/the-psychology-behind-daily-rewards-in-video-games/

### Ethics and store policy
- Apple (since Dec 2017) and Google Play require odds disclosure before purchase for randomized paid items. https://fenwick.com/insights/publications/apple-now-requires-disclosure-of-loot-box-odds ; https://www.fenwick.com/insights/publications/google-play-now-requires-disclosure-of-loot-box-odds . These sources are from 2017-2020, so current wording was not rechecked.
- FTC staff report "Bringing Dark Patterns to Light" (Sept 2022) lists fake countdown timers and false urgency or scarcity as dark patterns; confirmshaming is listed under interface interference. Law-firm summaries only; the report itself was not read. https://www.venable.com/insights/blogs/2022/09/the-ftc-brings-more-light-to-dark-patterns-in-new
- Our ember currency is earned in play, with no real-money loot boxes, so the loot-box rules likely do not apply. Not verified against policy text.

## 2. Inferences (mine, not evidenced above)

- Recalled, unverified: Clash Royale, Brawl Stars, Royal Match and Candy Crush use one very large primary action (Battle / Play / Level N) at the bottom or centre, with a top currency strip, a bottom tab bar with badges, and a side column of event or daily buttons. Hero or mascot art fills the middle. Premium roguelites (Slay the Spire, Balatro, Dead Cells) use a plain list of text buttons with Continue first when a run exists, and little else. Wordle and Monument Valley use almost nothing. Most of these reach gameplay in 1-2 taps.
- The tap target for us: 1 tap from launch to playing when a run is in progress (CONTINUE), and 2 taps for a new run (PLAY then difficulty or hero), with no pre-game popups.
- Order of visual weight to follow: (1) one dominant PLAY / CONTINUE button; (2) mascot and logo; (3) secondary mode buttons (Daily, Endless), clearly smaller; (4) ember chip and streak chip, small; (5) Forge, Achievements, Leaderboard, Settings as icon buttons with badges.
- Landscape layout: logo and mascot on the left half, menu column on the right, which suits right-thumb reach and keeps content away from the notch if the safe-area insets are applied. A centered layout works too and is what the current cover is moving toward; either is fine if the Play button sits in the thumb zone.
- Badges: a red dot on Forge only when an upgrade is affordable and on Achievements only when one is claimable is functional information (something to act on), not manipulation. Keep it to those two or three places and clear it once seen, to avoid dot fatigue.
- Streak: show the streak as a chip. Soften the loss, for example one free "streak freeze" or a never-reset best-streak record, rather than punishing a missed day. No countdown timers on offers, no fake scarcity, no confirmshaming copy.
- Living background (floating embers, torch flicker, breathing mascot) costs little and fits the theme; keep particle count low and respect a reduced-motion setting. No evidence found that it raises retention; it is for polish and perceived quality.
- Drop: any boxed panel that competes with Play, version text, long news or promo banners, a visible full achievements list (104) on the cover, equal-sized mode buttons, rating or sign-in prompts before the first run.

### Prioritised plan (solo, one month)
1. Week 1: single PLAY / CONTINUE button with a run-state check; safe-area insets on all edges; instrument taps and time from launch to first move.
2. Week 1-2: ember balance chip, streak chip, Daily and Endless as secondary buttons.
3. Week 2-3: badges on Forge (affordable) and Achievements (claimable); a one-line "next goal" under the Forge button (for example "120 embers to Torch Bearer").
4. Week 3-4: ambient embers, torch glow, mascot idle breathing, logo shimmer; low-end phone performance check; optional looping music with a mute control.
5. Last: last-run or best-score line under Play (small).

## 3. Gaps

- No teardown of any named game's home screen was found; the per-game descriptions above are recall only.
- No quantified data on taps to play, menu depth versus drop-off, or time-to-first-play benchmarks from GDC, Game Developer, Unity, Google, Apple, Adjust, AppsFlyer or Deconstructor of Fun.
- No A/B or causal evidence for streak chips, red-dot badges, "next goal" bars, animated or parallax backgrounds, idle mascots, music, or landscape left/right layout.
- Current (2026) Apple and Google policy text on random items and urgency was not read first-hand; the FTC report was seen only through law-firm summaries.
- Suggested next steps: capture screenshots or videos of the games listed and tabulate them by hand; read the Apple App Review Guidelines 3.1.1 and Google Play payments policy directly; search Game Developer / GDC Vault for "FTUE" and "lobby UX" talks; run our own funnel test.
