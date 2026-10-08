# THE FROZEN HOUR (L'Heure Figée) — project bible (contract for all contributors)

> **LANGUAGE OVERRIDE — overrides every French sentence below.** The game is in **ENGLISH**.
> All player-facing text (dialogue, narration, scene text, NPC lines, endings, credits, chapter titles and kickers, on-screen labels) is written in English.
> Display names: **Leo** (Leo Varin), **Juliette**, **Elias** (Elias Varin), **Mireille Crow**, **Gaspard**, **The Regent** (Aurelien Vantard), **Mrs. Pivert**, **Old Hugo**, **Bastien**, **Tomas**, narrator.
> Proper nouns from the world stay: the city is **Vermeil**, the tower is the **Saint-Aube Tower**.
> Chapter titles: ch1 "Vermeil Station" · ch2 "The Frozen Market" · ch3 "The Foundries" · ch4 "Inside the Tower" · ch5 "The Dial".
> Chapter kickers: "Chapter I · 23:47", "Chapter II · The market", "Chapter III · The boiler room", "Chapter IV · Deep in the mechanism", "Chapter V · The summit".
> Endings: "Time Resumes" (good) and "The Eternal Hour" (bad). Ch5 choice labels: "Restart the clock" (flag restart, end good) and "Keep the hour frozen" (flag freeze, end bad).
> Internal ids do NOT change: leo, juliette, elias, mireille, gaspard, regent, pivert, hugo, bastien, tomas, narrator, rouage, fige, sablier, ch1…ch5, flag names, unlock names (dash, pendule, ressort).
> Voices and story are unchanged — only the language changes. Write natural, vivid English with the same character voices.

Jeu 2D de plateforme / aventure narrative, en **français**, en HTML5 Canvas pur (aucun build).
Public : chaîne YouTube francophone. Ciblé **ordinateur** (clavier AZERTY), pas mobile.
Résolution logique **960 × 540**, tuiles de **32 px**. Ouvrir `game/index.html` dans un navigateur.

---

## 1. Histoire

**Vermeil**, ville de laiton et de pluie. La Grande Horloge de la Tour Sainte-Aube fait tourner
tout le monde : trains, fours, lampadaires. Il y a dix ans, à **23h47**, elle s'est arrêtée.
Ce qui s'est passé cette nuit-là est un secret, et il est au cœur de tout le jeu.

Le fait réel (à révéler petit à petit) : **Élias Varin**, horloger en chef, a arrêté la Tour pour
sauver sa fille **Juliette**, tombée dans la cage des engrenages. Il a « juste voulu gagner une minute ».
La minute ne s'est jamais terminée : la ville entière est restée figée. Élias est resté dans le cœur
de la Tour, à tenir le balancier à la main.

Le **Léo** de 10 ans après porte la culpabilité : c'est lui qui **a lâché la main de Juliette** dans l'escalier,
au moment où elle a glissé. Il croit que tout est sa faute. Il se croit aussi coupable de l'arrêt de la ville.
Son arc : de la culpabilité et de la colère vers l'acceptation (laisser partir / se pardonner).

**Le Régent** (Aurélien Vantard) est le miroir de Léo : sa femme Constance est morte de fièvre. Il veut
garder la ville figée pour que plus rien ne soit jamais perdu. Il a fait de la Tour sa forteresse.

### Le choix final
Au sommet (chapitre 5), Léo peut :
- **« Relancer l'horloge »** (flag `restart`) → *Fin 1 : « Le Temps Reprend »* (fin vraie). Juliette peut
  enfin partir en paix, Élias est libéré, Tomas rit à nouveau, Madame Pivert finit son pain.
- **« Garder l'heure figée »** (flag `freeze`) → *Fin 2 : « L'Heure Éternelle »*. Juliette reste une enfant
  pour toujours, Léo devient le nouveau gardien de la Tour, la ville reste figée. Triste et belle.

---

## 2. Personnages (ids à utiliser EXACTEMENT)

| id | Nom affiché | Rôle | Look (pour les dessinateurs) | Voix (pour les dialogues) |
|---|---|---|---|---|
| `leo` | Léo | Héros, 17 ans, apprenti horloger | Écharpe bleu nuit tricotée, lunettes de laiton relevées sur le front, cheveux bruns en bataille, gilet de cuir brun, clé à molette géante (« la Clé-Aube ») à la ceinture, montre de poche ouverte | Court, nerveux, sarcastique quand il a peur, très doux quand il pense à Juliette |
| `juliette` | Juliette | Petite sœur, morte-vivante dans la mémoire (6 ans) | Fantôme translucide, lumière dorée, robe trop grande, cheveux qui flottent, petite horloge de poche en pendentif | Vive, enfantine, courageuse, appelle Léo « Léo-Grand » |
| `elias` | Élias | Père, horloger, prisonnier du balancier | Mi-homme mi-machine : grand, manteau d'atelier, lunettes, une moitié du visage en laiton qui tourne, œil gauche = cadran | Tendre, précis, un peu triste, parle en métaphores d'horlogerie |
| `mireille` | Mireille Corbeau | Voleuse, 22 ans, alliée | Cheveux roux en deux tresses, veste courte de velours prune, gants sans doigts, petit crochet dans les cheveux, très agile | Rapide, cynique, drôle, argot de rue, protectrice |
| `gaspard` | Gaspard | Automate (nourrice mécanique construite par Élias) | Grand, silhouette de maître d'hôtel en laiton patiné, tête ovale à visière, un œil en verre bleu qui clignote, rouages visibles sur le torse, pas lents et lourds | Formel, poli, ironie sèche, émotif sous la politesse, vouvoie Léo |
| `regent` | Le Régent (Aurélien Vantard) | Boss final, ancien associé d'Élias | Très grand, longue redingote noire à engrenages, masque de porcelaine-cadran fêlé sur la moitié du visage, gants blancs, canne à pommeau d'horloge | Poétique, froid, sentencieux, « mon garçon », phrases longues |
| `pivert` | Madame Pivert | Boulangère, coincée dans la boucle | Rondelette, tablier blanc taché de farine, foulard à pois, cheveux relevés au crayon | Chaleureuse, bavarde, maternelle, « Un pain, mon petit ? » |
| `hugo` | Vieux Hugo | Jouets et automates, râleur | Petit, barbe grise broussailleuse, lunettes sur le bout du nez, bleu de travail, loupe à la main | Bourru, sec, humour noir, respecte Élias |
| `bastien` | Bastien | Chef de gare, nerveux | Uniforme de cheminot trop serré, casquette, moustache, carnet d'horaires | Bureaucratique, anxieux, parle de « procédure » et de « retard » |
| `tomas` | Tomas | Petit frère de Mireille, figé en plein rire | Enfant de 8 ans, pull rayé, tient un petit pain, bouche ouverte en rire | Presque muet : répliques de 1-3 mots (« Encore ! », « Grand-frère ! ») |
| `narrator` | (aucun) | Narration | — | — |

Les ennemis / créatures (pas de portrait) :
- `rouage` : crabe-mécanique de laiton qui court sur ses dents d'engrenage, rapide, fragile.
- `fige` : statue de citoyen figé (pierre grise, fissures, yeux qui luisent), lent et saccadé, il bouge par à-coups (« tic-tac »), se réveille quand on approche.
- `sablier` : petit sablier volant avec des ailes de papier, sable qui s'échappe en spirale, tourne en cercles puis plonge.
- `regent` (boss, voir ci-dessus).

---

## 3. Mécaniques et contrôles

Clavier AZERTY, les deux jeux de touches fonctionnent :
- Gauche/Droite : **←/→** ou **Q/D**
- Saut : **Espace**, **↑** ou **Z**
- Attaque (Clé-Aube) : **X** ou **J**
- Esquive / dash : **Maj** ou **K** (débloqué ch2)
- Pendule (ralentir le temps) : **C** ou **L** (débloqué ch3), maintenir, consomme une jauge
- Double saut « Ressort » : **saut en l'air** (débloqué ch4)
- Interagir / avancer dialogue : **Entrée**, **Espace** ou **E**
- Pause : **Échap** ou **P**

Capacités et flags (déblocages par dialogues `{act:'unlock'}`) : `dash`, `pendule`, `ressort`.
Flags d'histoire (`{act:'flag'}`) : libres, par exemple `met_pivert`, `tomas_saved`, `gaspard_awake`, `restart`, `freeze`.

Physique de référence (à respecter dans les niveaux) :
- Saut : monte **3 tuiles max**, franchit un trou de **3 tuiles max**.
- Dash + saut : franchit **5 tuiles**. Ressort (double saut) : monte **5 tuiles**.
- Un trou de plus de 3 tuiles est infranchissable sans capacité.
- Les pics `^` font perdre 1 cœur. Tomber hors de la carte = retour au dernier point de sauvegarde `C`.

---

## 4. Contrat des fichiers (chargés dans cet ordre par `index.html`)

```
game/index.html
game/js/art/base.js          ← ART (helpers de dessin + registre). Déjà écrit.
game/js/art/leo.js           ← ART.register({id:'leo', ...})
game/js/art/mireille.js
game/js/art/gaspard.js
game/js/art/regent.js
game/js/art/juliette.js      ← juliette + elias
game/js/art/townsfolk.js     ← pivert, hugo, bastien, tomas
game/js/art/enemies.js       ← rouage, fige, sablier
game/js/env/env.js           ← ENV (décors, tuiles). Thèmes : station, market, foundry, tower, clockface
game/js/audio/audio.js       ← AUDIO (musique + sons, synthèse WebAudio, aucun fichier audio)
game/js/chapters/index.js    ← CHAPTERS.register(...) (déjà écrit)
game/js/chapters/ch1.js … ch5.js
game/js/story/endings.js     ← textes des fins (narrateur)
game/js/core.js              ← moteur (écrit par le lead)
game/js/game.js              ← états, UI, boucle (écrit par le lead)
```

Règle absolue : **chaque contributeur n'écrit QUE son(ses) fichier(s).** Ne touche pas aux autres fichiers.
Vérifie ta syntaxe avec `node --check <ton_fichier>` avant de finir (les fichiers sont des scripts classiques
dans le navigateur, pas des modules ES — pas de `import`/`export`).

---

## 5. Contrat ART (personnages et ennemis)

`game/js/art/base.js` expose `window.ART` :

```js
ART.register({ id, w, h, draw(ctx, pose), portrait(ctx, expr, t) })   // enregistre un personnage
ART.draw(ctx, id, pose)            // le moteur l'appelle; applique le flip (pose.facing) puis appelle draw
ART.portrait(ctx, id, expr, t)     // le moteur l'appelle pour la boîte de dialogue
ART.OUT                            // couleur de contour par défaut ('#1c1420')
ART.limb(ctx, x1,y1, x2,y2, width, color, opts)   // membre épais arrondi (bras, jambe, cou)
ART.ell(ctx, x,y, rx,ry, color, opts)             // ellipse ; opts.rot (radians), opts.stroke (false = pas de contour)
ART.rr(ctx, x,y, w,h, r, color, opts)             // rectangle arrondi
ART.poly(ctx, pts, color, opts)                   // pts = [[x,y],...]
ART.gear(ctx, x,y, r, teeth, rot, color, opts)    // engrenage
ART.eye(ctx, x,y, r, lookX, lookY, blink, opts)   // œil (blanc + pupille), blink 0..1
ART.shade(hex, amt)                               // éclaircit (amt>0) ou assombrit (amt<0) une couleur hex
ART.lerp(a,b,t), ART.clamp(v,a,b)
```
`opts` pour toutes les formes : `{ stroke: true|false, lw: 2, rot: 0, alpha: 1, outline: '#hex' }`.
Par défaut : contour `ART.OUT`, épaisseur 2. **Chaque forme a un contour sombre** : c'est le style du jeu.

### Pose (argument `pose` de `draw`)
Le dessin se fait **face à droite**, l'origine (0,0) = **centre des pieds**, y négatif = vers le haut.
Le moteur fait déjà `scale(-1,1)` quand le personnage regarde à gauche : ne gère PAS le flip.

| champ | type | sens |
|---|---|---|
| `state` | string | `idle`, `walk`, `run`, `jump`, `fall`, `land`, `attack`, `dash`, `hurt`, `dead`, `talk`, `slow` (Pendule actif), + états propres aux boss/ennemis (voir section dédiée) |
| `t` | number | secondes depuis le début de l'état courant (pour les animations ponctuelles : attaque, mort) |
| `time` | number | horloge globale en secondes (pour respiration, oscillations) |
| `vx`, `vy` | number | vitesse en px/s (pour pencher le corps, déformer) |
| `facing` | 1 / -1 | (géré par le moteur) |
| `phase` | 1..3 | phase du boss (défaut 1) |

Un état inconnu doit se comporter comme `idle`. Ne lève jamais d'exception : tout doit être défensif.

### Attendu pour les personnages joueur/PNJ
- Au moins : idle (respiration), walk/run (cycle de marche avec bras et jambes qui se répondent),
  jump, fall, attack (arc de la clé/bras avec « traînée »), hurt (recul), dead (chute + fondu), talk (bouche/gestes).
- Silhouette **reconnaissable de loin** (chapeau, écharpe, cheveux, forme du corps).
- Anticipation / squash & stretch légers. Pas de simples rectangles : formes arrondies, détails (boutons, rouages, ombres).
- **Portrait** : buste dans un carré logique centré sur (0,0) de **200 × 200** (x ∈ [-100,100], y ∈ [-100,100]).
  Expressions : `neutral`, `happy`, `sad`, `angry`, `surprised`, `worried` (fallback `neutral`). Clignement via `t`.
- Une **taille** `w,h` (boîte de collision logique, en px, pieds au centre) :
  - leo 22×46 · mireille 22×46 · gaspard 34×62 · juliette 22×42 · elias 30×64 · regent 60×100
  - pivert 28×48 · hugo 24×40 · bastien 26×50 · tomas 20×32
  - rouage 26×18 · fige 26×48 · sablier 26×34 (ces 3 ont leur hauteur de dessin proche de ces valeurs)

### Ennemis et boss : états attendus
- `rouage` : `idle`, `walk`, `attack` (se propulse, dents qui tournent), `hurt`, `dead` (éclate en rouages).
- `fige` : `idle` (immobile, yeux éteints), `walk` (à-coups saccadés), `attack` (se jette, yeux rouges), `hurt`, `dead` (se fissure, tombe en poussière).
- `sablier` : `idle`/`walk` (vol sinusoïdal, ailes qui battent), `attack` (plonge, sable en spirale), `hurt`, `dead`.
- `regent` : `idle`, `walk`, `telegraph` (lève la canne, la tête vibre), `slam` (frappe au sol, onde), `beam` (rayon de sable/temps depuis la main),
  `summon` (ouvre sa redingote, des engrenages sortent), `charge`, `intro`, `hurt`, `dead`.
  Changements visuels par phase : phase 2 le masque se fissure, phase 3 la redingote se déchire et des engrenages tournent autour.
  `pose.phase` donne la phase.

---

## 6. Contrat ENV (décors)

`game/js/env/env.js` expose `window.ENV` :

```js
ENV.drawBackground(ctx, theme, camX, camY, t, W, H)   // ciel + plans parallaxes (appelé avant le monde)
ENV.drawTile(ctx, theme, ch, x, y, t, nb)              // une tuile 32×32 en coordonnées monde (x,y = coin haut-gauche)
   // ch : caractère de la carte ('#','=','^','C','X','o','h','B')
   // nb : {u,d,l,r} = true si la tuile voisine est solide ('#' ou 'B') — pour l'autotiling des bords
ENV.drawForeground(ctx, theme, camX, camY, t, W, H)    // premier plan parallaxe (poussière, pluie, aiguilles)
```
Thèmes : `station` (gare, pluie, quai), `market` (marché figé, étals, lanternes), `foundry` (fonderie, feu, vapeur),
`tower` (intérieur de la Tour, cages d'engrenages, cordes), `clockface` (sommet, grand cadran, nuages arrêtés).
`camX,camY` = caméra en px monde. Les plans lointains doivent défiler lentement (0.2–0.5 × camX).
Tuiles : pierre/brique/bois/laiton selon le thème. `C` = lanterne-horloge allumée, `X` = porte de sortie
(porte de fer avec cadran), `o` = rouage doré qui tourne, `h` = burette d'huile qui brille, `B` = grille de fer/arène,
`^` = pics (pointes de laiton), `=` = plateforme fine en bois/métal.

---

## 7. Contrat AUDIO (sans fichier audio : tout est synthétisé)

`game/js/audio/audio.js` expose `window.AUDIO` :

```js
AUDIO.unlock()           // à appeler sur le premier geste utilisateur
AUDIO.music(name)        // lance une piste en boucle : 'title' | 'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5' | 'boss' | 'ending_good' | 'ending_bad'
AUDIO.musicStop()
AUDIO.sfx(name)          // 'jump' 'land' 'attack' 'hit' 'hurt' 'dash' 'pickup' 'gear' 'heal' 'death' 'checkpoint'
                         // 'door' 'talk' 'blip' 'choice' 'unlock' 'boss_intro' 'boss_hit' 'boss_die' 'tick' 'pendule' 'step' 'menu'
AUDIO.setVolume(0..1)
```

---

## 8. Contrat CHAPITRES (les niveaux + leur histoire)

`game/js/chapters/index.js` fournit `window.CHAPTERS.register(chapter)` et stocke dans `CHAPTERS.list[id]`.
Chaque chapitre est **un seul fichier** `ch1.js` … `ch5.js` :

```js
(function () {
  CHAPTERS.register({
    id: 'ch1',
    title: 'La Gare de Vermeil',
    kicker: 'Chapitre I · 23h47',
    theme: 'station',              // station | market | foundry | tower | clockface
    music: 'ch1',                  // piste AUDIO
    next: 'ch2',                   // id du chapitre suivant ; null pour le dernier
    map: [
      '................................................................',
      // ... une chaîne par ligne, TOUTES de la même longueur (110 à 170 colonnes), 18 lignes
    ],
    scenes: [                      // déclenchées une seule fois quand Léo atteint la colonne `col`
      { col: 2, id: 'ch1_arrivee', lines: [ /* lignes de dialogue */ ] }
    ],
    npcs: {                        // clé = chiffre présent sur la carte ('1'..'9')
      '1': { who: 'pivert', lines: [ /* première rencontre */ ], again: [ /* rencontres suivantes */ ] }
    }
  });
})();
```

### Légende des caractères de carte (une tuile = 32 px)
| car. | sens |
|---|---|
| `.` | vide |
| `#` | sol / mur plein (solide) |
| `=` | plateforme fine (traversable par le dessous, on atterrit dessus) |
| `^` | pics (1 cœur de dégât) — toujours posés sur un `#` ou un `=` |
| `S` | point de départ de Léo (exactement un par chapitre, sur un sol) |
| `C` | point de sauvegarde (lanterne), sur un sol, tous les 35 à 50 colonnes |
| `X` | sortie vers le chapitre suivant, sur un sol, à l'extrême droite |
| `o` | rouage doré à ramasser (collectable) — placer 8 à 20 par chapitre, en récompense de détours |
| `h` | huile (soigne 1 cœur) — 1 à 3 par chapitre, bien placées |
| `r` | ennemi rouage (au-dessus du sol : il tombe) |
| `f` | ennemi fige (idem) |
| `s` | ennemi sablier (vole) |
| `1`…`9` | PNJ (correspond à la clé de `npcs`) — posés sur un sol |
| `B` | barrière d'arène : colonne de `B` (2 à 4 de haut), **se ferme dès que Léo la franchit** ; s'ouvre à la mort du boss |
| `R` | point d'apparition du boss (dans l'arène) |

Règles de niveau :
- Chaque ligne a la même longueur. La dernière ligne est presque toujours du `#` ou des trous (`.`) — un trou jusqu'en bas = chute.
- Pas d'ennemi à moins de 6 colonnes de `S`.
- Pas de `^` sous une plateforme `=` (inaccessible) ni dans un trou sans sortie.
- Respecter la physique de la section 3 (sauts ≤ 3 tuiles, trous ≤ 3 tuiles sans capacité).
- Une capacité débloquée dans une scène (ex. `dash` en ch2) doit servir ensuite dans le même chapitre
  (un trou à franchir, un coffre de rouages en hauteur). Ne jamais bloquer le joueur sans indice.

### Lignes de dialogue
Un tableau d'objets, joué dans l'ordre. Types :
```js
{ who: 'leo', expr: 'worried', text: 'Il n\'y a personne sur ce quai…' }   // parole. expr optionnel (défaut neutral)
{ who: 'narrator', text: 'Dix ans. La pluie n\'a jamais cessé.' }          // narration, sans portrait
{ act: 'unlock', value: 'dash' }                                           // débloque dash | pendule | ressort (son + bandeau)
{ act: 'flag', value: 'met_pivert' }                                       // pose un drapeau d'histoire
{ act: 'shake' }                                                           // secousse d'écran
{ act: 'flash' }                                                           // flash blanc
{ act: 'sfx', value: 'door' }                                              // joue un son (voir AUDIO)
{ act: 'choice', options: [ { text: 'Relancer l\'horloge', flag: 'restart', end: 'good' },
                            { text: 'Garder l\'heure figée', flag: 'freeze', end: 'bad' } ] }   // choix du joueur ; pose le flag ; `end` lance la fin correspondante
{ act: 'end', value: 'good' }                                              // lance une fin directement : 'good' ou 'bad'
```

Scènes de boss (ch4 uniquement) : des scènes spéciales, déclenchées par le moteur et non par la position :
- `id: 'boss_phase2'` : jouée quand le Régent passe en phase 2 (`col` ignoré, mettre la colonne de `B`).
- `id: 'boss_phase3'` : jouée quand il passe en phase 3.
- `id: 'boss_defeated'` : jouée quand il tombe (la barrière `B` s'ouvre ensuite).

### Style d'écriture (français)
- Lignes **courtes** : 1 à 2 phrases, **maximum ~120 caractères** par réplique (une boîte affiche 3 lignes).
- Chaque personnage a SA voix (tableau de la section 2). Les répliques doivent être **reconnaissables sans le nom**.
- Accents et guillemets français « … » autorisés. Apostrophes droites `'` : échapper dans les chaînes ou utiliser des guillemets doubles `"…"`.
- Pas d'anglicismes, pas de fautes. Pas de longs monologues : entre deux répliques du même personnage, mettre une réaction d'un autre.
- Chaque chapitre : une scène d'ouverture (col 1-3), 2 ou 3 rencontres de PNJ, une scène de milieu, une scène de fin
  de chapitre (juste avant `X`) qui fait avancer l'histoire et prépare la suite.

---

## 9. Chapitres (plan de l'histoire et de la progression)

**ch1 — La Gare de Vermeil (23h47).** Nuit de pluie, gare figée. La montre de poche d'Élias se remet à tiquer.
Léo entre dans la gare. Madame Pivert (boucle de son pain) lui parle ; Bastien (chef de gare, « procédure ») bloque
le quai. Rouages et figés. Découverte d'une photo de Juliette sur un billet de train. Dernier passage : la voix
de Juliette « Léo, tu me lâches pas ? ». Fin : le train vers la Tour est là. Mécaniques : marche, saut, attaque.
Flag ouverture : `leo_arrives`.

**ch2 — Le Marché Figé.** Étals pris dans un instant. Des figés se réveillent quand on approche. Mireille
Corbeau vole la montre (ou un rouage) de Léo, puis l'échange : elle veut que Léo redémarre la Tour pour son petit
frère Tomas, figé avec un pain au milieu d'un rire. Déblocage : **dash** (« la glisse de Mireille »). Vieux Hugo
(Hugo) donne un indice sur Élias. Fin : pont vers la Fonderie. Flag : `mireille_ally`.

**ch3 — Les Fonderies.** Fourneaux qui ne s'éteignent pas, vapeur figée. Gaspard l'automate dort dans la chaufferie ;
Léo le réveille avec la montre. Gaspard raconte une version partielle de la nuit (« votre père voulait gagner une minute »).
Les sabliers attaquent. Déblocage : **pendule** (ralentir le temps, maintenir C/L). Fin : monte-charge vers la Tour.
Flag : `gaspard_awake`.

**ch4 — Les Entrailles de la Tour.** Cages d'engrenages, cordes, mémoires (Juliette apparaît, translucide). Léo
retrouve dans les engrenages le **ressort** (double saut) : déblocage **ressort**. Juliette : « Tu m'as lâché la main. »
Puis l'arène : le **Régent** barre la porte (`B`) et combat (`R`). Phases 1-3. Après sa défaite, il avoue (Constance,
« le temps est une trahison »). Il tombe ; la porte s'ouvre.

**ch5 — Le Cadran.** Le sommet, le grand cadran, les nuages arrêtés. Élias, mi-machine, au balancier. Confrontation,
Gaspard retrouve sa dignité, Mireille et Tomas. Le **choix** (`{act:'choice'}`) : `restart` ou `freeze`.
Puis fin : `{act:'end', value:'good'}` si `restart`, `'bad'` si `freeze` (le moteur lit le flag).
Pas de boss : une montée finale avec des figés et des sabliers, puis la scène.
