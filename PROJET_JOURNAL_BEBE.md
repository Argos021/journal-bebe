# Journal Bébé — Documentation du projet

## 📋 Vue d'ensemble

**Journal Bébé** est une PWA (Progressive Web App) React permettant de suivre quotidiennement les activités d'un bébé : boires, couches, croissance, tire-lait et rendez-vous médicaux.

- **Repo GitHub** : github.com/Argos021/journal-bebe
- **Déploiement** : Vercel — https://journal-bebe.vercel.app (branche `main`)
- **Backend** : Firebase Firestore (base de données temps réel, publique)
- **Version actuelle** : 1.7.2
- **Stack** : React + Vite, pas de CSS externe (styles inline en JS)

---

## 🗂️ Structure des fichiers

```
src/
├── App.jsx                    (~595 lignes) — composant racine, état global, Firebase listeners, modals
├── firebase.js                — config et initialisation Firebase
├── main.jsx                   — point d'entrée React
├── helpers.js                 — fonctions utilitaires (dates, durées, etc.)
├── constants.js               — APP_VERSION, tables OMS, styles partagés
└── components/
    ├── ui.jsx                 — composants UI réutilisables (SectionCard, Label, Tag, DaySummary, etc.)
    ├── FeedingCard.jsx         — cartes d'affichage Boire + Couche
    ├── ProfileTab.jsx          — onglet Profil bébé
    ├── JournalTab.jsx          — onglet Journal (liste + graphique + stats)
    ├── TireLaitTab.jsx         — onglet Tire-Lait
    ├── GrowthTab.jsx           — onglet Croissance (graphique OMS)
    └── SanteTab.jsx            — onglet Santé / Rendez-vous
```

### Détails par fichier

**`helpers.js`** — Fonctions pures :
- `formatDuration`, `formatTime`, `formatDate`, `formatDateShort`
- `getNextFeedingTime`, `todayStr`, `getNow`, `timeSince`

**`constants.js`** :
- `APP_VERSION` — version affichée dans l'onglet Options (⚠️ à bumper à chaque modification, voir convention plus bas)
- `HOURS_OPTIONS`, `MINUTES_OPTIONS` — options des sélecteurs de durée
- `inputStyleBase`, `btnPrimaryBase`, `btnSecondaryBase` — styles de boutons/inputs partagés
- Tables OMS (poids/taille/périmètre crânien, filles/garçons, 0-24 mois) + `whoInterpolate()` + `getWhoTable()`

**`components/ui.jsx`** :
- `SectionCard`, `Label`, `Tag`, `ToggleBtn`, `ActionBtn`, `btnOptionStyle` — petits composants génériques
- `DaySummary` — résumé d'une journée (badges : boires, pipi, caca, ml, vitamine D, etc.)
- `NextFeedingProgress` — barre de progression "prochain boire" (actuellement dans l'onglet Laboratoire)

**`components/FeedingCard.jsx`** :
- `CoucheCard` — carte d'un changement de couche
- `FeedingCard` — carte d'un boire (sein, compléments, soins, notes)

**`components/ProfileTab.jsx`** — Onglet Profil :
- Vue lecture + mode édition
- Infos : prénom, date/heure de naissance, sexe, type d'alimentation, mesures de naissance (poids/taille/périmètre crânien)
- Calcul automatique de l'âge (affichage adaptatif : jours → semaines → mois → années)

**`components/JournalTab.jsx`** — Onglet Journal (le plus complexe) :
- Minuterie de boire (chrono start/pause/reset)
- Liste des boires/couches groupés par jour, avec navigation par mois
- 3 modes d'affichage : `auto` (replie les jours après les 2 plus récents), `libre` (replie manuellement), `resume` (tout replié)
- Panneau de statistiques (mensuel + global) : nombre de boires, pipi, caca, ml maternel/commercial, régurgitations
- Graphique bicolore (maternel vs commercial) avec 3 modes : Mois / Jour / Année

**`components/TireLaitTab.jsx`** — Onglet Tire-Lait :
- Même structure que Journal mais pour les sessions de tire-lait (quantité en ml)
- Stats mensuelles + globales, graphique Mois/Jour/Année

**`components/GrowthTab.jsx`** — Onglet Croissance :
- `GrowthLineChart` — graphique SVG interactif (zoom pinch/molette, pan, tooltip au clic)
- Courbes de référence OMS (percentiles P3/P15/P50/P85/P97) superposables
- Suivi poids (g/lb), taille (cm/pi-po), périmètre crânien (cm)
- Vue Graphique ou Liste

**`components/SanteTab.jsx`** — Onglet Santé :
- Gestion des rendez-vous médicaux (pédiatre, vaccin, CLSC, urgence, etc.)
- Système d'urgence visuel (à venir / aujourd'hui / en retard / complété)
- Export `.ics` pour ajouter au calendrier
- Alertes pour rendez-vous dans les 3 prochains jours

---

## 🔥 Firebase — Collections Firestore

| Collection | Description |
|---|---|
| `feedings` | Boires (`_type` absent) et couches (`_type: "couche"`) |
| `tireLait` | Sessions de tire-lait |
| `growth` | Mesures de croissance |
| `appointments` | Rendez-vous médicaux |
| `config/profile` | Document unique — profil de bébé |
| `config/settings` | Document unique — préférences (mode sombre, nom) |

### Structure d'un document `feedings` (boire)
```js
{
  date: "2026-06-09", time: "14:30",
  durationH: 3, durationM: 0,
  seinPremier: "gauche" | "droite" | null,
  complMaternel: "30", complCommercial: "0",
  pipi: false, caca: false,
  vitamineD: false, nombril: false, yeux: false,
  regurgi: 0,
  note: "",
  horsSequence: false,       // si true, n'affecte pas le calcul du prochain boire
  horsSequenceNbBoire: false // si true, n'est pas compté dans le total de boires du jour
}
```

### Structure d'un document `feedings` (couche)
```js
{
  _type: "couche",
  date: "2026-06-09", time: "14:30",
  pipi: true, caca: false,
  note: ""
}
```

---

## 📐 Conventions importantes

### Versioning
`APP_VERSION` dans `constants.js` doit être bumpé à chaque modification :
- **Patch** (1.x.y → 1.x.y+1) : correction de bug
- **Minor** (1.x → 1.x+1.0) : nouvelle fonctionnalité
- **Major** (x.0.0) : refactor majeur

### Style
- Pas de fichiers CSS — tout en styles inline JS (`style={{...}}`)
- Mode sombre géré via une prop `dark` (booléen) passée à travers tous les composants, avec des couleurs conditionnelles `dark ? "..." : "..."`
- Police : `Georgia, serif` partout

### Workflow Git
- Branche principale : `main` (déployée automatiquement sur Vercel)
- Pour les changements importants, créer une branche, tester sur l'URL de preview Vercel, puis merger vers `main`

---

## 🕓 Historique récent

- **v1.6.2 → multi-fichiers** : refactor complet d'un `App.jsx` monolithique de 3132 lignes en architecture multi-fichiers (10 fichiers)
- **v1.7.0** : ajout du bouton "🔀 Hors séquence" — permet d'ajouter un boire sans affecter le calcul du minuteur du prochain boire
- **v1.7.1** : quand "Hors séquence" est activé, la durée du boire passe automatiquement à 0h00 (pour ne pas afficher de minuteur sur la carte principale) ; revient à 3h00 si désactivé
- **v1.7.2** : ajout d'un second bouton "🚫 Ne compte pas dans les boires de la journée" (visible seulement si Hors séquence est activé) — exclut le boire du compteur quotidien tout en gardant ses autres stats

---

## 💡 Notes pour Claude Code

- L'app utilise des **listeners Firestore temps réel** (`onSnapshot`) — toute modification de données se reflète automatiquement dans l'UI
- Les composants reçoivent énormément de props depuis `App.jsx` (theme, handlers, données) — c'est voulu pour garder la logique centralisée
- Pas de routing classique : navigation par état (`tab`) + synchronisation avec `window.location.hash`
- L'onglet "Laboratoire" (`tab === "lab"`) sert de bac à sable pour tester de nouvelles fonctionnalités avant intégration définitive
