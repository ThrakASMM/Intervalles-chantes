# Intervalles chantés — ASMM

Application autonome dans `index.html`, publiée sur GitHub Pages. Les sons et images sont intégrés.

## Test classé

- 20 notes de départ, quatre clics de préparation, une pulsation piano puis une réponse chantée.
- Un Top 5 pour chacun des 12 intervalles et chaque sens. Un profil de navigateur conserve un pseudo fixé au premier enregistrement ; une seule place par pseudo, son meilleur résultat. Pas de remise à zéro hebdomadaire.
- Octave libre, pour l’entraînement et le test. Clavier, modèle, noms de notes et changements de réglages bloqués pendant le test. Arrêt, perte du micro, changement d’onglet ou interruption audio invalident la tentative.
- Justesse : maximum 10 000 points, moyenne des écarts absolus, après réduction à l’octave. Pleins points jusqu’à 30 cents, diminution progressive jusqu’à zéro à 100 cents. Moins de trois mesures réduit le crédit ; silence = zéro.
- Rapidité : maximum 2 000 points, délai depuis la note du piano jusqu’au début d’une réponse juste confirmée par trois mesures sur au moins 90 ms. Bonus pondéré par la qualité moyenne de la note.
- Écarts : maximum 1 000 points sur les 19 transitions, pondérés par la justesse. Distance entre classes de hauteurs (0–6 demi-tons) : une octave seule n’ajoute aucune difficulté lorsque l’octave est libre.
- Notes absentes : zéro dans la note sur 20 ; écart moyen affiché calculé sur les notes détectées, avec leur nombre indiqué. Le bilan détaille les 20 réponses.

Le résultat terminé est conservé localement et peut être renvoyé après une erreur réseau avec le même identifiant. Le bouton Enregistrer partage le pseudo et les résultats dans le Top public. Aucun audio n’est enregistré ou envoyé ; seules les mesures de hauteur et de temps servent à recalculer le score côté serveur. Le serveur conserve les agrégats, pas les séries de mesures.

Service commun (tables et routes séparées d’ET3) : `https://et3-scores-classe.asmm-1896.chatgpt.site/api/singing/`. C’est un classement pédagogique basé sur des mesures client, sans authentification forte d’une personne ni garantie anti-triche. Le profil reste propre au navigateur ; ne pas effacer son stockage pour conserver le pseudo.

## Développement

`src/test-score.js` est la source commune du barème ; sa copie dans le service doit rester identique. `src/test-ui.js` gère bilan, profil, stockage et Top. `node scripts/build.mjs` les intègre dans la page autonome. Le reste de l’application est maintenu dans `index.html`. Ne jamais écraser les sons intégrés depuis l’ancien prototype.

`pnpm install` puis `pnpm build` et `pnpm test`. Les tests utilisent des signaux, un micro et un serveur simulés ; ils ne créent aucun résultat dans le classement public. Vérifier avec un casque et une voix réelle pour évaluer l’acoustique d’un appareil.
