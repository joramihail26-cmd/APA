# GameNight Master: documentația proiectului

## 1. Problema și scopul

La o seară de jocuri cu prietenii, împărțirea în echipe se face de obicei „din ochi". Rezultatul e subiectiv: o echipă iese mai puternică, cineva se simte nedreptățit, iar rolurile (cine desenează, cine ghicește) se stabilesc după cine strigă mai tare. Aplicația înlocuiește alegerea din ochi cu algoritmi exacți, care dau mereu cea mai bună soluție posibilă și pot fi verificați.

Scopul este o aplicație web funcțională care organizează echipele, rolurile, programul serii și scorul.

## 2. Analiza domeniului

Aplicațiile existente se împart în două categorii:

- **generatoare de echipe**: amestecă jucătorii la întâmplare sau cu o euristică simplă (de exemplu sortează după nivel și împart pe rând). Nu garantează echilibrul și nu acceptă reguli de tipul „acești doi nu stau împreună";
- **aplicații de turnee**: programează meciuri și țin clasamentul, dar presupun că echipele sunt deja făcute.

GameNight Master le combină și adaugă ce lipsește: echilibrul optim, reguli stricte, roluri potrivite fiecărui jucător și alegerea jocurilor după timpul disponibil.

Cerințele de alocare care apar într-o seară:

| Cerință | Tip de problemă | Algoritm |
|---|---|---|
| fiecare jucător pe rolul potrivit | atribuire (matching de cost minim) | Kuhn-Munkres |
| echipe cât mai egale ca putere | partiționare | Bitmask DP |
| reguli stricte (separați / împreună / fixat) | optimizare cu restricții | Branch and Bound |
| ce jocuri încap în timpul disponibil | rucsac | DP |
| cine cu cine joacă | programare de turneu | round-robin |

## 3. Caiet de sarcini

**Cerințe funcționale**

1. Gestionarea jucătorilor: adăugare, editare, ștergere, culoare, patru trăsături de la 1 la 10.
2. Nivel de la 1 la 5 pentru fiecare joc, separat pentru fiecare jucător, editabil din profil, din tabelul de niveluri și din pasul de alegere a jocului.
3. Catalog de jocuri cu roluri; posibilitatea de a adăuga jocuri proprii.
4. Formarea echipelor (2 până la 8) din jucătorii prezenți, cu sau fără reguli stricte.
5. Atribuirea automată a rolurilor în fiecare echipă.
6. Denumirea echipelor (manual sau sugestii aleatoare).
7. Programul meciurilor și introducerea scorului, cu clasament în timp real.
8. Încheierea serii cu mesaj pentru câștigător (sau pentru egalitate).
9. Clasament general al jucătorilor și istoric al serilor.
10. Planificator care alege jocurile după timpul disponibil.

**Cerințe nefuncționale**

- răspuns sub o secundă pentru grupuri de până la 18 jucători;
- validare pe server pentru toate datele primite;
- interfață utilizabilă pe telefon și pe calculator, cu temă deschisă și închisă;
- instalare simplă: `npm install`, `npm start`, fără configurare;
- cod organizat pe straturi, testabil.

## 4. Tehnologii alese

| Componentă | Alegere | Motiv |
|---|---|---|
| Limbaj | JavaScript (Node.js) | același limbaj pe server și în browser |
| Server | Express | rute REST simple, mult folosit |
| Bază de date | SQLite (node:sqlite, inclus în Node) | fișier unic, fără server separat, tranzacții |
| Interfață | HTML, CSS, module JavaScript native | fără pas de build, încărcare rapidă |
| Teste | `node:test` | inclus în Node, fără dependențe |
| Mediu | Visual Studio Code, Node.js 22, Chromium (Playwright) pentru verificarea interfeței | |

Interfața încarcă fiecare pagină ca modul separat, la cerere. Serverul comprimă răspunsurile și trimite antete de securitate (CSP, `nosniff`, `X-Frame-Options`). Textul din interfață este inserat doar prin `textContent`, deci nu există injectare de HTML.

## 5. Algoritmii

În tot proiectul, „puterea" unui jucător la un joc este un număr întreg: 70% nivelul declarat (1–5, scalat la 20–100) și 30% cea mai bună potrivire cu un rol al jocului (media ponderată a trăsăturilor).

### 5.1 Kuhn-Munkres (metoda ungară): rolurile

**Problemă.** Avem n jucători într-o echipă și m locuri de rol (n ≤ m; dacă sunt mai mulți jucători decât locuri, se adaugă locuri „Membru"). Afinitatea jucătorului i pentru rolul j este jumătate potrivirea trăsăturilor cu rolul și jumătate nivelul la joc. Vrem atribuirea cu afinitate totală maximă.

**Idee.** Se minimizează costul `100 − afinitate`. Algoritmul păstrează potențiale u[i] pe rânduri și v[j] pe coloane, astfel încât `cost[i][j] − u[i] − v[j] ≥ 0`. Pentru fiecare jucător nou caută un drum alternant de la el la o coloană liberă, folosind doar muchiile cu cost redus zero. Când nu există un asemenea drum, potențialele se ajustează cu cea mai mică diferență pozitivă, ceea ce adaugă o muchie nouă fără a strica optimalitatea.

**Complexitate.** O(n²·m) timp, O(n·m) memorie. Pentru echipe de 2–6 jucători costul e neglijabil.

### 5.2 Bitmask DP: echipe echilibrate

**Problemă.** Împărțim n jucători în k echipe cu dimensiuni fixe (primele n mod k echipe au un jucător în plus), astfel încât abaterea maximă `|suma echipei − dimensiune · media|` să fie minimă.

**Idee.** O mulțime de jucători încă neașezați se reprezintă ca mască de n biți. Starea `best(rest)` este cea mai mică abatere maximă posibilă pentru a așeza jucătorii din `rest`. Numărul de jucători deja așezați arată câte echipe sunt complete, deci nu trebuie reținut separat. Tranziția alege o submulțime de mărimea echipei curente:

```
best(rest) = min peste sub ⊆ rest, |sub| = mărimea echipei curente:
             max( |suma(sub) − mărime · medie| , best(rest \ sub) )
```

Ultima echipă primește tot ce a rămas. Sumele pe măști se precalculează într-un tabel. Când toate echipele rămase au aceeași mărime ele sunt interschimbabile, așa că submulțimea trebuie să conțină cel mai mic jucător rămas; asta elimină soluțiile care diferă doar prin ordinea echipelor.

**Complexitate.** O(3ⁿ) timp în cel mai rău caz (suma peste toate măștile a numărului de submăști), O(2ⁿ) memorie. De aceea limita aplicației este 18 jucători pentru calculul exact.

### 5.3 Branch and Bound: restricții stricte

**Problemă.** Aceeași funcție de cost ca la 5.2, plus reguli care trebuie respectate:

- `separate(a, b)`: a și b în echipe diferite;
- `together(a, b)`: a și b în aceeași echipă;
- `team(a, t)`: a în echipa t.

**Idee.** Jucătorii se așază pe rând, de la cel mai puternic la cel mai slab (cei fixați prin `team` primii). O ramură se abandonează dacă:

1. încalcă o regulă sau depășește capacitatea unei echipe;
2. limita inferioară a abaterii e cel puțin cât cel mai bun rezultat deja găsit. Limita are două părți: o echipă care a depășit deja ținta rămâne cu aceeași depășire (sumele doar cresc), iar o echipă care nu mai poate ajunge la țintă, nici dacă primește doar cei mai puternici jucători rămași, rămâne cu deficitul respectiv.

Fără reguli de tip `team`, echipele goale de aceeași mărime sunt interschimbabile, deci se încearcă doar prima dintre ele. Înainte de căutare se verifică rapid cazurile imposibile (un grup „împreună" mai mare decât o echipă). Dacă nicio ramură nu supraviețuiește, aplicația spune că regulile se contrazic.

**Complexitate.** O(kⁿ) în cel mai rău caz; tăierile reduc mult explorarea în practică (secțiunea 7). Căutarea se oprește la 8 milioane de noduri ca să nu blocheze serverul.

### 5.4 Rucsac 0/1 (programare dinamică): planul serii

Timpul se împarte în unități de 5 minute. Fiecare joc are greutatea `durată / 5` (rotunjită în sus) și valoarea `distracție · 10 · (0,6 + 0,4 · nivelMediu / 5)`, unde nivelul mediu este al jucătorilor prezenți. Tabelul `dp[i][t]` reține valoarea maximă folosind primele i jocuri în t unități; jocurile alese se recuperează parcurgând tabelul înapoi. Complexitate O(g·T). Jocurile care nu se potrivesc ca număr de jucători sunt excluse înainte și apar în listă cu motivul.

### 5.5 Round-robin (metoda cercului): meciurile

O echipă rămâne fixă, celelalte se rotesc cu o poziție la fiecare etapă. La număr impar de echipe se adaugă o pauză. Rezultă k−1 etape pentru k par (k pentru k impar), în care fiecare pereche joacă o dată și nicio echipă nu apare de două ori în aceeași etapă. Opțiunea „manșe" repetă ciclul. Complexitate O(k²).

### 5.6 Clasamentul

Victorie 3 puncte, egal 1, înfrângere 0. Ordinea: puncte, diferența de scor, scorul marcat. Dacă toate trei sunt egale pentru primele locuri, seara se declară egalitate și mesajul o spune.

## 6. Arhitectura

Proiectul are patru straturi, iar dependențele merg doar în jos:

```
public/ (interfață)  →  src/app.js (rute)  →  services/  →  repositories/ + algorithms/
```

**Algoritmi (POO).** Clasa abstractă `Algorithm` are `name`, `complexity`, metoda `solve()` (implementată de fiecare algoritm) și `run()`, care măsoară timpul și returnează `{ result, stats }`. Derivate: `Hungarian`, `BitmaskPartition`, `BranchAndBound`, `Knapsack`, `RoundRobin`.

**Servicii.**

| Clasă | Rol |
|---|---|
| `Rating` | puterea și afinitatea unui jucător |
| `RoleAssigner` | construiește matricea de cost și apelează `Hungarian` |
| `TeamService` | alege `BitmaskPartition` sau `BranchAndBound`, apoi `RoleAssigner`; calculează și o comparație cu 300 de împărțiri aleatoare |
| `PlannerService` | pregătește obiectele și apelează `Knapsack` |
| `SessionService` | creează seara (cu `RoundRobin`), păstrează scorurile, calculează clasamentul și mesajul |
| `StatsService` | clasamentul general al jucătorilor |

**Repozitorii.** `PlayerRepository` (jucători și niveluri) și `GameRepository` (jocuri și roluri) sunt singurele clase care scriu SQL; toate interogările sunt parametrizate.

**Model de date (SQLite).**

```
players(id, name UNIQUE NOCASE, color, strategy, creativity, speed, social, created_at)
games(id, name UNIQUE NOCASE, emoji, description, duration, fun, min_players, max_players, roles JSON, builtin)
levels(player_id → players, game_id → games, level 1..5)   cheie primară (player_id, game_id)
sessions(id, game_id → games, status, method, state JSON, result JSON, created_at, finished_at)
```

Echipele, meciurile și scorurile unei seri stau în `sessions.state`, ca o seară încheiată să rămână neschimbată chiar dacă un jucător e șters ulterior.

**API REST** (JSON):

| Rută | Rol |
|---|---|
| `GET/POST /api/players`, `PUT/DELETE /api/players/:id` | jucători |
| `PUT /api/players/:id/levels` | niveluri pe jocuri |
| `GET/POST /api/games`, `DELETE /api/games/:id` | jocuri |
| `POST /api/propose` | echipe și roluri (Bitmask DP / Branch and Bound / Hungarian) |
| `POST /api/plan` | planul serii (rucsac) |
| `POST /api/sessions`, `GET /api/sessions[/:id]` | seri |
| `PUT /api/sessions/:id/matches/:i` | scorul unui meci |
| `POST /api/sessions/:id/finish` | încheiere și câștigător |
| `GET /api/stats` | clasament general |
| `GET /api/selftest` | rulează testele algoritmilor |

Erori: 400 date invalide, 404 inexistent, 409 nume duplicat, 422 reguli care se contrazic.

## 7. Testare și rezultate

### 7.1 Cadrul de testare

`src/services/SelfTest.js` conține soluții de forță brută pentru fiecare problemă și un generator pseudo-aleator cu sămânță fixă (rezultatele se pot reproduce). Aceleași verificări rulează din `npm test`, din pagina „Algoritmi" și la `GET /api/selftest`.

| Grup | Verificări | Ce se compară |
|---|---|---|
| Kuhn-Munkres | 40 | costul total și faptul că rolurile sunt distincte, față de toate permutările (matrici până la 6×7) |
| Bitmask DP | 40 | abaterea optimă față de toate împărțirile (n până la 9, k 2–4) și acoperirea completă a jucătorilor |
| Branch and Bound | 70 | optimul față de forța brută cu 0–3 reguli aleatoare, respectarea regulilor, detectarea cazurilor imposibile; încă 10 cazuri fără reguli, unde rezultatul trebuie să fie egal cu cel din Bitmask DP |
| Rucsac | 30 | valoarea optimă față de toate submulțimile și respectarea capacității |
| Round-robin | 7 | k de la 2 la 8: fiecare pereche o dată, nicio echipă de două ori în etapă |
| **Total** | **187** | **toate trec** |

Pe lângă acestea, `tests/api.test.js` parcurge tot fluxul prin API: adăugare jucători, validări (nume scurt, nume duplicat, nivel în afara intervalului), niveluri, echipe cu și fără reguli, reguli imposibile, creare seară, scor, încheiere, mesaj de câștigător, blocarea modificărilor după încheiere, clasament și planificator. Total `npm test`: 7 teste, toate trec.

Interfața a fost parcursă și într-un browser automatizat (Chromium): adăugare jucător, nume duplicat respins, schimbare de nivel din tabel, asistentul de seară cu reguli, introducere scor, mesaj final, planificator, joc nou, rularea testelor din pagină, afișare pe ecran de 390 px fără derulare orizontală.

### 7.2 Timpi măsurați

Mediana din 5 rulări pe date aleatoare (`npm run bench`), Node 22:

| Algoritm | Instanță | Timp |
|---|---|---|
| Bitmask DP | 12 jucători, 3 echipe | 0,6 ms |
| Bitmask DP | 16 jucători, 4 echipe | 4,4 ms |
| Bitmask DP | 18 jucători, 3 echipe | 5,5 ms |
| Branch and Bound | 12 jucători, 3 echipe, o regulă | 1,4 ms |
| Branch and Bound | 16 jucători, 4 echipe, o regulă | 7,0 ms |
| Branch and Bound | 20 jucători, 4 echipe, o regulă | 423 ms |
| Kuhn-Munkres | 100×100 | 0,7 ms |
| Kuhn-Munkres | 200×200 | 5,3 ms |
| Rucsac | 200 jocuri, 1000 unități | 1,3 ms |

Pentru grupuri tipice (4–12 jucători) toate sunt sub 2 ms. Branch and Bound crește repede peste 16–18 jucători, de aceea aplicația îl limitează la 20.

### 7.3 Cât de bună e împărțirea

La fiecare propunere aplicația arată abaterea soluției optime și abaterea medie a 300 de împărțiri la întâmplare. La grupul de probă (9 jucători, Codenames, 3 echipe, două reguli) abaterea a fost 8,67 față de 29,73 la întâmplare, adică o împărțire cu aproximativ 71% mai echilibrată, deși soluția trebuia să respecte și regulile.

## 8. Etapele dezvoltării

1. Analiza domeniului și stabilirea problemelor de alocare.
2. Caietul de sarcini și alegerea tehnologiilor.
3. Implementarea algoritmilor ca clase izolate, fiecare cu forța brută de comparație.
4. Modelul de date și repozitoriile.
5. Serviciile care leagă algoritmii de datele aplicației.
6. API-ul REST cu validări.
7. Interfața: pagini, asistentul de seară, scor, mesajul câștigătorului.
8. Teste automate, test în browser, măsurători, documentație.

## 9. Concluzii și limite

Cei trei algoritmi din obiective sunt folosiți direct în fluxul unei seri: Bitmask DP sau Branch and Bound formează echipele, iar Kuhn-Munkres dă rolurile în fiecare echipă. Rucsacul și round-robin completează aplicația cu planul serii și programul meciurilor. Corectitudinea fiecăruia este verificată față de forța brută pe 187 de instanțe.

Limite cunoscute:

- calculul exact are limită de dimensiune (18 jucători la Bitmask DP, 20 la Branch and Bound), pentru că ambele sunt exponențiale; pentru grupuri mai mari ar fi nevoie de o euristică;
- „puterea" jucătorului este un model simplu (nivel plus potrivire cu rolurile); rezultatul e optim față de acest model, nu față de abilitatea reală, care depinde de cât de sinceră e autoevaluarea;
- baza de date e locală și aplicația nu are conturi; este gândită pentru un grup de prieteni pe un singur calculator sau server;
- scorul se introduce manual meci cu meci.

Dezvoltări posibile: conturi și grupuri multiple, import de jucători, euristică pentru grupuri mari, turnee eliminatorii, export al rezultatelor.
