# Ecuador developer payouts (Google Play, AdMob, Apple) as of October 2026

Note: fetched through a summarizing WebFetch, so figures are paraphrased by a small model. Re-verify critical numbers on the live pages.

## Google Play: how an Ecuadorian developer is paid

### Takeaway
Ecuador is on Google's wire-transfer payout list. Payouts are in USD, with a US$100 minimum balance, and the bank sets the wire fee.

### Cited Findings
- Ecuador is on the list of eligible locations for Play wire-transfer payouts. — [Play Console Help: Wire transfer payouts](https://support.google.com/googleplay/android-developer/answer/2700656?hl=en)
- Google pays in USD, and the bank may convert to local currency. A USD-denominated account is preferred if the bank offers one. — same page
- The earned balance must reach US$100 to be eligible at the end of the payment cycle. There is no maximum unless the account says otherwise. — same page
- Wire fees are set by the bank and can run from US$0 to US$50 or more. — same page
- You add a bank account in Play Console. The page shows no Ecuador-specific documentation requirements, only Argentina-specific ones. I did not verify SWIFT/IBAN format specifics. — same page
- Android Police reported in March 2018 that Ecuador was added to the merchant (paid apps and IAP) countries, with payments in USD. Before that, Ecuadorian developers could only publish free apps. — [Android Police 2018](https://www.androidpolice.com/2018/03/02/developers-ecuador-can-now-sell-paid-apps-play-store/)
- A third-party source says Play payouts arrive around the 15th of the month. This is secondary and unverified. — [namiml](https://amp.namiml.com/en/amp/play-store-developer-payout-schedule)

### Inferences
- Ecuador uses USD as its own currency, so a normal local USD bank account avoids FX conversion. Fees should depend on the intermediary banks.

### Gaps
- I did not fetch the "supported locations for merchants" page directly. Ecuador's status rests on the wire-transfer page and the 2018 report.
- No firsthand Ecuadorian developer accounts of Play payouts were found: no Reddit or forum posts, and no actual fees or timing experienced.
- Specific SWIFT or routing requirements for Ecuadorian banks were not found.

## AdMob: threshold, payment methods, tax

### Takeaway
AdMob pays monthly, around the 21st, once the balance passes the payment threshold. Wire or EFT are the standard methods. Google announced PayPal Hyperwallet for Ecuador in June 2026, but the official AdMob page I fetched still says Hyperwallet is US-only.

### Cited Findings
- Payment is issued around the 21st if the balance exceeds the threshold and there are no holds. The balance must meet the threshold by the 20th. Below-threshold balances roll over. — [AdMob: payment timing](https://support.google.com/admob/answer/2772140)
- Arrival times: EFT up to 7 business days, wire about 10 days, Western Union Quick Cash 1 business day (pickup within 60 days), check 2 to 4 weeks. The page lists Hyperwallet as US publishers only. — same page
- Payment forms depend on the payment address and may include EFT and wire. You choose the method once earnings reach the selection threshold. Ad earnings must reach $10 before the process moves forward. — [AdMob: payments](https://support.google.com/admob/answer/3001017?hl=en)
- The $100 USD figure appears as an example on that page, but the page does not state the threshold itself. A third-party FAQ says $100 for ACH/wire. — [onecity FAQ](https://mobileapp.onecity.co.in/faqs/how-does-admob-pays-me-for-the-add-revenue-my-app-has-earned) (secondary)
- ppc.land reports that on June 11, 2026, Google's AdSense Help Center announced Hyperwallet payouts for AdSense, AdMob and Ad Manager in 21 LATAM and Caribbean territories, including Ecuador. It requires a new Hyperwallet account, which cannot be linked to an existing one. Withdrawal is via PayPal, cash pickup or other local options. Fees are shown in Hyperwallet and vary by method. The threshold is not stated. — [ppc.land](https://ppc.land/google-brings-paypal-hyperwallet-payouts-to-21-latam-territories/) (single secondary source; conflicts with the official AdMob page above, which says US only)
- Tax: Google may be required to collect tax information depending on location. — [AdMob payments](https://support.google.com/admob/answer/3001017?hl=en)
- Withholding: Google rarely withholds but may withhold up to 30% if the form is incomplete, for example a W-8BEN with no treaty number and 0% in Section 10 and no US TIN. — [AdMob tax info](https://support.google.com/admob/answer/4381375?hl=en-GB)
- The same page says Google "cannot accept a W-8BEN form from an Individual". Non-resident individuals must use Form 8233. A foreign publisher with no US Activities can sign a declaration and file no tax forms. US Activities means US-based employees or owned equipment tied to AdMob revenue, such as a US web server. — same page. Note this page covers the Google Inc. entity only. Forms 1042-S are issued when a W-8 or 8233 is submitted.

### Inferences
- A solo Ecuadorian developer with no US employees or servers likely qualifies for the "no US Activities" declaration, so no withholding. This is not confirmed for Ecuador specifically, so use the tax wizard in the AdMob account.

### Gaps
- The exact AdMob payment threshold for Ecuador was not found. The "Payment thresholds" article was not fetched. Treat it as USD 100 pending verification.
- Whether wire transfer is currently offered to Ecuador addresses was not confirmed on an official page.
- The IRS treaty tables did not show Ecuador, because the fetch returned no country rows. I believe the US has no income tax treaty with Ecuador, from general knowledge only. This is unverified. Check [IRS treaty tables](https://www.irs.gov/individuals/international-taxpayers/tax-treaty-tables).
- No firsthand reports of AdMob payments to Ecuadorian banks were found.

## Apple App Store

### Takeaway
I could not confirm from official pages that Ecuador is supported for the Apple Developer Program or for banking. Apple pays by direct deposit or EFT in the currency of the chosen bank account, within 45 days of fiscal month end.

### Cited Findings
- Enrollment may not be supported in certain regions, for example due to sanctions. Apple publishes no country list on this page, and Ecuador is not mentioned. — [Apple: program enrollment](https://developer.apple.com/help/account/membership/program-enrollment/)
- Payment needs a Paid Apps Agreement and banking information. Split bank accounts are unsupported. — [App Store Connect: receiving payments](https://www.developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments)
- Payments arrive within 45 days after the fiscal month end, via direct deposit or EFT. They are made in the currency of the bank account, and Apple's bank converts at its own rate. Bank or intermediary fees may reduce the deposit. A per-country minimum payment threshold applies, and the amount is on a separate page not fetched. Ecuador is not mentioned. — same page
- Banking information must be for your own bank, not an intermediary. Some regions need extra documents, and tax forms must be submitted first. — [App Store Connect: enter banking information](https://www.developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information) (via search summary)

### Inferences
- Ecuador is a USD economy, so a USD account at a local bank is the likely route, but this is unconfirmed.

### Gaps
- No official statement that Ecuador is a supported banking country, and the "minimum payment threshold" page was not read.
- The Apple W-8BEN process for Ecuador and treaty status were not verified. The Apple developer banking list was not found.

## Alternative payout helpers

### Takeaway
Payoneer and Wise are both available in Ecuador, but I found no confirmation that Play, AdMob or Apple pay directly into them.

### Cited Findings
- Payoneer in Ecuador, approximate figures: USD withdrawal to an Ecuadorian bank costs US$1.50, and other currencies up to 3%. Receiving from other Payoneer users and USD transfers to Payoneer receiving accounts are free. Client card payments cost up to 3.99%. An annual fee of US$29.95 applies if you receive under US$2,000 in 12 months. — [Wise Ecuador blog on Payoneer fees](https://wise.com/ec/blog/cuanto-cobra-payoneer-por-transferencia-bancaria). Wise is a competitor of Payoneer, so treat the framing with caution.
- Wise lets someone abroad send money to an Ecuadorian bank account, arriving as USD. No exact Ecuador fees were given. — same page
- Wise has a dedicated Ecuador payment-methods page. — [Wise](https://wise.com/gb/hub/payment-methods/ecuador) (not fetched)

### Inferences
- A US LLC with a US bank account (Stripe Atlas style) is an option, but I did not research it.

### Gaps
- Whether Play, AdMob or Apple can pay into Payoneer or Wise USD receiving accounts was not verified. Wise's receiving account details for USD in Ecuador and Stripe Atlas availability and fees were not researched.
- No Reddit, StackOverflow or Medium firsthand reports were retrieved, because the search tool returned none.
