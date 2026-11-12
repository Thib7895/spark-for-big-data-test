# ⚡ Quiz Big Data — Spark · Hadoop · Calcul distribué

Application web de quiz interactif pour réviser le cours de Big Data
(8 chapitres : introduction datalake, Spark, NoSQL vs OLTP, histoire du calcul
distribué, pannes & résilience, écosystème Hadoop, Hive MetaStore, Parquet).

## Lancer l'app

Aucune installation, aucune dépendance : ouvrir simplement **`index.html`** dans un navigateur
(double-clic sur le fichier, ou `File > Open`). Ça marche aussi en servant le dossier :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Fonctionnalités

- **76 questions** réparties sur les **8 chapitres** du cours (QCM simple, QCM multiple, vrai/faux),
  chacune avec une **explication pédagogique** affichée après la réponse.
- **Répétition espacée** : une question ratée est automatiquement remise en fin de série.
- **4 modes de jeu** : Tout réviser · Par chapitre · Questions ratées · Mode examen (30 s/question, chronométré).
- **Fiches de révision** (📖) : résumé des points clés de chaque chapitre.
- **Statistiques persistées** (localStorage) : progression globale et par chapitre, records perso,
  liste des questions ratées à retravailler, meilleure série (🔥).
- **Raccourcis clavier** : `1`–`9` pour choisir une réponse, `Entrée` pour valider / passer à la suivante.
- Mélange des questions et des options à chaque partie. Confettis si ≥ 80 % 🎉

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure des 3 écrans (accueil, quiz, résultats) + modale « fiche » |
| `styles.css` | Thème sombre, responsive, animations |
| `questions.js` | Banque de données : chapitres (résumés) + 76 questions avec explications |
| `app.js` | Moteur du quiz : sessions, scoring, répétition espacée, timer, statistiques |

## Modifier / ajouter des questions

Éditer `questions.js` : chaque question est un objet

```js
{ id: "ex1", ch: "spark", type: "qcm",           // "qcm" | "multi" | "vf"
  q: "La question ?",
  options: ["A", "B", "C", "D"],
  answer: 1,                                      // index (ou tableau d'index pour "multi")
  explain: "Explication affichée après la réponse." }
```

`ch` doit être l'`id` d'un chapitre défini dans `CHAPTERS` (la fiche de révision se trouve dans `summary`).
