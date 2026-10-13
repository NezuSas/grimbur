# Monetization of mobile puzzle / roguelite / casual-midcore games (for Wumpus Adventures)

Research date: 2026-10-12. About 14 tool calls. Search was snippet-level and many fetched pages were thin. Anything not in a "Cited Findings" list is an estimate and is labelled as such. Several figures come from ad-tech vendors who benefit from the claim (flagged inline).

## 1. Which monetization models are used in this genre, which dominate, and which perform best?

### Takeaway
Free-to-play with rewarded video as the core ad format, plus a one-time "remove ads" IAP and optional cosmetic/consumable IAPs, is the standard hybrid for puzzle/casual games. Premium paid upfront works for roguelikes only with strong brand or press and gives a spike-shaped revenue curve (Balatro mobile). I did not find sourced evidence on subscriptions or battle passes in solo-dev puzzle roguelites.

### Cited Findings
- Puzzle and arcade titles make up over 90% of hybrid-casual earnings, and block-puzzle leads puzzle with 71% of revenue (AppMagic, Q1 2025). — [AppMagic via Game Industry Library](https://gameindustrylibrary.com/documents/hybdrid-casual-games-in-q1-2025)
- Appodeal's 2025 casual benchmarks report lifetime ARPU of $11.08–$14.83 for top hybrid subgenres (Merge 3 among them), and $0.79 for pure hypercasual and simulation. A separate summary cites $2.99 for match games. These are ARPU, not ARPDAU, and the subgenre mapping is unclear. — [App Developer Magazine](https://appdevelopermagazine.com/mobile-casual-benchmarks-report-2025/amp/); [Juego Studio](https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre)
- Balatro mobile (premium roguelike deckbuilder, $9.99 upfront, no ads, no IAP, launched 2024-09-26): about $937.5k across both stores after 7 days, $162k on launch day, peak near $200k/day on day 4, then about $71k/day through the rest of October; roughly $4.2M net / about $4.4M gross by about two months. Revenue spiked and then fell. Balatro was already a hit on PC, so this is not a typical result. — [PocketGamer.biz](https://www.pocketgamer.biz/balatro-approaches-1-million-in-seven-days-on-mobile); [MobileGamer.biz](https://mobilegamer.biz/balatro-mobile-hits-500k-in-five-days-tops-paid-game-charts/); [PocketGamer.biz](https://www.pocketgamer.biz/balatro-nears-44m-on-mobile-amid-a-sudden-spending-surge)
- Developer opinion (older, undated pieces): free apps get far more downloads than paid ones when featured, which more than offsets the tiny per-user ad revenue; one developer said that trying premium "was almost the end of us". Tundra Games moved Rapture to free with ads and rewarded video after 7 months of weak premium sales (2010s example). — [PocketGamer.biz](https://www.pocketgamer.biz/indie-mavens-are-paid-apps-dead/); [Game Developer](https://www.gamedeveloper.com/business/going-free---post-mortem)
- Vampire Survivors (roguelite) self-published its mobile version to control monetisation. No figures found. — [PocketGamer.biz](https://Www.pocketgamer.biz/news/80554/vampire-survivors-developer-takes-new-approach-to-monetisation/)
- Rewarded players are reported to be about 4x more likely to make IAPs (AppSamurai, a vendor; this is correlation, not an experiment). — [AppSamurai](https://appsamurai.com/blog/rewarded-ads-in-mobile-games-strategy-data-and-best-practices/)

### Inferences
- With no marketing budget and a solo dev, a free game with rewarded video and optional IAP maximises the install base. A premium price removes most organic discovery.
- Wumpus fits a "hybrid-casual" shape: rewarded ads (revive, extra arrows, shield) plus an IAP bundle. Characters/skins and a remove-ads purchase fit the existing selectable-characters feature.

### Gaps
- No verified per-game model table (for example, Dicey Dungeons, Slay the Spire mobile, Monster Train, Soul Knight, Archero), and no Slay the Spire mobile sales data. The searches returned nothing usable.
- No sourced data on battle pass or subscription performance in single-player puzzle roguelites. RevenueCat's gaming-specific report was not reachable.
- No Apple Arcade or Play Pass payout data found.

## 2. Benchmarks: eCPM, ad ARPDAU, impressions per DAU, IAP conversion, ARPPU, LTV

### Takeaway
Rewarded video eCPM is roughly $13–30 in the US but only about $2–3 in Latin America on Android, and Tier-1 eCPMs differ 2x depending on the source. Realistic ad-only ARPDAU for a casual game is cents or fractions of a cent. IAP payer conversion is about 1% or less in casual games and most sources are old or from vendors.

### Cited Findings
- Tenjin x CAS, Q2 2024, games excluding kids. Rewarded: iOS US $24.39, South Korea $20.94, Australia $19.91; Android US $30.25, Canada $23.13, South Korea $22.01. Interstitial: iOS US $23.17; Android US $16.15, Canada $12.65. Banner: iOS US $0.99; Android Canada $2.00, US $1.18. — [Playio summary](https://blog.playio.co/mobile-game-ecpm-benchmarks-2026)
- Appodeal, Oct–Dec 2024 (values read off charts, so approximate), rewarded iOS / Android: North America ~$13.6 / ~$9.0; Europe ~$8.9 / ~$5.1; APAC ~$7.5 / ~$8.2; Middle East ~$8.4 / ~$2.4; **Latin America ~$3.4 / ~$1.8**. Interstitial iOS / Android: North America ~$10.4 / ~$9.6; Europe ~$5.3 / ~$3.6; **LATAM ~$2.2 / ~$1.3**. US rewarded iOS ~$17.3, Android ~$13.2. Global average rewarded about $3 Android, about $4 iOS. North America banner ~$0.4–0.5. — [Playio summary of Appodeal](https://blog.playio.co/mobile-game-ecpm-benchmarks-2026)
- Appodeal's separate summary: US rewarded Q4 2024 $19.63 iOS / $16.49 Android. iOS is generally higher, but Android performs well in APAC and LATAM. — [Appodeal Q4 2024 report](https://appodeal.com/wp-content/uploads/2025/03/Quarterly_Mobile_eCPM_Report_-_Q4_2024.pdf). I only saw this through a search summary, not the PDF itself.
- Playwire ranges (September 2025, method undisclosed, vendor): rewarded Tier 1 $15–30, global $8–18; interstitial Tier 1 $5–8, global $2.5–5; banner Tier 1 $0.5–1.5, global $0.2–0.8. — [Playio](https://blog.playio.co/mobile-game-ecpm-benchmarks-2026)
- The same US rewarded placement ranges from about $13 to $30 depending on the source. eCPMs also swing seasonally (a practitioner reports US iOS rewarded falling from about $18 in December to $11–12.50 in mid-January). — [Playio](https://blog.playio.co/mobile-game-ecpm-benchmarks-2026)
- Formula and example: impressions per DAU x eCPM / 1000. Example: 3 rewarded views/day at $12 gives $0.036. — [Playio](https://blog.playio.co/mobile-game-ecpm-benchmarks-2026)
- ARPDAU: casual/puzzle $0.03–$0.10, mid-core $0.08–$0.20 (blog roll-up of 2024–25 research, not attributed per figure, from June 2026). An older SuperData range for puzzle is $0.01–$0.05 (2012, old). — [Juego Studio](https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre); [Gamesbrief via search summary](https://www.gamesbrief.com/2012/09/arpdau/)
- Impressions per DAU: only a vendor target of at least 1.3 total with a stretch of 4, and an illustrative 1.5 rewarded/DAU. These are not measured industry benchmarks. — [Applixir](https://www.applixir.com/?p=4393)
- Payer conversion: less than 5% of mobile gamers ever buy (AppsFlyer 2024); under 1% is flagged as weak and 0.5–1% as acceptable for casual (no direct source); about 1.5% for RPG/strategy (Segwise, 2024); midcore genre benchmark about 3% in the first 14 days (Bruin, unverified vendor claim). — [Juego Studio](https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre); [Bruin](https://getbruin.com/use-cases/mobile-gaming/midcore-payer-conversion-rate-vs-genre-benchmark/)
- Concentration of spend (Moloco, 2025): the top 5% of payers generate 48% of IAP revenue and the top 10% generate 64%. — [Juego Studio](https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre)
- Retention: GameAnalytics 2025 median D1 about 22% and median D7 below 4% across all mobile games; board/card/puzzle have the highest retention. A Mistplay-sourced compilation gives puzzle D1 31.85%, D7 12.18%, D30 5.35%, which is directional because the methods differ. — [GameAnalytics 2025 benchmarks](https://investgame.net/wp-content/uploads/2025/02/2025-GameAnalytics-Mobile-Gaming-Benchmarks.pdf); [Mistplay](https://www.mistplay.com/resources/mobile-game-retention-benchmarks)
- Q2 2026 Android was 55% of game ad revenue and iOS 45% (Tenjin, via secondary source). — [Playio](https://blog.playio.co/mobile-game-ecpm-benchmarks-2026)
- Latin America paying share was about 0.5% (Brazil 0.57%, 2021 App Annie data, old); Android is about 89% of LatAm downloads yet iOS takes 56% of spend. — [WN Hub](https://wnhub.io/news/analytics/item-19112); [AppFollow](https://appfollow.io/blog/how-to-win-brazil-and-mexicos-mobile-gaming-market)

### Inferences
- The LATAM-to-US rewarded eCPM ratio is about 1.8/13.2 = 0.14 on Android and 3.4/17.3 = 0.20 on iOS. An Ecuadorian user is therefore worth roughly one seventh to one fifth of a US user for ads. Audience geography matters more than any other variable.
- Real-world blended global eCPMs for a small unoptimised app are likely far below Tier-1 headline numbers. Appodeal's global averages are about $3–4 rewarded.

### Gaps
- No Ecuador-specific eCPM. No iOS/Android breakdown for Brazil or Mexico (the Appodeal interactive tool was not accessible).
- No audited puzzle-specific ARPPU or IAP conversion. No measured rewarded impressions per DAU for puzzle titles.
- No LTV figures sourced beyond Appodeal ARPU. Reddit and indie revenue threads with real numbers were not located.

## 3. What players accept vs reject; premium vs free-with-ads

### Takeaway
Opt-in rewarded ads are the best-tolerated format; forced interstitials are the main churn risk. Evidence is mostly vendor surveys, some dating from 2018.

### Cited Findings
- Tapjoy studies cited by Unity: gamers prefer rewarded ads over interstitials about 4 to 1. An eMarketer write-up of a Tapjoy survey says 76% of US mobile gamers prefer opt-in rewarded ads over mandatory ones. — [Unity](https://unity.com/blog/understanding-the-impact-of-rewarded-ads-on-iap-retention-and-engagement); [eMarketer](https://www.emarketer.com/content/us-consumers-appreciate-in-game-ads)
- Casual gamers are said to be 30–50% more likely to churn after a negative ad experience (Playio, vendor blog, no study cited). — [Playio](https://blog.playio.co/impact-of-ads-on-mobile-gamers)
- A 2018 Facebook survey found rewarded video made players more likely to buy IAPs. — [PocketGamer.biz](https://www.pocketgamer.biz/facebook-mobile-gaming-ad-survey-2018/)
- Premium: Balatro mobile earned about $4.2M net in two months, but only for a game already famous. See section 1 for the model and figures.

### Inferences
- Unsourced, from general industry knowledge: forced ads mid-run, energy timers and pay-to-win items that affect the global leaderboard are the standard 1-star triggers. I did not find a measured review study. In particular, selling power-ups that influence leaderboard scores would damage the competitive integrity of the Firebase leaderboard. Cosmetic characters and coins for revives avoid that.
- Place ads only at natural breaks between runs (3–10 minute sessions suit this) and keep rewarded ads opt-in.

### Gaps
- No data on what share of players buy "remove ads". No review-text analysis of 1-star triggers. No data comparing premium and F2P outcomes for indie roguelikes in 2024–26.

## 4. Ad networks, mediation, IAP tooling, and Expo integration

### Takeaway
Start with AdMob via react-native-google-mobile-ads (needs an Expo development build, not Expo Go) and add mediation later; use RevenueCat for IAP. Fee schedules and minimums were mostly not verified.

### Cited Findings
- AppLovin: $100 minimum threshold; paid monthly, about the 15th of the following month (NET 15); smaller amounts carry over. — [AppLovin docs](https://support.applovin.com/en/max/max-dashboard/account/payments)
- AdMob: payments go out on or around the 21st of each month once the balance clears the threshold; balances below it roll over. The page snippets did not state the threshold amount. The $100 figure appears only in AdSense documentation, so verify it in your AdMob payment settings. — [AdMob help](https://support.google.com/admob/answer/2772140)
- react-native-google-mobile-ads has shipped an Expo config plugin since v14.0.0. Install with `npx expo install react-native-google-mobile-ads`; this needs `expo prebuild` or an EAS development build. Static frameworks can be set via expo-build-properties. In Play Console, declare "Yes, my app contains ads". Issues #820 and #835 report plugin errors on v16.0.3 with Expo SDK 54 / RN 0.81.5 (no confirmed fix seen); this repo is on SDK 57, so pin and test the version. — [package docs v15](https://app.unpkg.com/react-native-google-mobile-ads@15.0.0/files/docs/index.mdx); [issue 835](https://github.com/invertase/react-native-google-mobile-ads/issues/835)
- RevenueCat: secondary sources say free up to $2,500 monthly tracked revenue (MTR) and 1% of MTR above that. RevenueCat's own plans page showed $1,000, so the sources conflict; verify before relying on either. MTR is gross, before store fees. — [RevenueCat plans](https://www.revenuecat.com/plans/); [Toolradar](https://toolradar.com/tools/revenuecat/pricing)
- Store fees: Google's 15% tier applies to the first $1M of revenue per year; Apple's Small Business Program gives 15% to developers under $1M in prior-year proceeds, and it is opt-in. These came from 2021–25 sources and were not checked against current official pages. — [RevenueCat blog](https://revenuecat.com/blog/engineering/small-business-program); [Appbot](https://appbot.co/blog/app-developers-apple-google-small-business-programs/)
- MAX is described as a first-price auction across 25+ networks. One forum anecdote says MAX bidding earned about 2x AdMob's eCPM; a vendor-adjacent guide says MAX suits publishers with 100K+ DAU. — [Airframe](https://www.airframe.ai/product/applovin-com-max/compare); [Segwise](https://segwise.ai/blog/applovin-publisher-monetization-guide)

### Inferences
- The mediation recommendation is unsourced: at under 1,000 DAU, mediation gains are small, so ship AdMob first and revisit when DAU grows.
- Payment thresholds mean a very small app can wait months for a first payout. At the conservative case below (about $3/day per 1,000 DAU), a $100 threshold takes about 33 days at 1,000 DAU.
- react-native-iap is an alternative to RevenueCat. I did not research it.

### Gaps
- Not found: revenue-share percentages and minimum-traffic requirements for AdMob mediation, MAX, Unity LevelPlay (formerly ironSource) and Meta Audience Network; LevelPlay payment terms; payment options for Ecuador (wire, bank). Check each official page.

## 5. Revenue estimates per 1,000 DAU and per 10,000 downloads

### Takeaway
Estimated ad revenue is about $3/day (conservative) to $34/day (optimistic) per 1,000 DAU. A free ad-supported game with 10,000 downloads yields only a few hundred to a few thousand dollars total. These are my estimates built on the sourced inputs above, not measured results.

### Cited Findings
- None. This section is derived from the sourced inputs in section 2. See Inferences for the assumptions.

### Inferences
Assumptions, all estimates. Impressions per DAU are my guesses (the only sourced anchor is the vendor target of at least 1.3 total). eCPMs are blended global values below the Tier-1 headlines, informed by Appodeal's overall averages of about $3–4 rewarded.

| Case | Rewarded imp/DAU x eCPM | Interstitial imp/DAU x eCPM | Banner | Ad revenue per 1,000 DAU per day |
|---|---|---|---|---|
| Conservative (mostly LATAM, weak fill) | 0.5 x $3 | 1 x $1.5 | none | (1.5 + 1.5) = **$3** (ARPDAU $0.003) |
| Base (mixed global) | 1.0 x $5 | 2 x $3 | 5 imp x $0.4 = $2 | (5 + 6 + 2) = **$13** (ARPDAU $0.013) |
| Optimistic (Tier-1 heavy) | 2 x $8 | 3 x $6 | none | (16 + 18) = **$34** (ARPDAU $0.034) |

Per-1,000-DAU monthly (x30): $90 / $390 / $1,020 before network share. The optimistic ARPDAU sits at the low end of the vendor casual range ($0.03–$0.10). Reaching the upper end likely needs real IAP and Tier-1 traffic.

IAP add-on (estimate): a $2.99 remove-ads item nets about $2.1 after the assumed 15% store fee, VAT and similar deductions (2.99 x 0.70). Assumed buyer rates of 0.5% / 1.5% / 3% of installs (anchored on the sourced 0.5%–1% weak-to-acceptable casual range and the roughly 3% midcore claim) give per 10,000 installs: 50 / 150 / 300 buyers, or **$105 / $315 / $630**.

Per 10,000 downloads, lifetime ad revenue per install = ad ARPDAU x assumed active days per install (3 / 5 / 8, a guess informed by puzzle D1 around 32%, D7 around 12% and D30 around 5%, with the median across all games far lower):

| Case | Ad per install | Ads per 10k installs | IAP per 10k | Total per 10k downloads |
|---|---|---|---|---|
| Conservative | 0.003 x 3 = $0.009 | $90 | $105 | about **$195** |
| Base | 0.013 x 5 = $0.065 | $650 | $315 | about **$965** |
| Optimistic | 0.034 x 8 = $0.272 | $2,720 | $630 | about **$3,350** |

Implications:
- To make $1,000/month from ads alone, the base case needs about 77,000 DAU-days... precisely: $1,000 / $0.013 = about 77,000 DAU-days per month, or about 2,560 DAU. The conservative case needs about 11,000 DAU; the optimistic case about 980 DAU.
- A player base concentrated in Ecuador and LATAM sits near the conservative case. Marketing to US/Canada/Western Europe Android and iOS users is the biggest lever, but paid user acquisition there would likely cost more than the revenue it returns (not researched).
- A premium alternative: at $2.99 with about 70% net, each sale returns about $2.1. Reaching the base-case $965 per 10k installs would need about 460 sales, while discoverability for a paid unknown game is low (unsourced).

### Gaps
- I could not validate impressions-per-DAU or active-days-per-install against measured puzzle-roguelite data. Treat the table as a template: replace the assumptions with AdMob reporting from a soft launch.
