// Sauvegarde dans le navigateur (localStorage).
// Si le stockage est indisponible (navigation privée stricte, stockage plein…),
// le jeu fonctionne quand même : on garde simplement les valeurs en mémoire.
// Étape 3 : réglages uniquement. Étape 4 : progression (niveaux, étoiles, atelier).

const KEY = 'dernier-bastion-save-v1';

const DEFAULTS = {
  settings: { sound: true, shake: true, speedIndex: 0 },
  progress: {},
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

export function loadSave() {
  const data = clone(DEFAULTS);
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return data;
    const saved = JSON.parse(raw);
    Object.assign(data.settings, saved.settings || {});
    Object.assign(data.progress, saved.progress || {});
  } catch (e) {
    // Sauvegarde illisible ou stockage bloqué : on repart des valeurs par défaut
  }
  return data;
}

export function writeSave(data) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}
