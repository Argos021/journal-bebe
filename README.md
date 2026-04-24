# 🍼 Journal Bébé

Application de suivi des boires, couches, croissance et rendez-vous de bébé.
Synchronisée en temps réel entre deux téléphones via Firebase.

---

## 🚀 Déploiement sur Vercel (première fois)

### 1. Mettre le code sur GitHub
- Va sur ton dépôt GitHub `journal-bebe`
- Clique **"uploading an existing file"** ou utilise GitHub Desktop
- Ajoute tous les fichiers de ce dossier

### 2. Connecter Vercel à GitHub
- Va sur **vercel.com** → **"Add New Project"**
- Connecte ton compte GitHub
- Sélectionne le dépôt `journal-bebe`
- Vercel détecte automatiquement Vite
- Clique **"Deploy"**
- En 2 minutes tu as une URL comme `https://journal-bebe.vercel.app`

### 3. Ouvrir sur les téléphones
- Ouvre l'URL sur **iPhone** dans **Safari**
- Clique le bouton Partager → **"Sur l'écran d'accueil"**
- Sur **Android** dans Chrome → menu ⋮ → **"Ajouter à l'écran d'accueil"**
- L'icône 🍼 apparaît comme une vraie app !

---

## 🔄 Mettre à jour l'app

Pour toute modification future :
1. Modifie les fichiers
2. Pousse sur GitHub (git push ou upload)
3. Vercel redéploie automatiquement en 1-2 minutes
4. L'app sur vos téléphones se met à jour automatiquement

---

## 📦 Structure du projet

```
journal-bebe/
├── src/
│   ├── App.jsx          ← Application principale
│   ├── firebase.js      ← Configuration Firebase
│   └── main.jsx         ← Point d'entrée React
├── index.html           ← HTML principal
├── vite.config.js       ← Config build + PWA
├── package.json         ← Dépendances
└── firestore.rules      ← Règles de sécurité Firebase
```

---

## 🛠 Développement local

```bash
npm install
npm run dev
```

Ouvre http://localhost:5173
