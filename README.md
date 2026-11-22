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
| Recruter | clic sur le bouton, ou touches **1 à 7** | toucher le bouton |
| Sorts | **Q** (mortier), **W** (soins), puis clic pour viser | toucher le sort, puis toucher le champ de bataille |
| Défiler | molette, flèches, **A / D**, glisser, bord de l'écran | glisser le doigt, toucher la mini-carte |
| Capacité du commandant | **E** | toucher son portrait |
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
| `workshop` | atelier : coûts des 10 niveaux et effet de chaque amélioration |
| `heroes` | commandants : stats, auras, capacités, coût en étoiles de chaque niveau, délais d'arrivée et de retour |
| `survival` | mode Survie : rythme et taille des vagues, hausse des PV/dégâts, boss, score, pièces, cartes bonus |
| `chapters` | les 2 chapitres de la campagne (onglets de la carte) : nom, premier et dernier niveau |
| `ai` | comportement commun de l'ordinateur : contres, durée max d'économie, profils d'amélioration du revenu |
| `levels` | pour chacun des 20 niveaux : objectifs d'étoiles (`objectives`), PV du nid, revenu de l'IA (`aiIncomeMult`), sa ferraille de départ, son tentacule, ses unités et leurs poids, ses vagues, ses boss |

**Étoiles** : 1 étoile pour la victoire + 1 par objectif rempli. Chaque niveau a deux objectifs
dans `levels[].objectives` (types : `time` = gagner en moins de X secondes, `losses` = perdre au plus
X unités, `baseHp` = garder au moins X % des PV de sa base).

Exemples :
- Rendre le Pillard moins cher : `units.pillard.cost: 50` → `40`.
- Rendre le niveau 10 plus facile : baisser `aiIncomeMult` du niveau 10 (c'est le levier le plus fort).
- Gagner plus de pièces : augmenter `stars.partsPerStar`.

### Commandants (héros)
Dans **Atelier › Héros**, on choisit un commandant (Sergent Kane, Mécano Rosa, Doc Vasquez) et on
l'améliore avec les **étoiles** gagnées dans la campagne (60 au maximum). En partie, il arrive seul
après 10 s, revient 45 s après sa mort, et sa capacité se lance avec son portrait (touche **E**).

### Mode Survie
Débloqué après le niveau 5 (bouton **MODE SURVIE** en bas à droite de la carte). Décor de nuit,
ta base contre des vagues sans fin : une vague toutes les 30 s, sans pause, de plus en plus
nombreuses et résistantes. Une vague spéciale toutes les 5, un boss toutes les 10 ; chaque boss
vaincu propose **3 cartes bonus** (on en choisit une pour la partie). Score, record, pièces par
vague tenue et bonus aux paliers. Tout se règle dans la section `survival` de `config.js`.

### Difficulté et durée de vie
- **Campagne de 20 niveaux en 2 chapitres** : *Les Terres mortes* (1 à 10) puis *Le Fléau* (11 à 20),
  de plus en plus durs. 3 étoiles par niveau.
- **Atelier sur 10 niveaux** : impossible de tout maximiser en une seule campagne.
- **Chapitre 2** : nouvelles unités **Lance-roquettes** (niveau 11, perce les blindages, ×2,5 contre
  les lourds) et **Mitrailleur lourd** (niveau 13, fauche nuées et volants). Nouveaux mutants :
  **Carapace** (11, les balles ne lui font que 40 %), **Épineux** (12, tire plus loin que les Tireurs),
  **Couveuse** (13, libère 4 larves en mourant), **Hurleur** (16, son cri accélère et renforce les
  mutants proches). Boss : **Matriarche** (15, pond des larves) et **le Fléau** (20, enrage deux fois).
- **Mutants spécialisés** : le **Cracheur** ronge les blindés (×2), le **Chien** fonce sur les tireurs,
  le **Rouilleur** (dès le niveau 4) explose sur les blindés, le **Charognard ailé** (dès le niveau 6)
  survole la mêlée pour attaquer les tireurs — seuls les Tireurs, la tourelle et le mortier le touchent.
  Une armée d'un seul type ne suffit plus.

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
`?v=18` par `?v=19` (dans `index.html` et dans tous les fichiers de `src/`, avec un
« rechercher / remplacer dans les fichiers » de ton éditeur). Ce numéro sert aussi à
l'application installée : elle télécharge la nouvelle version au lancement suivant.
Le même numéro s'affiche en bas de l'écran titre (« Bêta 0.18 » pour `?v=18`) : c'est le moyen
de vérifier qu'une mise à jour est bien arrivée.
Pour un simple test, ouvre la page en **navigation privée**.

---

### Application installable (hors connexion)
Le jeu peut s'installer sur l'écran d'accueil comme une appli (bouton **INSTALLER** de l'écran
titre ; sur iPhone : « Partager » → « Sur l'écran d'accueil »). Il s'ouvre alors en plein écran
et fonctionne **sans internet**. Fichiers concernés : `manifest.webmanifest` (nom, icône,
orientation), `sw.js` (copie hors connexion ; si tu ajoutes un fichier dans `src/`, ajoute-le
aussi à la liste `FILES` de `sw.js`) et `icons/` (icônes, générées par `tools/make-icons.html`).

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
