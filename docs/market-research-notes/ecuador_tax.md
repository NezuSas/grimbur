# Ecuador tax treatment and entity options for a foreign-facing mobile game (informational, not tax advice; state as of Oct 2026)

Method note: only ~9 web calls were used. No sri.gob.ec or Registro Oficial page was fetched directly; most 2026 facts come from press and accounting blogs. Everything should be confirmed with a contador against SRI sources.

## 1. Registration: RUC and regime (RIMPE Emprendedor / Negocio Popular / General)

### Takeaway
Freelancers earning from abroad must register a RUC (activity registration within 30 days), issue electronic invoices and file returns. For a game-developer person earning more than USD 20,000/yr the 2026 press says RIMPE Emprendedor (USD 20,001-300,000), and after 3 years in the regime or above USD 300,000 the taxpayer goes to the General regime. Rates and mechanics below are from secondary sources and need official confirmation.

### Cited Findings
- SRI recategorised RIMPE taxpayers twice in 2026. January: about 14,000 Negocio Popular taxpayers moved to Emprendedor because 2025 income exceeded USD 20,000 — [Vistazo, 7 Jan 2026](https://www.vistazo.com/actualidad/nacional/2026-01-07-sri-actualiza-rimpe-traslada-miles-contribuyentes-otros-regimenes-asi-verificar-si-afecta-OF10629025); [Primicias](https://www.primicias.ec/economia/sri-recategorizacion-contribuyentes-rimpe-emprendedores-impuestos-iva-113225/)
- From 1 July 2026: Negocio Popular with prior-year income above USD 20,000 (up to 300,000) becomes Emprendedor; those above USD 300,000, or having completed three years in the regime, go to the General regime. About 56,000 taxpayers were moved to General. Applied automatically (de oficio). Status can be checked at SRI en línea > RUC > Consulta — [Primicias](https://www.primicias.ec/economia/sri-recategorizacion-rimpe-negocios-populares-emprendedores-regimen-general-ecuador-126928/); [El Comercio](https://www.elcomercio.com/actualidad/negocios/ecuador-inicia-recategorizacion-tributaria-julio/); [Vistazo, 2 Jul 2026](https://www.vistazo.com/negocios/economia/2026-07-02-desde-julio-sri-recategoriza-contribuyentes-rimpe-FJ11091747)
- Thresholds: Negocio Popular up to USD 20,000 gross/yr; Emprendedor USD 20,001-300,000. Emprendedor income tax is computed on gross income with a RIMPE table (expenses not deductible); Emprendedor invoices carry the legend "Contribuyente Régimen RIMPE"; Emprendedor files IVA monthly or semiannually depending on activity; Negocio Popular files no IVA — [Beancount guide, 10 Jul 2026](https://beancount.io/es/blog/2026/07/10/ecuador-rimpe-recategorization-2026-small-business-guide) (third-party; cites no law)
- Emprendedor sample tranches (secondary, "referential"): USD 20,000.01-50,000: USD 60 + 1% of excess; 50,000.01-75,000: USD 360 + 1.25%; 75,000.01-100,000: USD 672.50 + 1.5%; 100,000.01-200,000: USD 1,047.50 + 1.75%. Negocio Popular example: USD 18,000 income pays USD 60. Withholding rate for Emprendedores cited as 1% on bank-system transfers. Annual income tax return window for 2025 was May 2026 (to 28 May by ninth RUC digit) — [search digest of Siigo/El Diario/El Comercio](https://www.siigo.com/ec/blog/obligaciones-fiscales/rimpe-emprendedores/); [El Diario](https://www.eldiario.ec/centro/rimpe-2026-monto-pagar-sri-ecuador-11052026/)
- SRI controls on remote freelancers: must register RUC with activity "Prestación de servicios profesionales" within 30 days, issue electronic invoices, keep income/expense records, file IVA and income tax; SRI watches frequent deposits in personal accounts of non-invoicing freelancers — [Primicias (updated Mar 2024)](https://primicias.ec/noticias/economia/freelancers-sri-controles-pagos-extranjero); [Bloomberg Línea](https://www.bloomberglinea.com/latinoamerica/ecuador/ecuador-hara-controles-tributarios-a-los-freelancers-que-trabajan-para-empresas-extranjeras/)
- Income tax personal table 2026 (general regime): SRI resolution NAC-DGERCGC25-00000043 (29 Dec 2025); exempt basic fraction USD 12,208; marginal 5% up to 37% above USD 109,956 — [NMS Law](https://nmslaw.com.ec/blog/2026/01/05/tablas-impuesto-renta-2026-ecuador/) (secondary)

### Inferences
- A solo developer with app/ad revenue under USD 20k is likely Negocio Popular-eligible on income size, but whether app/software activity qualifies for that category was not verified; the 3-year limit means the RIMPE route is temporary.
- Whether to be in RIMPE vs General depends on expenses (RIMPE Emprendedor taxes gross income with no deductions); only a contador can model this.

### Gaps
- No official SRI/Registro Oficial text was read for the RIMPE rules, the legal instrument behind the 2026 recategorisation, or the exact current tables. The press does not cite one.
- Eligibility of digital-product activities for Negocio Popular not confirmed. Whether any 2025 law (e.g., Ley Orgánica de Eficiencia Económica y Generación de Empleo) changed RIMPE: searched, nothing found.

## 2. IVA: export of services, 15% rate, platform sales to Ecuadorians

### Takeaway
SRI treats remote services for foreign clients paid from abroad as exportación de servicios (reported in IVA casilleros 408/418), generally 0% IVA, but export treatment has conditions in LRTI Art. 56 num. 14 that were not verified for platform payouts (Google/Apple/AdMob). The general IVA rate is 15% since April 2024. Foreign digital-service providers charge or have IVA withheld on sales to Ecuadorian consumers.

### Cited Findings
- Export-service income is declared as "Exportación de Servicios" in IVA form casilleros 408 and 418, and in income tax casillero 612 ("Ingresos gravados en libre ejercicio profesional"); income tax due in March for personal filers (2024 article) — [Primicias](https://primicias.ec/noticias/economia/freelancers-sri-controles-pagos-extranjero); [search digest of same](https://www.vistazo.com/actualidad/nacional/sri-inicia-controles-a-los-freelancers-en-ecuador-deben-pagar-impuestos-por-sus-servicios-FC7037117)
- Exporters of services defined in LRTI Art. 56 num. 14; "exportador habitual" = annual net service exports >= 25% of net sales; SRI offers IVA refund to service exporters for input IVA — [EY Tax Alert 2019](https://ey.com/content/dam/ey-unified-site/ey-com/es-ec/technical/tax/documents/ey-tax-alert-cpt-iva-exportadores-servicios19.pdf); [gob.ec SRI tramite](https://www.gob.ec/sri/tramites/devolucion-impuesto-al-valor-agregado-iva-exportadores-servicios)
- General IVA rate 15% since April 2024 (also 5% and 0% categories) — [Expreso](https://www.expreso.ec/actualidad/economia/cobra-iva-no-casos-no-paga-impuesto-ecuador-247354.html); [Beancount](https://beancount.io/es/blog/2026/07/10/ecuador-rimpe-recategorization-2026-small-business-guide)
- Digital services by non-residents are subject to IVA since 2020; card issuers withhold IVA when the provider is unregistered, otherwise the importer withholds 100%; SRI keeps a list (catastro) of non-resident digital providers — [Primicias](https://primicias.ec/noticias/economia/normas-cobro-impuesto-plataformas-digitales); [Moore Ecuador](https://ec.moore-global.com/MediaLibsAndFiles/media/ec.moorestephens.com/Moore_New/Moore_pdf/Moore-Ecuador-Informa-No81-IVA-SERVICIOS-DIGITALES_1.pdf) (2020 sources, rate then 12%)

### Inferences
- That Google/Apple pay the developer as the platform's customer-of-record is how a payout might qualify as an export; but Play/App Store arguably act as agents/resellers and the invoicing counterparty (Google Ireland, Google LLC, Apple) differs per product. This is not covered by any source found.
- IVA on sales to Ecuadorian end-users is handled by the platform; the developer's concern is only the payout.

### Gaps
- Documentation required by SRI to support 0% (contracts, foreign invoice, proof of payment, DAE-like docs) not found. No source addresses AdMob/Play/App Store payouts specifically.
- No official source fetched confirming current Art. 56 text.

## 3. Income tax on foreign-source/export income; US treaty and W-8BEN

### Takeaway
Per SRI press coverage, export-service income of an Ecuadorian-resident freelancer is taxable in Ecuador and declared like other professional income. No US-Ecuador income tax treaty exists per secondary advisory sources; W-8BEN would therefore not claim treaty benefits but documents foreign status.

### Cited Findings
- Export of services is declared and taxed in Ecuador (see section 2 sources).
- No US-Ecuador income tax treaty (and no totalization agreement); a W-8BEN is still collected to document foreign status; services performed entirely in Ecuador by a nonresident alien are generally foreign-source and generally not subject to US withholding/1042-S — [Omnivoo](https://omnivoo.com/blog/paying-ecuadorian-contractors-from-us-company); [Greenback Tax](https://www.greenbacktaxservices.com/country-guide/expat-taxes-for-ecuador/); [BrightTax](https://brighttax.com/countries/ecuador/)
- Personal income tax brackets 2026: see section 1 (NMS Law).

### Inferences
- Royalty-like income (app/IP licensing) could be treated as US-source and withheld 30% by a US payer without a treaty; whether Google payouts are royalties vs services was not checked and is a key question.

### Gaps
- IRS Tax Treaty Tables page not fetched; treaty absence rests on secondary blogs. Deductible expenses for general regime, worldwide-income rule for residents (LRTI), and foreign tax credit not sourced.

## 4. Entity options: SAS vs US LLC

### Takeaway
SAS is cheap and quick to set up in Ecuador; a US LLC does not remove Ecuadorian tax residents' obligation to declare worldwide income (this last point is from general knowledge/question premise, not sourced here).

### Cited Findings
- SAS exists since 18 May 2020 (Ley Orgánica de Emprendimiento e Innovación); no minimum capital; formed electronically at the Superintendencia de Compañías, 2-5 days; no notary or Registro Mercantil required; shareholder liability limited to contributions; a 2021 article puts constitution up to USD 1,500 cheaper than an S.A. — [Primicias 2021](https://primicias.ec/noticias/economia/empresas-constitucion-sas-superintendencia-companias); [BizLatinHub](https://www.bizlatinhub.com/es/una-sociedad-sas-en-ecuador-beneficios-y-consideraciones); [Lexlatin](https://lexlatin.com/entrevistas/ecuador-deuda-mypes-regular-sociedad-acciones-simplificada)

### Inferences
- A company has its own RUC, accounting, annual Supercias filings and corporate income tax (rate not verified here), so costs exceed an individual RUC.

### Gaps
- Current SAS costs, annual obligations, corporate tax rate, dividend tax, US LLC/Stripe Atlas pitfalls (CFC/transparency, Form 5472, Ecuador treatment of LLCs) - no sources found.

## 5. Practical: invoicing, currency, bank receipt

### Takeaway
Electronic invoicing to the foreign payer is expected. USD is Ecuador's currency so no conversion. Bank-specific experiences not found.

### Cited Findings
- Google Play pays by wire in USD; the recipient bank may charge fees; Google advises contacting the bank — [Google Play Help](https://support.google.com/googleplay/android-developer/answer/2700656?hl=en)
- Third-party: Play payouts around the 15th monthly, wires take 5-7 business days — [Nami](https://amp.namiml.com/en/amp/play-store-developer-payout-schedule) (secondary)
- Electronic invoicing is mandatory for freelancers; SRI monitors personal-account deposits (see section 1).

### Gaps
- No evidence on Banco Pichincha/Produbanco/Banco del Pacífico experiences with Google/AdMob wires, intermediary fees, or required bank paperwork. No evidence on whether platforms accept an Ecuadorian invoice. No forum (Reddit etc.) sources reached.

## Questions to ask a contador
1. Which RUC regime and activity code fits app/ad revenue (RIMPE Negocio Popular vs Emprendedor vs General), and how does the 3-year limit affect planning?
2. Do Google Play, App Store and AdMob payouts qualify as exportación de servicios at 0% IVA (LRTI Art. 56 num. 14), what supporting documents are needed, and who is the invoice addressee?
3. Is the income classed as services or royalties/IP for Ecuadorian and US withholding purposes; what to put on W-8BEN (no treaty) and could Google withhold 30%?
4. Which expenses are deductible in each regime; can I claim IVA refund as service exporter?
5. SAS vs individual: breakeven, annual costs, corporate and dividend tax; consequences of a US LLC for an Ecuador tax resident.
6. How to avoid SRI flags on foreign deposits; which bank handles USD wires best and with what fees?
