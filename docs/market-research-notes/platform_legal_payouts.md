# Platform, legal, compliance and payout requirements for publishing and monetizing a mobile game from Ecuador (as of Oct 2026)

Not legal or tax advice. Items marked UNVERIFIED were not confirmed from an official page in this research pass; the official URL to check is given. Research was limited (about 20 tool calls); many topics (Families policy, IARC, Data safety, ATT, LOPDP, COPPA, UMP, Firestore rules, assets licensing, alternative stores) were NOT researched and are listed under Gaps for follow-up.

## Google Play Console (registration, merchant, payouts, testing, API level, fees)

### Takeaway
Ecuador is marked as supported for BOTH developer registration and merchant registration in Google's country table (default developer currency USD). New personal accounts must run a closed test with at least 12 testers opted in for 14 continuous days before applying for production. From 31 Aug 2026 new apps/updates must target Android 16 (API 36).

### Cited Findings
- Ecuador is marked with a check for developer registration and a check for merchant registration; developer default currency is USD — [Google Play Console Help: supported locations](https://support.google.com/googleplay/android-developer/answer/9306917) (read via fetch tool summary; the page was truncated, so re-verify visually).
- New personal developer accounts: closed test with a minimum of 12 testers, opted in continuously for at least 14 days, then "Apply for production"; review usually takes seven days or less but can take longer — [Play Console Help: testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)
- From 31 Aug 2026 new apps and updates must target Android 16 (API 36) or higher; existing apps must target API 35+ to stay visible to new users on newer devices; extension to 1 Nov 2026 can be requested — [Android developers: target SDK requirements](https://developer.android.com/google/play/requirements/target-sdk) (summarised via search result; a community post claiming different dates conflicts and should be disregarded).
- Service fee: 15% on the first USD 1M of annual earnings from digital goods, 30% beyond; the 15% tier requires enrolment (payments profile, accept terms) — [Play Console Help: service fees](https://support.google.com/googleplay/android-developer/answer/10632485)
- One-time USD 25 registration fee — only a third-party source ([SplitMetrics](https://splitmetrics.com/blog/google-play-apple-app-store-fees/)); confirm at [Play Console signup](https://play.google.com/console/signup).
- A 2020 blog said Ecuadorian developers could register as merchants, payments in USD — secondary and dated; the Google table above is the better source.

### Inferences
- With Ecuador as a supported merchant country and USD as the currency, payouts to an Ecuadorian USD bank account are plausible (Ecuador is dollarized), but the exact payout method and any wire fees are not confirmed.
- The app must be built with targetSdk 36; check that Expo SDK 57 defaults meet this (the project should verify `expo-build-properties`/EAS output).

### Gaps
- Organization-account D-U-N-S requirement, identity verification steps, store listing requirements, Data safety form, IARC rating, Families policy: not verified. Check [Play Console Help: account types](https://support.google.com/googleplay/android-developer/answer/13634885) and [Families policy](https://support.google.com/googleplay/android-developer/answer/9893335).
- Payout method/fees/timing for Ecuador: confirm in Play Console payments profile and [Google Play payments help](https://support.google.com/googleplay/android-developer/answer/137997).

## Apple App Store

### Takeaway
The Apple Developer Program costs USD 99 per year (shown in local currency at enrolment); Ecuador's availability could not be confirmed from the fetched pages. Non-US developers file a W-8BEN/W-8BEN-E in App Store Connect after signing the Paid Apps Agreement.

### Cited Findings
- USD 99 per membership year; individual enrolment needs 2FA Apple Account, legal name, verified address, age of majority — [Apple: enroll](https://developer.apple.com/programs/enroll/)
- Country list not on that page; check during enrolment or [Apple: Membership details / supported regions](https://developer.apple.com/support/enrollment/).
- All developers must provide a US tax form; non-US developers go through a questionnaire leading to W-8BEN, W-8BEN-E or W-8ECI; Paid Apps Agreement must be signed first — [Apple: tax forms overview](https://developer.apple.com/help/app-store-connect/provide-tax-information/tax-forms-overview)
- One non-US sole proprietor reported being routed to W-9 with no W-8BEN path; resolved via Apple finance contact (single anecdote) — [Apple Developer Forums](https://developer.apple.com/forums/thread/843940)
- Small Business Program: 15% commission if prior-year proceeds are under USD 1M; must enrol — [TechCrunch 2020](https://techcrunch.com/2020/11/18/apple-to-reduce-app-store-fees-for-small-businesses-with-under-1-million-in-revenues) (confirm on [Apple](https://developer.apple.com/app-store/small-business-program/)).

### Inferences
- A free game with ads only does not need the Paid Apps Agreement for the app itself, but IAP does; ad revenue is paid by the ad network, not Apple.

### Gaps
- Ecuador bank payout support at Apple, App Review rules for ads/leaderboards/user names (guideline 1.2 UGC, 5.1 privacy), nutrition labels, ATT: not researched. See [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

## Ads: AdMob payouts, tax, consent, children

### Takeaway
AdMob pays monthly (threshold checked on the 20th, payment about the 21st); wire transfer is a standard method and EFT/check apply by country. A June 2026 report says PayPal Hyperwallet was extended to Ecuador, but Google's own AdMob page still says Hyperwallet is US-only, so that conflict is unresolved.

### Cited Findings
- Cycle: earnings finalised on the 3rd, threshold checked on the 20th, payment issued about the 21st; wire takes about 10 days; EFT up to 7 business days; check only where EFT is unavailable; Hyperwallet stated as US-based publishers only — [AdMob Help: payments](https://support.google.com/admob/answer/2772140)
- Google's AdSense-for-YouTube payment table lists Ecuador with wire transfer and check, no EFT, no Hyperwallet — [YouTube Help](https://support.google.com/youtube/answer/14728152) (older table).
- June 11 2026 announcement: Hyperwallet payouts extended to 21 LatAm territories including Ecuador for AdSense, AdMob, Ad Manager; withdrawal fees may apply — [PPC Land (secondary)](https://ppc.land/google-brings-paypal-hyperwallet-payouts-to-21-latam-territories/); contradicts AdMob page above.

### Gaps
- Threshold amount (not found; see [AdMob payment thresholds](https://support.google.com/admob/answer/2772137)); US tax info/withholding for non-US publishers; UMP/GDPR/CCPA; child-directed treatment; COPPA; LOPDP. See [AdMob policies](https://support.google.com/admob/answer/6128543), [UMP](https://developers.google.com/admob/android/privacy), [LOPDP text](https://www.finanzaspopulares.gob.ec/wp-content/uploads/2021/07/ley_organica_de_proteccion_de_datos_personales.pdf) (URL unverified).

## Tax and entity (Ecuador) - for discussion with an accountant

### Takeaway
RIMPE categories were recategorised in 2026 and thresholds are in flux; the correct treatment of foreign digital income (export of services, IVA 0%, withholding) was not confirmed from SRI sources.

### Cited Findings
- SRI recategorised RIMPE in Jan 2026: about 14,000 moved from Negocio Popular to Emprendedor (income above USD 20,000), about 56,000 to the general regime — [Vistazo](https://www.vistazo.com/actualidad/nacional/2026-01-07-sri-actualiza-rimpe-traslada-miles-contribuyentes-otros-regimenes-asi-verificar-si-afecta-OF10629025)
- New recategorisation from 1 July 2026 — [Primicias](https://www.primicias.ec/economia/sri-recategorizacion-rimpe-negocios-populares-emprendedores-regimen-general-ecuador-126928/); figures differ across blogs ([Beancount](https://beancount.io/blog/2026/07/10/ecuador-rimpe-recategorization-2026-small-business-guide)).
- Electronic invoicing mandatory for Emprendedores, optional for Negocios Populares; sources disagree on caps — [Siigo](https://www.siigo.com/ec/rimpe-emprendedores/)
- SRI has procedures for IVA refund and ISD refund for service exporters — [gob.ec IVA refund](https://www.gob.ec/sri/tramites/devolucion-impuesto-al-valor-agregado-iva-exportadores-servicios), [gob.ec ISD refund](https://www.gob.ec/sri/tramites/devolucion-impuesto-salida-divisas-exportadores-servicios)

### Gaps
- Whether ad/store payouts qualify as exported services at 0% IVA, income tax treatment, foreign withholding, Ecuador-US treaty (none that I know of; UNVERIFIED), incorporation options (SAS vs US LLC), platform reporting. Check [sri.gob.ec](https://www.sri.gob.ec) with a local contador.

## Intellectual property and security

### Takeaway
Only one point was probed: Discord's "Wumpus" mascot is a real collision risk, but I did not find trademark filings or Discord's brand rules.

### Cited Findings
- Wumpus is Discord's widely recognised mascot, and the character name derives from the 1973 game — [Wikipedia: Wumpus](https://en.wikipedia.org/wiki/Wumpus) (secondary).
- Discord's branding page (not retrieved): [discord.com/branding](https://discord.com/branding)

### Gaps
- Trademark searches ([USPTO](https://tmsearch.uspto.gov), [EUIPO](https://euipo.europa.eu/eSearch/), [IEPI](https://www.propiedadintelectual.gob.ec)), Play/App Store name conflicts, copyright status of Hunt the Wumpus (Gregory Yob, 1973; the code is widely shared but public-domain status is UNVERIFIED), asset licence checklist, Firebase key exposure and Firestore rules: not researched. Firebase docs: [security rules](https://firebase.google.com/docs/firestore/security/get-started), [API key guidance](https://firebase.google.com/docs/projects/api-keys).
- Practical inference only: avoid Discord-like mascot art and consider a more distinctive title.

## Alternative stores and policy changes

### Takeaway
Policy is still moving; a solo developer with a small game likely gains little from steering/alt-billing now.

### Cited Findings
- Ninth Circuit (Dec 2025) upheld the Epic v. Apple contempt finding but allowed Apple a cost-based fee on external links; the Supreme Court agreed to review (June 2026); no final external-link rate as of 16 Aug 2026 — [ETV Bharat summary](https://www.etvbharat.com/en/technology/epic-games-app-store-battle-vs-google-vs-apple-update-enn26081402735), [The Next Web](https://thenextweb.com/news/supreme-court-apple-epic-contempt-app-store-commission), [MacRumors](https://macrumors.com/2026/06/11/apple-fights-back-against-epic/)
- A search summary reports Google settled with Epic in March and cut commissions to 20%, and that from 30 June alternative billing/link-outs are allowed in the US, UK and EU; I could not verify this from a primary source — treat as UNVERIFIED; check [Google Play developer blog](https://android-developers.googleblog.com).

### Gaps
- Amazon Appstore, Samsung Galaxy Store, Huawei AppGallery, itch.io, Steam, PWA: not researched.
