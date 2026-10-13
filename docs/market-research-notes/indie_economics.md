# Indie mobile game economics for a solo / micro-studio puzzle-roguelite (Wumpus Adventures)

Research limits: web search returned thin results for several requested items (Threes, Alto, Dungelot, Hoplite, Shattered Pixel Dungeon revenue, Apple Arcade/Play Pass pitching steps, current Indie Games Accelerator terms). Those are listed as Gaps rather than guessed. Many numbers are from vendor blogs or old surveys; each is flagged.

## 1. Distribution of outcomes: what share of games earn meaningful revenue?

### Takeaway
Every available dataset shows an extremely skewed distribution. Most indie games earn under about $1,000 lifetime on Steam, and mobile figures are murkier and older. The best mobile-specific "1 in 100 reaches $10k/month" number comes from a vendor blog with no named dataset, so treat it as a rough prior, not a statistic.

### Cited Findings
- Vendor claim (CAS.AI, a mobile publishing/mediation company, Apr 2026): of every 100 indie mobile games released, about 1 reaches $10k/month; about 1 in 300 reaches $30k/month; above $100k/month is roughly 1 in 1,000 or rarer. It says the data are "aggregated... Q4 2025" but names no dataset. — [CAS.AI](https://cas.ai/blog/the-mobile-game-publishing-reality-why-most-indies-fail-and-what-actually-works/)
- Same source: 80-90% of indie teams have under $3,000/month for marketing; organic discovery for well-optimized games is about 200-500 installs/day (unsourced claim); developers often spend $10-20k on campaigns and quit before results are clear. — [CAS.AI](https://cas.ai/blog/the-mobile-game-publishing-reality-why-most-indies-fail-and-what-actually-works/)
- Older mobile survey (Deloitte citing a 2016 survey of 8,000 developers, all apps, not only games): 17% earned no revenue, 18% under $100/month, half under $1,000/month. DATED (2016). — [Deloitte](https://www2.deloitte.com/pt/en/pages/technology-media-and-telecommunications/articles/tmt-pred16-media-mobile-games-leading-less-lucrative.html)
- Developer Economics (via GamesBeat, c. 2014): 57% of apps make under $500/month; top 2% take 54% of revenue. VERY DATED. — [GamesBeat](https://gamesbeat.com/10000-developer-survey-2-of-coders-split-staggering-54-of-all-app-revenue/)
- Sensor Tower figure relayed by a 2026 guide: publishers earning under $1M are 96.7% of App Store game publishers but about 2% of revenue. Secondary source, unverified. — [The Swift Kit blog](https://theswiftk.it.com/blog/how-much-do-indie-ios-developers-make)
- Steam analog: Gamalytic 2023 report says 67% of games have under $5,000 lifetime gross revenue; median about $700 excluding free titles; Zukowski/VG Insights 2019 paid-indie cohort median $1,136 lifetime. Gross, before Valve's cut. — [Game World Observer](https://gameworldobserver.com/2022/11/29/median-indie-game-earnings-steam-barely-over-1000)
- Steam 2025 releases: about 65.9% (8,388 games) earned under $1,000, per Gamalytic-linked data in a Yahoo Tech piece. Attribution is not fully explicit. — [Yahoo Tech](https://tech.yahoo.com/gaming/articles/over-5-000-games-released-152604830.html)
- Steam, 3-year window: 50% of 41k games earned $500 or less gross. — [WN Hub](https://wnhub.io/news/stores-and-publishing/item-42136)

### Inferences
- A defensible prior for any single new mobile game by a solo dev with no audience: more likely than not under $1,000 lifetime; roughly 1-in-100 odds of reaching a $10k/month run rate (low-confidence).
- Survivorship bias is severe: the public case studies below (Balatro, Mini Metro, Frantic Architect spike) are the tail. The posts that report poor outcomes (Asterogue) are rare precisely because most projects fail quietly.

### Gaps
- No current, independent (Sensor Tower/AppMagic) percentile table for premium or hybrid indie mobile games was found. The AppMagic/Sensor Tower blogs were not retrievable via search.
- No GDC State of the Industry figure on solo-dev income was retrieved.

## 2. Documented case studies

### Takeaway
Outcomes cluster in three bands: near zero (hundreds of dollars), "modest" ($4k-$10k net, roughly one to three months of a living wage), and rare breakouts that depended on a platform feature or a publisher and a PC/console audience. Almost every success cites Apple featuring or a pre-existing audience, not paid UA.

### Cited Findings
1. **Aurorabound (solo, iOS-first puzzle, 2017, DATED).** About 15,500 users in 3 months (about 13,000 iOS, 1,700 Google Play, half of Play from an AdWords test). Gross $6,434, net almost $4,000. Google Play made only $134. IAP hint packs ($0.99 for 25, $19.99 for 2020); 2.7% of iOS users paid; ARPPU $10.32; ARPU $0.28. Cost under $1,500 excluding the dev's time; built in about 6 months part time. Author says App Store featuring "probably accounts for the majority" of downloads; about two-thirds of players were non-English, mostly China. — [Game Developer](https://www.gamedeveloper.com/business/aurorabound-postmortem-and-sales-figures-a-modest-part-time-success)
2. **Frantic Architect (solo student dev, puzzle, c. 2018-19; written up Nov 2024).** About 350-413k downloads in about 2 months (figures inconsistent in the article), driven by a featuring window. Gross about $24k ($18.5K ads, $5.5K $1.99 ad-removal IAP); the dev kept $9,600 after a 60/40 publisher split in the publisher's favor. The publisher (BulkyPix) went bankrupt about a month after launch and the game was pulled. Dev left mobile indie for contracting. Note: the article's IAP math is internally inconsistent. — [Linux Code write-up](https://thelinuxcode.com/how-my-mobile-game-got-365k-app-store-downloads-in-2-weeks-and-why-i-quit-indie-game-dev/) (secondary republication; the primary was not located)
3. **Meganoid (2017 remake, solo dev with 13 years' experience; roguelike-platformer; iOS/Android/PC; DATED).** $6,200 in the first 3 weeks (iOS $3,580, PC $900, Android not stated). Prices $2.99-$4.99. Dev cost about $4,500 for 2 months plus marketing art; projected about $10,000 total. About 100 streamer emails produced 1 stream. Late iOS featuring helped. — [Game Developer](https://www.gamedeveloper.com/business/post-mortem-for-meganoid-2017)
4. **Asterogue (solo roguelike; Android + itch.io; low-revenue/failure example).** Total $221 (Android 30 copies = $89; itch 18 copies = $132). About 1.5 months part-time dev. About 1% store conversion. Promoted via Twitter (about 1,250 followers), a 90-person newsletter, r/roguelikedev, TIGSource, Discord and Hacker News. Author's advice: "do this without great expectations"; success stories are overrepresented. — [itch.io devlog](https://itch.io/devlog/201756/sales-numbers-for-asterogue.amp)
5. **Card Crusade (solo, paid mobile roguelike deckbuilder).** Netted $10,000+ lifetime, about $6,000 after development expenses and store cuts (as summarized by a search snippet; primary Indie Hackers page returned 403 and was not read). — [Indie Hackers via snippet](https://www.indiehackers.com/interview/how-we-created-a-profitable-game-just-to-prove-that-we-could-dbd661ee04) (unverified)
6. **Balatro (solo dev LocalThunk + publisher Playstack; roguelike deckbuilder; breakout).** Mobile launched 26 Sep 2024 at $9.99 premium; AppMagic estimated over $9.3M net revenue on mobile by early 2026 (one report $9.2M), 49% from the US. Over 5M copies across all platforms (Jan 2026, CEO statement). It reached $1M gross within 8 hours on PC. Mobile numbers are third-party estimates. Success came from a viral PC launch plus a publisher, not from cold mobile discovery. — [PocketGamer.biz](https://www.pocketgamer.biz/balatro-exceeds-5-million-in-sales-on-all-platforms); [Game World Observer](https://gameworldobserver.com/2024/02/28/balatro-profitable-1-hour-gross-revenue-over-1-million)
7. **Mini Metro (Dinosaur Polo Club, small NZ team; puzzle).** Over 1 million sales by mid-2017/2018 (co-owner later said 1.3-1.4M, all platforms); started on PC, then mobile. Raijin (third-party) estimates about $2.7M gross on Steam. — [PCGamesInsider](https://www.pcgamesinsider.biz/news/67489/mini-metro-has-actually-sold-close-to-14m-copies/); [Raijin](https://raijin.gg/app/287980/Mini_Metro)
8. **ENYO (free-to-play mobile, c. 2016, DATED).** 274k iOS + 29k Google Play downloads in month 1, over 250k of the iOS ones in the first 2 weeks, driven by Apple featuring, then a steep drop. (Only a search snippet; the page returned 403.) — [TouchArcade](https://toucharcade.com/2016/10/17/enyo-first-month-numbers-show-iap-vs-ads-revenue/)
9. **Rainswept (PC adventure, solo; Steam analog for a demo + wishlist strategy; 2019, DATED).** 1,249 units, $12,248 gross, about $6.4k net after 2 years of work. Free demo (about 12K downloads), 3,300 wishlists at launch growing to 10,100; wishlist conversion 4.9%. Net was about 55% of gross. — [Game Developer](https://www.gamedeveloper.com/business/3-months-ago-i-released-my-first-game-was-it-worth-quitting-my-job-to-go-indie-detailed-earnings-report-)
10. **Streets of Rogue (PC, roguelike):** reportedly about 1M copies and about $8M, but returns took years (anecdotal, via search snippet). — [Indie Hackers/ Game Developer snippet](https://www.indiehackers.com/post/how-matt-earned-millions-with-his-roguelite-game-a75f30e160)
- Also noted: Shattered Pixel Dungeon is a free, no-ads, donation-supported solo roguelike; no revenue figure found. — [Flathub listing](https://flathub.org/fa/apps/com.shatteredpixel.shatteredpixeldungeon)

### Inferences
- Pattern in successes: (a) an Apple featuring or publisher spike, (b) an existing PC/community audience, (c) premium pricing with no UA dependence. Pattern in failures: no featuring, no audience, tiny conversion (about 1%).
- Typical "modest" mobile outcome is $4k-$10k net over the first year for 2-6 months of work, which is below a living wage in the US but meaningful in Ecuador (author of Rainswept noted low cost of living made it worthwhile).
- Google Play revenue was tiny relative to iOS in two cases (Aurorabound $134 of $6.4k; Meganoid unclear). Expect iOS to produce most paid revenue.

### Gaps
- No primary revenue data found for Threes, Alto's Adventure, Dungelot, Hoplite, Shattered Pixel Dungeon, Slay the Spire mobile, or Mini Metro's mobile-only split.
- Most solo mobile case studies found are 2017-2019; recent (2023-2026) solo mobile puzzle/roguelite income reports were not found, which is itself a sign that the format is under-documented.

## 3. Costs and break-even

### Takeaway
Fixed platform costs are tiny; the real cost is the developer's time. Paid UA is the dominant cost risk and, on available benchmark CPIs, is very unlikely to break even for a premium or low-ARPU puzzle game. Organic/featuring-led strategy is the only one that fits a small budget.

### Cited Findings
- Aurorabound all-in cost under $1,500 excluding time; Meganoid about $4,500 including a notional $2,000/month dev wage. — [Game Developer](https://www.gamedeveloper.com/business/aurorabound-postmortem-and-sales-figures-a-modest-part-time-success); [Game Developer](https://www.gamedeveloper.com/business/post-mortem-for-meganoid-2017)
- Store commission: Google takes 15% on the first $1M per year; Apple's Small Business Program is 15% for developers under $1M (opt-in, annual). Secondary sources (2021-era); verify on the official pages. — [Appbot](https://appbot.co/blog/app-developers-apple-google-small-business-programs/); [RevenueCat](https://revenuecat.com/blog/engineering/small-business-program)
- Steam Direct fee $100 (recoupable) — [Game Developer (Rainswept)](https://www.gamedeveloper.com/business/3-months-ago-i-released-my-first-game-was-it-worth-quitting-my-job-to-go-indie-detailed-earnings-report-)
- Apple Developer $99/yr and Google Play $25 one-time are from my background knowledge; not re-verified in this session (no source fetched).
- CPI benchmarks (vendor blogs, mixed years): 2024 North America casual/puzzle about $3.00 iOS, $2.00 Android; all-genre North America $3.59 vs Latin America $0.55; Adjust 2026 report says global CPI rose to $0.56 (+30% YoY). Sources conflict on absolute Android puzzle CPI ($0.14 to $2.00). — [Megadigital](https://megadigital.ai/en/blog/cpi-mobile-game-guide/); [Segwise](https://segwise.ai/blog/cpi-ipm-roas-benchmarks-optimizing-ad-spend/); [Adjust 2026 via GameDevReports](https://gamedevreports.substack.com/p/adjust-gaming-app-insights-report)
- CAS.AI: a statistically valid A/B test needs 3,000-6,000 users per variant, over $2,000 for 6,000 users; indie CPI 10-20% worse than publishers'. Example of a CPI $1.20 / ARPDAU $0.15 setup where profitability is unknown for months. — [CAS.AI](https://cas.ai/blog/the-mobile-game-publishing-reality-why-most-indies-fail-and-what-actually-works/)
- Aurorabound's Google AdWords test delivered roughly 850 installs (about half of 1,700) with the cost not stated. — [Game Developer](https://www.gamedeveloper.com/business/aurorabound-postmortem-and-sales-figures-a-modest-part-time-success)

### Inferences (my arithmetic, labeled as such)
- Fixed launch costs: about $124 (Apple $99 + Google $25) plus optionally $100 Steam, plus art/audio/localization/tooling. A realistic cash budget of $500-$3,000 excluding time is consistent with the case studies.
- UA break-even: with a $2.00 CPI (US-ish Android puzzle), break-even needs LTV over $2.00 per install. Aurorabound's ARPU was $0.28 (hint IAP model), roughly 7x short. Meganoid-style premium at $2.99 net of 15% fee is about $2.54 per purchase, but only a small percent of installs convert, so premium can't support paid UA at that CPI. With LatAm CPI around $0.55 and ARPU around $0.28, it is still unprofitable.
- Therefore: organic-only strategy needs no break-even on UA; paid UA is only reasonable as a small test (for example under $300-500) to measure retention/conversion, not as a growth engine.

### Gaps
- No verified Firebase cost-at-scale figure was retrieved (for a mostly offline puzzle game, backend costs are likely negligible, but I have no cited number).
- No cited cost for localization, art/audio licensing, or press-kit tools.

## 4. Distribution strategies for tiny budgets

### Takeaway
Evidence favors (1) store featuring, (2) a demo and community built before launch, and (3) a PC/second platform for a premium roguelite. Cold press/streamer emails performed weakly in every documented case. Subscription catalogs are shrinking or hard to enter.

### Cited Findings
- Apple featuring cited as the main driver in Aurorabound, ENYO, Frantic Architect, and Meganoid ("Games we play"). — sources in section 2.
- Cold streamer outreach: Meganoid sent about 100 emails and got 1 stream; Rainswept sent keys to about 1,000 sites with weaker-than-expected coverage. — [Game Developer](https://www.gamedeveloper.com/business/post-mortem-for-meganoid-2017); [Game Developer](https://www.gamedeveloper.com/business/3-months-ago-i-released-my-first-game-was-it-worth-quitting-my-job-to-go-indie-detailed-earnings-report-)
- Free demo plus mailing list plus tag optimization on Steam helped Rainswept: discovery queue and "More like this" were the biggest traffic sources; wishlists tripled post-launch. — same Rainswept link.
- Asterogue's community posting (Reddit, Discord, HN) produced about 1,937 page views and 48 sales total. — [itch.io](https://itch.io/devlog/201756/sales-numbers-for-asterogue.amp)
- Localization: about two-thirds of Aurorabound's players were non-English, mainly Chinese. — Aurorabound link.
- Netflix Games: removed 21 indie titles in June 2025, shifted to Netflix-IP, party, and kids games; closed studios through Aug 2026. Not a realistic channel for a solo dev now. — [9to5Mac](https://9to5mac.com/2025/06/24/netflix-is-pulling-the-plug-on-21-indie-games/)
- Apple Arcade: reports (anonymous, unverified) of tighter greenlighting favoring established IP and reduced developer payouts. — [Shacknews](https://www.shacknews.com/article/138949/apple-arcade-uncertainty-mobile-games)
- Google Play Pass is engagement-based pay (2019 reports); 2026 price comparison: Apple Arcade $6.99/mo, Play Pass $4.99/mo. — [Tech Insider](https://tech-insider.org/apple-arcade-vs-google-play-pass-vs-netflix-games-2026/)
- Google Play Indie Games Accelerator: past cycles (2021-2022) required a registered Play developer aged 18+, covered several regions including Latin America in 2022, and offered mentorship/events. No 2026 terms found. The 2026 Indie Games Fund Africa is a different program. — [Opportunity Desk/ Google](https://developersonair.withgoogle.com/events/indie-games-accelerator); [AMX Africa](https://amxafrica.com/blog/listing/indie-games-fund-africa-2026-for-independent-game-developers-1-million-cash-prize/)
- Tooling note: Balatro's mobile success depended on a publisher after a PC viral launch. — Balatro links above.

### Inferences
- For Wumpus Adventures, a pitch to Apple's editorial team (via the App Store featuring nomination form, which I know exists but did not verify here) matters more than any paid channel. Local-language and polished-first-impression assets raise odds but nothing guarantees it.
- A web/itch.io demo is cheap and mirrors the one tactic with documented traction (Rainswept demo). Reusing the React Native logic for web is plausible; a native Steam port from React Native is not straightforward (my engineering judgment, not sourced).
- Subscription catalogs should be treated as upside lottery tickets, not a plan.

### Gaps
- No verified pitch process for Apple Arcade, Google Play Pass, or Netflix; no current Accelerator rules; no cited data on TikTok/Shorts devlog conversion to installs; no Product Hunt/IndieDB evidence found.

## 5. Time to revenue and a 12-month scenario

### Takeaway
Revenue arrives at launch (premium) or accrues slowly (ads/IAP); case studies show 70%+ of year-one revenue in the first 1-3 months, then a long tail. No documented solo case reached "sustainable income" from one new puzzle game in 12 months without a spike event.

### Cited Findings
- Rainswept: February 711 units, March 161 (about 22%), April 94 (58% of March). — Rainswept link.
- Meganoid: $6,200 in 3 weeks vs a $10,000 projection to March 2018. — Meganoid link.
- Frantic Architect: peak day 3 (58,486 downloads), 14,921 by day 7. — Linux Code link.
- ENYO: over 250k of 274k iOS downloads in 2 weeks, then a steep fall. — TouchArcade link.
- Streets of Rogue reportedly took years to pay off. — Indie Hackers snippet link.
- Aurorabound: about 6 months to build at 1-2 hours/day. — Aurorabound link.

### Inferences (scenarios are my construction from the cited cases, not a forecast with sourced probabilities)
- Pessimistic (about 50-60% likely given the distribution): 100-1,500 installs, $0-$500 net in 12 months (Asterogue-like). Costs about $150-$1,000.
- Base (about 30-35%): modest premium/IAP result in the Aurorabound/Meganoid range: 5k-15k installs or 500-1,500 premium sales, about $2k-$8k net, front-loaded in the first 1-3 months, probably iOS-heavy.
- Optimistic (about 5-10%): Apple featuring or a creator/viral hit: 100k+ downloads or $20k-$50k+ net (Frantic Architect gross about $24k but a 60/40 split kept $9.6k). Reaching Balatro-scale is a far-tail event (well below 1%).
- Time to first revenue: day 1 of launch if store review goes through; time to sustainable income (for example $1-2k/month net, adequate in Ecuador): likely beyond 12 months and probably needs several games, a second platform, or a publisher.

### Gaps
- Probabilities above are judgment calls, not measured. No sourced distribution of 12-month outcomes for solo premium puzzle-roguelites exists in what I found.
