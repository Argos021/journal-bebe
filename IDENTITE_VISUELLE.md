# 🎨 Identité visuelle — Journal Bébé

> **Règle d'or pour Claude Code :** toute nouvelle fonctionnalité ou modification
> doit respecter les couleurs et styles existants. **Réutiliser les patterns déjà
> en place** (`SectionCard`, `Tag`, `ToggleBtn`, `Label`, dégradés de boutons)
> plutôt qu'introduire de nouveaux styles. Cohérence avant originalité.

## Ambiance générale
Douce, chaleureuse, « pastel bébé » — tons pêche / corail / rose. **Jamais
agressif ou clinique.**

## Police
**`Georgia, serif` partout** — titres, textes, boutons, inputs. Ne jamais passer
à une police sans-serif.

## Palette — mode clair
| Rôle | Couleur |
|---|---|
| Fond général | `#fdf6f0` (crème très pâle) |
| Cartes | `#fff` (blanc) |
| Texte principal | `#7a3b1e` (brun chaud) |
| Texte secondaire | `#b05a30` (brun-orange) |
| Bordures | `#e8c5a8` (beige pêche) |
| Accent / boutons primaires | dégradé `linear-gradient(135deg, #e8906a, #e06b8a)` (pêche → rose) |
| Header | dégradé `linear-gradient(135deg, #f5c6a0 0%, #f9a8c0 100%)` |

## Palette — mode sombre
| Rôle | Couleur |
|---|---|
| Fond général | `#1a1a2e` (bleu-violet très foncé) |
| Cartes | `#2a2a3e` |
| Texte principal | `#f5c6a0` (pêche clair) |
| Texte secondaire | `#b05a30` |
| Bordures | `#3a3a5e` |
| Accent rose | `#f48fb1` |
| Header | dégradé `linear-gradient(135deg, #2a1a3e 0%, #1a2a3e 100%)` |

## Couleurs sémantiques par section
À garder cohérentes dans tout le projet (format : clair / pastel — sombre) :

| Élément | Couleurs |
|---|---|
| 🤱 Maternel | rose `#c2185b` / `#f9c6d8` — sombre `#f48fb1` |
| 🏭 Commercial | bleu `#1565c0` / `#bbdefb` — sombre `#90caf9` |
| 🍼 Réellement bu | vert `#2e7d32` / badge `#c8e6c9` — sombre `#a5d6a7` |
| ♻️ Gaspillage (offert − bu) | orange `#ff9800` |
| 💧 Pipi | bleu `#1565c0` / `#ddeeff` |
| 💩 Caca | orange `#e65100` / `#fdebd0` |
| 🤮 Régurgi | jaune `#f57f17` / `#fffde7` |
| 🫧 Nombril | vert `#2e7d32` / `#e8f5e9` |
| 👁️ Yeux | violet `#6a1b9a` / `#f3e5f5` |
| ☀️ Vitamine D | jaune `#ffe082` |
| 🍼 Tire-Lait | bleu `#1565c0` / `#42a5f5` |
| 📏 Croissance | Poids vert `#2e7d32` · Taille bleu `#1565c0` · Crâne violet `#6a1b9a` |
| 🔀 Hors séquence | orange `#ff9800` |
| 🚫 Exclusion du compteur | violet `#9c27b0` |
| 🏥 Santé / urgence | rouge `#e53935` (urgent) · vert `#4caf50` (ok) · jaune `#ffc107` (bientôt) |

## Style des composants
- **Coins très arrondis** : `borderRadius: 12-16px` pour les cartes, `20px+` pour
  les badges / boutons pill.
- **Ombres douces** : `box-shadow: 0 2px 12px rgba(0,0,0,0.07)`.
- **Badges / tags** : pilules avec emoji + texte, fond pastel, texte foncé en gras.
- **Boutons d'action** (✏️ 🗑️) : carrés arrondis `32×32px`, fond pastel léger.
- **Modals** : tiroir qui glisse du bas (`borderRadius: "24px 24px 0 0"`), overlay
  `rgba(0,0,0,0.45)`.
- **Emojis utilisés systématiquement comme icônes** — pas de librairie d'icônes.
