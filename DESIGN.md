# DESIGN.md: GameNight Master

## Intent
- **Scop, acțiunea principală, succes:** organizezi o seară de jocuri în câteva minute: alegi jucătorii, aplicația face echipe echilibrate și roluri, apoi ții scorul. Acțiunea principală este **PRESS START → Seară nouă**. Succes înseamnă că grupul se uită împreună la ecran în momentele mari (echipele, scorul, câștigătorul).
- **Public și context:** prieteni la o seară de jocuri, seara, în cameră. Telefonul trece din mână în mână, iar laptopul sau televizorul stă pe masă. Interfața e doar în română; termenii arcade (PRESS START, VS, GAME OVER, HIGH SCORE) rămân în engleză ca decor.
- **3 cuvinte:** electric · nocturn · zgomotos.
- **Intensitate (dial):** 5 pentru Acasă, ecranul VS și HIGH SCORE. Paginile de lucru (formulare, tabelul de niveluri, planificator, algoritmi) stau la 2: tematice, dar lizibile.
- **Referințe:** firma de neon a unei săli de jocuri (tuburi care se aprind pe rând), tabelele HIGH SCORES de pe automate, ecranele „character select / VS” din jocurile de lupte, cartonașele de instrucțiuni lipite pe automate (pentru tema deschisă).
- **Anti-referințe:** dashboard SaaS mov/albastru cu carduri rotunjite identice; text cu gradient; „AI-made” generic.

## Direction
**A · Cabinet Neon**, ales de utilizator din panoul cu trei direcții (`design/options.html`). Conceptul folosit peste tot: *aplicația e un automat de jocuri*. Navigația e panoul de control al automatului, Acasă e ecranul „attract mode”, pașii serii sunt nivele (STAGE 1-4), echipele se prezintă ca într-un joc de lupte, iar finalul e tabela HIGH SCORE.

**Teme, ambele la același nivel (decizia utilizatorului):**
- **Închisă, „Neon”:** plum aproape negru, tuburi magenta, galben și verde cu glow, scanlines CRT.
- **Deschisă, „Instruction card”:** hârtie roz ca un cartonaș tipărit de automat. Neonul devine cerneală, iar glow-ul devine o umbră de tipar decalată (efect de misregistration). Același layout și aceleași momente.

**Animații React Bits, portate în vanilla JS** (decizia utilizatorului: fără React, fără build, CSP neschimbat). Le pun în `public/js/fx/`:
DecryptedText, CountUp, ClickSpark, StarBorder (CSS), TiltedCard, GlitchText (CSS), PixelTransition (tranziția între pagini), Magnet.
ShinyText nu se folosește: este text cu gradient (interzis de Impeccable). Locul lui îl iau DecryptedText și un glow solid.

## Signature moments
1. **Attract screen (Acasă).** Firma „GAMENIGHT MASTER” se aprinde tub cu tub, cu 2-3 pâlpâiri. Sloganul se decriptează (DecryptedText). Podeaua în perspectivă curge spre privitor. Panoul HIGH SCORES derulează clasamentul real (sau jucătorii de probă). Butonul PRESS START are o lumină care aleargă pe contur (StarBorder) și e magnetic (Magnet).
   - **Telefon:** firma ocupă lățimea, pe două rânduri (~38% din înălțime). Sub ea vin sloganul și PRESS START pe toată lățimea. HIGH SCORES devine o bandă tip ticker sub buton. Podeaua ocupă ultima treime.
   - **Desktop:** compoziție împărțită. Firma uriașă stă în stânga (~58% din lățime, peste 120px pe rând), cu sloganul și PRESS START sub ea. În dreapta e cabinetul HIGH SCORES, înalt, cu 5 rânduri și scanlines. Podeaua acoperă toată lățimea. Hero-ul are `min-height: 100dvh` minus bara.
   - **Reduced motion:** firma e aprinsă de la început, fără pâlpâiri. Textul e final, podeaua e statică, iar ticker-ul se oprește (lista rămâne vizibilă).
2. **Ecranul VS (Seară nouă, pasul 4).** Ecranul se împarte pe diagonală. Echipele intră din lateral (echipa 1 din stânga, echipa 2 din dreapta; de la 3 echipe, în cascadă). Un „VS” glitch explodează în centru. Cartonașele jucătorilor sunt înclinate 3D (TiltedCard) și au rolul dedesubt. Numele echipelor se pot edita direct în bannerul echipei.
   - **Telefon:** echipele stau stivuite vertical, cu VS între ele. Cartonașele sunt în listă, fără tilt (doar o apăsare cu scale).
   - **Desktop:** două coloane față în față, cu VS mare în centru, peste linia diagonală. Pentru 3+ echipe folosesc un grid cu bannere colorate și VS mic între rânduri.
   - **Reduced motion:** fără intrări din lateral și fără glitch: VS e static, iar cartonașele apar direct.
3. **HIGH SCORE (încheierea serii).** Overlay pe tot ecranul. „GAME OVER” apare cu glitch (~600 ms), apoi numele echipei câștigătoare se decriptează, punctele urcă (CountUp), iar artificiile pixel pornesc (ClickSpark extins). Dedesubt apare clasamentul serii ca tabelă de recorduri arcade (1ST, 2ND, 3RD), cu rândurile intrând unul câte unul. La egalitate, mesajul e „DRAW”.
   - **Telefon:** numele pe 1-2 rânduri, tabela pe toată lățimea, acțiunile fixate jos.
   - **Desktop:** numele uriaș centrat, tabela de 560px sub el, cu artificii pe tot ecranul.
   - **Reduced motion:** totul apare direct, fără artificii.

**Momentele proprii ale paginilor interne:** Jucători devine un ecran „character select” (cartonașe de luptător cu bare de statistici LED). Pagina serii devine un scoreboard LED cu cifre Handjet care numără. Clasament e o tabelă HIGH SCORES. Planificatorul e un „ROUTE MAP” cu jocurile ca nivele.

## Layout and flow (redesign, nu temă)
- **Navigație:**
  - Desktop: o „marquee” sus, cu firma mică în stânga și butoane de cabinet (etichete în Handjet, LED aprins pe pagina curentă). „Seară nouă” e butonul de start, separat și accentuat.
  - Telefon: un panou de control fix jos, cu 5 butoane: Acasă, Jucători, START (central, rotund, ca o fisă), Clasament și Mai mult (Jocuri, Planificator, Algoritmi). Tema se schimbă din „Mai mult” și din marquee.
- **Wizard:** bara de pași devine STAGE 1-4, cu nivelul curent aprins. Pasul 1 e un grid character-select: un tap aprinde „READY” pe cartonaș. Pasul 2 arată jocurile ca niște cartușe. Pasul 4 e ecranul VS.
- **Sesiune:** meciurile sunt panouri LED (echipa A, scor, scor, echipa B), cu butoane +/− mari, de cel puțin 44px. Clasamentul serii stă în dreapta pe desktop și sub meciuri pe telefon.
- **Tranziția între pagini:** PixelTransition, un grid de blocuri care acoperă și apoi descoperă ecranul în ~360 ms. Nu rulează la prima încărcare și nici cu reduced motion.

## Tokens
- **Fonturi** (locale, în `public/fonts`, subset latin + latin-ext pentru ă â î ș ț):
  - Tilt Neon pentru firme și titlurile mari (h1, numele echipelor la VS, câștigătorul);
  - Handjet (variabil, 400-800) pentru cifre LED, etichete, butoane și pași, în majuscule cu tracking;
  - Chakra Petch (400/600/700) pentru textul de lucru, formulare și tabele.
- **Scara tipografică:** în produs e fixă în rem, cu pas ~1.25: 0.8125 / 1 / 1.25 / 1.5625 / 2 rem. Momentele-semnătură folosesc `clamp()`: hero 3.2-9rem, VS 4-10rem.
- **Culori (OKLCH)**, cu contrastul măsurat pe fundal:
  - Închisă: fundal `0.17 0.035 300`, fundal 2 `0.21 0.04 300`, suprafață `0.24 0.045 300`, linie `0.36 0.06 310`, text `0.96 0.012 330` (17.0), text atenuat `0.74 0.04 320` (8.2), magenta `0.72 0.25 350` (6.3), galben `0.92 0.19 105` (15.4), verde `0.85 0.22 145` (13.1), roșu (eroare) `0.7 0.2 25`.
  - Deschisă: hârtie `0.96 0.02 340`, hârtie 2 `0.93 0.025 340`, suprafață `0.985 0.01 340`, linie `0.82 0.04 330`, text `0.22 0.05 300` (15.5), text atenuat `0.45 0.05 310` (6.7), magenta `0.52 0.24 350` (5.2), galben-cerneală `0.55 0.13 85`, verde-cerneală `0.5 0.15 150`.
- **Spațiere:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 (`--s-1` … `--s-9`).
- **Colțuri:** 2px pe elementele mici, 6px pe panouri. Fără colțuri mari rotunjite: automatele au colțuri tăiate, așa că panourile principale primesc `clip-path` cu un colț teșit.
- **Umbre:** în tema închisă, glow colorat în culoarea elementului (nu negru generic); în tema deschisă, o umbră de tipar decalată 3px, în magenta sau ink.
- **Mișcare:**
  - `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` pentru intrări; `--ease-io: cubic-bezier(0.77, 0, 0.175, 1)` pentru ce se mută pe ecran;
  - feedback 120-160 ms, intrări 240-420 ms, momente 600-1400 ms;
  - spring cu bounce mic (0.2) doar pe obiecte de joc (cartonașe, fise, +1);
  - `prefers-reduced-motion` are variantă statică pentru tot.

## Components and patterns
- **Se refolosesc:** `h()`, `openDialog`, `toast`, `segmented` și `avatar` din `ui.js`; ele primesc stil nou, dar API-ul rămâne același.
- **Componente noi:** `.panel` (panou de cabinet cu colț teșit), `.led` (cifre), `.neon` (text cu tub), `.cart` (card de joc), `.fighter` (cartonaș de jucător), `.stage` (pas), `.deck` (navigația de jos pe mobil), plus modulele `fx/*`.
- **Interzise în proiect:** text cu gradient; dungi colorate pe marginea stângă a cardurilor; carduri rotunjite identice cu umbră neagră; emoji folosite ca icon decorativ deasupra titlurilor (emoji-urile jocurilor rămân: sunt datele jocului).

## Skill plan
| File | Why (signal) | Phase |
|---|---|---|
| `ui-ux/sources/impeccable/SKILL.md` | design lead (core) | Plan + Build |
| `ui-ux/rules/SKILL.md`, `ui-ux/motion/SKILL.md`, `ui-ux/audit/SKILL.md` | core | Build / Audit |
| `IMP/typography.md` | fonturi noi (display + body) | Plan |
| `IMP/color-and-contrast.md` | paletă nouă, două teme | Plan |
| `IMP/spatial-design.md`, `IMP/responsive-design.md` | full build, telefon + desktop | Build |
| `IMP/interaction-design.md` | formulare, dialoguri, focus, loading | Build |
| `IMP/motion-design.md` | reduced motion, timing | Build |
| `~/.claude/skills/emil-design-eng/SKILL.md` | momente-semnătură, dial 5 | Build |
| `~/.claude/skills/animate/SKILL.md` + `RECIPES.md` | momente-semnătură | Build |
| `~/.claude/skills/apple-design/SKILL.md` | TiltedCard (adâncime), spring, fisa START | Plan + Build |
| `~/.claude/skills/high-end-visual-design/SKILL.md` | pagini brand dial 5 pe desktop | Plan + Build |
| `~/.claude/skills/redesign-existing-projects/SKILL.md` | redesign al unui produs existent | Plan |
| `~/.claude/skills/frontend-design-direction/SKILL.md` | ecrane de produs cu stări | Plan |
| `~/.claude/skills/break-ui/SKILL.md` + `CATALOG.md` | nume, liste, numere de la utilizatori | Audit |
| `~/.claude/skills/gstack-design-review/SKILL.md`, `make-interfaces-feel-better/SKILL.md` | critica de full build | Audit |
| `~/.claude/skills/review-animations/SKILL.md` | momente care se mișcă | Audit |

**Nerutate intenționat:**
- motion-foundations, motion-patterns și motion-advanced: sunt pentru React/Framer; nu există scroll storytelling.
- mobile-native: aplicația e web, iar `dvh` și safe-area sunt acoperite de responsive-design.
- performance-optimization: fără 3D sau video; efectele sunt CSS plus un canvas mic.
- imagegen: nu se generează imagini.

## Decisions log
- 2026-11-19: port React Bits în vanilla JS, nu migrare la React. Decis de utilizator: păstrează proiectul fără build și CSP-ul strict.
- 2026-11-19: temă arcade/retro neon, direcția A Cabinet Neon. Decis de utilizator, din panoul cu trei direcții.
- 2026-11-19: redesign de layout + flux + vizual; logica și API-ul rămân. Decis de utilizator.
- 2026-11-19: ambele teme la același nivel. Decis de utilizator.
- 2026-11-19: momente: attract screen, VS, HIGH SCORE. Decis de utilizator.
- 2026-11-19: fonturi locale; doar română. Decis de utilizator.
- 2026-11-19: ShinyText exclus (text cu gradient); înlocuit cu DecryptedText și glow solid. Decis de agent (regula Impeccable).
- 2026-11-19: familia „LED” combină literele din Handjet cu cifrele din Chakra Petch 700, pentru că zeroul din Handjet are un punct în mijloc și se citește ca 8 la dimensiuni mici. Handjet rămâne singur doar pe cifrele mari de pe scoreboard (`--font-score`). Toate fețele LED au descriptorul `400 800`: Chrome nu combină după unicode-range fețe cu greutăți diferite. Decis de agent, după verificare în browser.
- 2026-11-19: serverul trimite `Cache-Control: no-cache` (revalidare prin ETag) pentru CSS/JS, în loc de `max-age=1h`. Altfel, după actualizare, browserele ar amesteca modulele vechi cu pagina nouă. Fonturile rămân în cache o zi. Decis de agent.
