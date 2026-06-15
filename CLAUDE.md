# Journal Bébé — Contexte pour Claude Code

> Ce fichier est lu automatiquement au démarrage de Claude Code. Il contient le
> contexte de travail et les décisions prises avec Nicolas. La doc complète de
> l'app (architecture, fichiers, Firebase) est dans **PROJET_JOURNAL_BEBE.md**.

## Langue
- **Toujours répondre en français.**

## Le projet en bref
- PWA React + Vite (styles inline en JS, pas de CSS externe, police `Georgia, serif`).
- Backend Firebase Firestore (temps réel, `onSnapshot`).
- Suivi quotidien d'un bébé : boires, couches, croissance, tire-lait, rendez-vous.
- Repo : github.com/Argos021/journal-bebe — Déploiement auto sur Vercel (branche `main`).
- Emplacement local : `E:\Claude_App\journal-bebe`.
- Doc détaillée : voir **PROJET_JOURNAL_BEBE.md**.

## Workflow de travail (décidé avec Nicolas)
- **Workflow B — preview local activé.** Nicolas veut voir ses changements en
  direct sur `localhost` avant de pousser.
  - `npm install` (une fois) → `npm run dev` → tester sur localhost → `git push`
    quand satisfait → Vercel redéploie tout seul.
- Claude modifie directement les fichiers ; **Nicolas fait les `git push`** lui-même.
- Pour les changements importants : envisager une branche + preview Vercel avant
  de merger dans `main` (voir conventions dans PROJET_JOURNAL_BEBE.md).

## Conventions importantes
- **🎨 Style visuel : respecter `IDENTITE_VISUELLE.md`** (palette, police Georgia,
  couleurs sémantiques, composants). À lire avant toute modif d'UI. Réutiliser les
  patterns existants (`SectionCard`, `Tag`, `ToggleBtn`, `Label`, dégradés) plutôt
  que d'introduire de nouveaux styles.
- **`APP_VERSION` dans `src/constants.js` à bumper à chaque modification** :
  patch = bugfix, minor = nouvelle fonctionnalité, major = refactor.
- Mode sombre : prop `dark` (booléen) passée à travers tous les composants,
  couleurs conditionnelles `dark ? "..." : "..."`.
- L'onglet « Laboratoire » (`tab === "lab"`) = bac à sable pour tester avant
  intégration définitive.

## État du setup (terminé le 2026-06-14)
- [x] `npm install` — fait (450 packages).
- [x] Renommé `gitignore` → `.gitignore`.
- [x] Firebase : config en dur dans `src/firebase.js`, déjà committée, rien à recréer
      (normal pour Firebase web ; la sécurité passe par les règles Firestore).
- [x] `npm run dev` testé → preview local OK sur http://localhost:5173.

### Particularités d'environnement (machine de Nicolas)
- **Certificat TLS** : l'antivirus/proxy inspecte le HTTPS, donc `npm install`
  échouait avec `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Réglé via la variable
  d'environnement **utilisateur** `NODE_OPTIONS=--use-system-ca` (persistante,
  vaut aussi pour FamilyHub).
- **Verrou de cache npm** : journal-bebe et FamilyHub se disputaient le cache npm
  global (install figé ~13 min). Réglé via `.npmrc` → `cache=.npmcache` (cache
  local au projet, ignoré par Git).

## Note sur la séparation des projets
- Ce projet est **distinct** de FamilyHub (un autre projet de Nicolas).
- Les deux se travaillent en parallèle dans **deux fenêtres VS Code séparées**,
  chacune avec sa propre session Claude Code et sa propre mémoire. Ne pas mélanger.
