# Bande-annonce de Dernier Bastion

Vidéo de 36 s (1920 × 1080) faite avec [Remotion](https://www.remotion.dev). Les plans de combat
utilisent le **vrai moteur et le vrai rendu du jeu** (`../src`), pilotés par une mise en scène.

- `bande-annonce.mp4` : la vidéo, prête à partager.
- `src/Composition.tsx` : découpage, textes, titre, carton de fin, musique.
- `src/sim.js` : les 3 plans de jeu (défense du fort, contre-attaque dans la neige, assaut du Nid).
- `public/music.mp3` : la musique, générée avec le synthétiseur du jeu.

## Refaire la vidéo

```bash
npm i
npx remotion studio          # aperçu dans le navigateur
npx remotion render BandeAnnonce out/bande-annonce.mp4
```
