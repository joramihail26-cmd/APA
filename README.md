# GameNight Master

Aplicație web pentru serile de jocuri cu prietenii. Împarte jucătorii în echipe echilibrate, le dă roluri potrivite, respectă regulile impuse (cine nu poate fi cu cine), ține scorul și anunță câștigătorul.

## Pornire

Necesită Node.js 22.13 sau mai nou (SQLite este inclus în Node, nu se compilează nimic).

```
npm install
npm start
```

Deschide http://localhost:3000. Baza de date SQLite se creează singură în `data/gamenight.db`.

Variabile opționale: `PORT` (implicit 3000), `DB_FILE` (calea bazei de date).

## Comenzi

| Comandă | Ce face |
|---|---|
| `npm start` | pornește serverul |
| `npm test` | rulează testele (algoritmi comparați cu forța brută + API) |
| `npm run bench` | măsoară timpii algoritmilor |

## Cum se folosește

1. **Jucători**: adaugi prietenii, cu trăsături (strategie, creativitate, viteză, comunicare) și un nivel de la 1 la 5 pentru fiecare joc. Nivelurile se pot schimba și din tabelul de pe aceeași pagină.
2. **Seară nouă**: alegi cine joacă, jocul (nivelurile se pot ajusta pe loc), numărul de echipe și, dacă vrei, reguli stricte. Aplicația calculează echipele și rolurile. Dai nume echipelor și începi seara.
3. **Scor**: pentru fiecare meci apeși + la echipa care a punctat. Clasamentul se actualizează singur.
4. **Încheie seara**: apare mesajul câștigătorului, iar victoriile intră în clasamentul general.
5. **Planificator**: spui cine vine și cât timp aveți, iar aplicația alege jocurile potrivite.
6. **Algoritmi**: descrierea fiecărui algoritm și un buton care rulează testele pe server.

## Algoritmi

| Algoritm | Unde se folosește | Complexitate |
|---|---|---|
| Kuhn-Munkres (Hungarian) | rolurile din fiecare echipă | O(n²·m) |
| Bitmask DP | echipe echilibrate fără reguli | O(3ⁿ) timp, O(2ⁿ) memorie |
| Branch and Bound | echipe echilibrate cu reguli stricte | O(kⁿ) în cel mai rău caz |
| Rucsac 0/1 (DP) | planificatorul serii | O(g·T) |
| Round-robin (metoda cercului) | programul meciurilor | O(k²) |

Detalii în [DOCUMENTATIE.md](DOCUMENTATIE.md).

## Structura proiectului

```
server.js                    pornirea serverului
src/app.js                   rute REST, securitate, fișiere statice
src/db.js, seedGames.js      schema SQLite și jocurile implicite
src/validators.js            validări și erori HTTP
src/algorithms/              Algorithm (clasa de bază) + cei 5 algoritmi
src/repositories/            PlayerRepository, GameRepository
src/services/                Rating, RoleAssigner, TeamService, PlannerService,
                             SessionService, StatsService, SelfTest
public/                      interfața (HTML, CSS, module JavaScript, fără build)
tests/                       teste automate și benchmark
```
