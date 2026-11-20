# Dernier Bastion

Jeu de stratégie en couloir dans un monde post-apocalyptique : les **Survivants** (toi)
contre les **Mutants** (l'ordinateur). Recrute des unités, lance des sorts, détruis le nid ennemi.

- 100 % HTML5 Canvas + JavaScript, **sans aucune dépendance** ni bibliothèque.
- Jouable sur **PC** (souris, clavier) et **téléphone** (tactile, en paysage).
- Graphismes et sons entièrement générés par le code : aucun fichier image ou audio.

---

## 1. Jouer

### En ligne (le plus simple)
Le jeu est publié avec GitHub Pages :
**https://mehdinourreddine62.github.io/Dernier-bastion-/**

### Sur ton ordinateur
Le jeu doit être servi par un petit serveur web (ouvrir `index.html` directement ne marche pas,
à cause des règles de sécurité des navigateurs). Dans un terminal, dans le dossier du jeu :

```bash
python3 -m http.server 8000
```

puis ouvre **http://localhost:8000** dans ton navigateur.
(Autre possibilité, si Node.js est installé : `npx serve`.)

### Commandes
| Action | PC | Téléphone |
|---|---|---|
| Recruter | clic sur le bouton, ou touches **1 à 5** | toucher le bouton |
| Sorts | **Q** (mortier), **W** (soins), puis clic pour viser | toucher le sort, puis toucher le champ de bataille |
| Défiler | molette, flèches, **A / D**, glisser, bord de l'écran | glisser le doigt, toucher la mini-carte |
| Pause | **Espace** ou **Échap** | bouton **II** |
| Infobulle | survol d'un bouton | appui long sur un bouton |

---

## 2. Modifier les valeurs du jeu

**Toutes** les valeurs d'équilibrage sont dans un seul fichier : **`src/config.js`**.
Modifie un chiffre, enregistre, recharge la page : c'est pris en compte.

| Section de `config.js` | Ce qu'elle règle |
|---|---|
| `economy` | ferraille de départ (`startScrap`), revenu par seconde, prime par ennemi tué, coûts de l'amélioration du revenu |
| `combat` | population max par camp (`populationMax`), taille de la file de recrutement, écart entre unités, portée de « soutien » en mêlée |
| `bases` | PV de ta base, puissance et portée de ta tourelle |
| `units` | pour chaque unité : coût, PV, dégâts, cadence, portée, vitesse, recharge, bonus de type, niveau de déblocage |
| `spells` | mortier et kit de soins : dégâts, rayon, recharge, niveau de déblocage |
| `stars` | pièces détachées gagnées par étoile et à la première victoire |
| `workshop` | atelier : coûts des 5 niveaux et effet de chaque amélioration |
| `ai` | comportement commun de l'ordinateur : contres, durée max d'économie, profils d'amélioration du revenu |
| `levels` | pour chacun des 10 niveaux : objectifs d'étoiles (`objectives`), PV du nid, revenu de l'IA (`aiIncomeMult`), sa ferraille de départ, son tentacule, ses unités et leurs poids, ses vagues, ses boss |

**Étoiles** : 1 étoile pour la victoire + 1 par objectif rempli. Chaque niveau a deux objectifs
dans `levels[].objectives` (types : `time` = gagner en moins de X secondes, `losses` = perdre au plus
X unités, `baseHp` = garder au moins X % des PV de sa base).

Exemples :
- Rendre le Pillard moins cher : `units.pillard.cost: 50` → `40`.
- Rendre le niveau 10 plus facile : baisser `aiIncomeMult` du niveau 10 (c'est le levier le plus fort).
- Gagner plus de pièces : augmenter `stars.partsPerStar`.

### Difficulté actuelle (première passe d'équilibrage)
Mesurée avec un joueur automatique efficace (vagues d'unités, défense, sorts) :
- niveaux 1 à 5 : gagnables sans passer par l'atelier ;
- niveaux 6 et 7 : environ une victoire sur deux sans atelier ;
- niveaux 8 à 10 : **l'atelier devient nécessaire** (presque aucune victoire sans amélioration).

---

## 3. Mettre en ligne

### GitHub Pages (déjà en place)
1. Envoie (« push ») tes modifications sur la branche `main` du dépôt.
2. Une à deux minutes plus tard, la nouvelle version est en ligne.
3. Réglage (à faire une seule fois) : dépôt → **Settings** → **Pages** → *Deploy from a branch* → `main` / `(root)`.

### Netlify
Sur https://app.netlify.com/drop, glisse-dépose le dossier du jeu. C'est en ligne.

### ⚠ Le cache des navigateurs
Les navigateurs gardent les fichiers en mémoire quelques minutes. Pour être sûr que tout le monde
reçoit ta nouvelle version, **augmente le numéro de version** des fichiers : remplace partout
`?v=10` par `?v=11` (dans `index.html` et dans tous les fichiers de `src/`, avec un
« rechercher / remplacer dans les fichiers » de ton éditeur). Pour un simple test, ouvre la page
en **navigation privée**.

---

## 4. Sauvegarde

La progression (niveaux, étoiles, pièces, atelier, réglages) est enregistrée automatiquement
dans le navigateur (`localStorage`), après chaque partie et chaque achat.
Pour repartir de zéro : **Options → Effacer la sauvegarde**.

---

## 5. Organisation des fichiers

```
index.html, style.css     page et mise en forme
src/config.js             TOUTES les valeurs d'équilibrage
src/main.js               démarrage, écrans, boucle de jeu
src/save.js, progress.js  sauvegarde, étoiles, pièces, atelier
src/game/                 règles du jeu : unités, bases, projectiles, sorts, IA, effets
src/render/               dessin : décors, bases, unités (sprites.js)
src/ui/                   interface : HUD, menus, carte, atelier, tutoriel, entrées
src/audio/sfx.js          sons synthétisés
```
