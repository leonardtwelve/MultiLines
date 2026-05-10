#!/usr/bin/env bash
# scripts/seed-backlog.sh
#
# Crée le backlog M1+M2 du chantier game design Casse Lune :
# - Labels : m1, m2, core, adventure:banque-lune, spec/game-design, dev (idempotent via --force)
# - Milestones : M1, M2 (créés s'ils n'existent pas)
# - 10 issues spec/game-design (en M2)
# - 9 issues dev en M1
# - 8 issues dev en M2 (la plupart bloquées par des specs)
#
# Idempotence : ne re-seede pas si les issues existent déjà (détection par titre).
#
# Pré-requis : gh CLI installé et authentifié sur leonardtwelve/MultiLines.

set -euo pipefail

R="leonardtwelve/MultiLines"

# --- Pré-requis ---
command -v gh >/dev/null || { echo "gh CLI requis" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh CLI non authentifié" >&2; exit 1; }

# --- Garde idempotence ---
if gh issue list --repo "$R" --state all --search "in:title [spec] Mécanique détaillée du Pacte secret" --json title --limit 1 | grep -q "Pacte secret"; then
  echo "Backlog déjà seedé (issue 'Pacte secret' détectée). Sortie." >&2
  exit 0
fi

BODIES=$(mktemp -d)
trap "rm -rf $BODIES" EXIT

# ============================================================================
# A. Labels (idempotent via --force)
# ============================================================================
echo "→ Setup labels..."
gh label create "m1"                      --repo "$R" --color "1d3557" --description "Jalon foundation tech"           --force >/dev/null 2>&1 || true
gh label create "m2"                      --repo "$R" --color "7209b7" --description "Jalon vertical slice"            --force >/dev/null 2>&1 || true
gh label create "core"                    --repo "$R" --color "2d6a4f" --description "Touche src/core/"                --force >/dev/null 2>&1 || true
gh label create "adventure:banque-lune"   --repo "$R" --color "3affc7" --description "Touche l'aventure Banque Lune"   --force >/dev/null 2>&1 || true
gh label create "spec/game-design"        --repo "$R" --color "ffc83a" --description "Spec game design (pas de code)"  --force >/dev/null 2>&1 || true
gh label create "dev"                     --repo "$R" --color "6b7280" --description "Issue de dev exécutable"         --force >/dev/null 2>&1 || true

# ============================================================================
# B. Milestones (créés si absents)
# ============================================================================
echo "→ Setup milestones..."
for ms in M1 M2; do
  if ! gh api "repos/$R/milestones?state=all" --jq '.[].title' 2>/dev/null | grep -qx "$ms"; then
    gh api "repos/$R/milestones" -f title="$ms" >/dev/null
    echo "   créé : $ms"
  else
    echo "   existe : $ms"
  fi
done

# ============================================================================
# C. Bodies des issues (générés en temp)
# ============================================================================

# --- 10 SPEC/GAME-DESIGN ---

cat > "$BODIES/spec-pacte.md" <<'EOF'
## Contexte
Le Négociateur·rice peut proposer un **Pacte secret** à un autre joueur via son action emblématique (voir `docs/GAMEPLAY.md §5` Négociateur Action 3). Le pacte est tracké par le système et a des conséquences au bilan final selon qu'il est tenu ou rompu.

La mécanique précise reste à concevoir.

## Questions ouvertes
- Quels **types de pactes** sont possibles ? (« Si on vote tous deux Loyal, je te donne X » / « Si tu votes Trahir contre Y, je te file 2 Crédits » / autres)
- Comment le système **trace l'engagement** ? Stockage côté store, validation au vote ?
- Conséquences précises d'un pacte **tenu vs rompu** (bonus/malus en Crédits ? Dossiers ? part de butin ?)
- Le pacte est-il **révélé** au bilan, ou reste-t-il privé entre les deux signataires ?
- Limite du **nombre de pactes** par partie (par joueur ? globalement) ?
- Le destinataire peut-il **refuser** le pacte ?

## Livrables attendus
- [ ] Définition du contrat `Pacte` (champs : émetteur, cible, type, condition, contrepartie, expiration)
- [ ] Liste typée des pactes possibles (≥4 types représentatifs)
- [ ] Pseudo-code de validation/résolution au moment du vote
- [ ] Table des conséquences tenu/rompu chiffrées
- [ ] 2-3 exemples narratifs de partie

## Sizing
T-shirt : **M**

Refs : `docs/GAMEPLAY.md §5` (Négociateur), `docs/DECISIONS.md G1+G3`.
EOF

cat > "$BODIES/spec-de.md" <<'EOF'
## Contexte
G2 (`docs/DECISIONS.md`) a tranché le principe : choix d'action déterministe + dé de risque sur la réussite, modifié par capacité, équipement, contexte, jauge d'alerte. Trois résultats : succès / succès partiel / échec.

Reste à **chiffrer** la grille complète (voir `docs/GAMEPLAY.md §4`).

## Questions ouvertes
- Type de dé : **d6** (simple, tactile) ou **d12** (granularité plus fine) ?
- Pondération des modificateurs : combien pèse une capacité passive ? un niveau de jauge d'alerte ? un équipement (M2+) ?
- Coût exact du **boost en Crédits** (1 Crédit pour +1 ? ou pour relance ? les deux à coûts différents ?)
- Seuils succès / succès partiel / échec (et comment ils bougent avec le risque déclaré faible/moyen/élevé)
- Le **succès partiel** se traduit comment ? (alerte +1, perte 1 Crédit, à choix du joueur ?)

## Livrables attendus
- [ ] Choix du type de dé + justification (1-2 lignes)
- [ ] Table de modificateurs en chiffres absolus (capacité, équipement, contexte, alerte)
- [ ] Tables de seuils par niveau de risque (faible/moyen/élevé)
- [ ] Coûts de boost (relance vs +1)
- [ ] 3-5 exemples pédagogiques de résolution complète

## Sizing
T-shirt : **M-L**

Refs : `docs/GAMEPLAY.md §4`, `docs/DECISIONS.md G2`.
EOF

cat > "$BODIES/spec-objectifs.md" <<'EOF'
## Contexte
G4 acte que chaque joueur reçoit un objectif privé légèrement tordu en début d'acte 1 (voir `docs/GAMEPLAY.md §6.1`). Sa réussite donne un bonus de butin individuel ou un effet narratif.

Pour la **rejouabilité**, il faut **≥30 objectifs** distincts.

## Questions ouvertes
- **Catégories** d'objectifs : butin / Crédits / Dossiers / Pactes / actions / cible joueur ? Combien par catégorie ?
- **Anti-configurations injouables** : 2 joueurs ne peuvent pas avoir des objectifs incompatibles (ex : « finis avec le plus de Crédits » + « finis avec le plus de Crédits »).
- **Règles de tirage** : totalement aléatoire ? avec contraintes (au moins X catégories différentes en partie) ?
- Chaque objectif doit être **vérifiable mécaniquement** par le moteur en fin de partie — quels sont les bons predicates ?
- **Bonus narratif/butin** associé : forfait identique pour tous, ou variable selon difficulté de l'objectif ?

## Livrables attendus
- [ ] Liste de **≥30 objectifs** typés (id, label, predicate, catégorie, difficulté)
- [ ] Algorithme de distribution (anti-conflit)
- [ ] Test cases d'incompatibilité connue
- [ ] Bonus narratif/butin associé à chaque objectif
- [ ] 3 exemples de partie complète avec objectifs distribués

## Sizing
T-shirt : **L**

Refs : `docs/GAMEPLAY.md §6.1`, `docs/DECISIONS.md G4`.
EOF

cat > "$BODIES/spec-jauge.md" <<'EOF'
## Contexte
La **jauge d'alerte** est l'indicateur global de tension du casse (voir `docs/GAMEPLAY.md §8` et `src/adventures/banque-lune/ART.md §6.4` pour l'ambiance lumineuse).

Elle pilote l'éclairage, modifie les seuils de réussite, déclenche des événements à seuils, et fait basculer en acte 3 quand elle atteint son max.

Reste à **chiffrer**.

## Questions ouvertes
- Échelle : **0-10** (granularité décente, simple à afficher), **0-100** (fine), ou autre ?
- Seuils de bascule : cool / tendu / chaud / critique (cf. ART.md §6.4 — où placer les seuils numériques) ?
- Quels **+/−** par source de montée et descente ? (échec, action risquée, événement défavorable, *Persuader un PNJ* du Négociateur)
- Quels **événements** déclenchés à chaque seuil ?
- Comment la jauge **modifie le dé** (cumul de modificateur, ou seuils pas-à-pas) ?

## Livrables attendus
- [ ] Échelle + seuils numériques (cool / tendu / chaud / critique)
- [ ] Table de modificateurs par source de montée
- [ ] Table de modificateurs par source de descente
- [ ] Liste des événements déclenchés à chaque seuil
- [ ] Table de modification du dé selon niveau de jauge
- [ ] Exemple : trace d'une partie type avec évolution de la jauge tour par tour

## Sizing
T-shirt : **M**

Refs : `docs/GAMEPLAY.md §8`, `src/adventures/banque-lune/ART.md §6.4`.
EOF

cat > "$BODIES/spec-evenements.md" <<'EOF'
## Contexte
Chaque tour de l'acte 2 se termine par un **événement de tour** révélé à tous (voir `docs/GAMEPLAY.md §3` acte 2 et `§8`). Tiré ou scripté selon la jauge d'alerte.

Pour la rejouabilité : **≥20 événements** distincts.

## Questions ouvertes
- **Catégories** : Sécurité, Opportunité, Témoin, Panne, Événement narratif, autre ?
- **Déclenchement** : tirage aléatoire pondéré par jauge ? table de seuils ? scripté narrativement ?
- **Effets** : montée/descente jauge, butin (+/−), Crédits, Dossiers, modif PNJ, débloque/bloque zones ?
- **Probabilité de répétition** d'un même événement dans une partie ?
- Comment **équilibrer** les événements favorables/défavorables au fil du casse ?

## Livrables attendus
- [ ] Liste de **≥20 événements** typés (id, label, catégorie, effets, conditions de tirage)
- [ ] Algorithme de tirage selon jauge d'alerte
- [ ] Effets précis quantifiés par événement
- [ ] Texte narratif (1-2 lignes) pour chaque événement
- [ ] Table d'équilibrage favorables vs défavorables par seuil de jauge

## Sizing
T-shirt : **L**

Refs : `docs/GAMEPLAY.md §3` (acte 2), `§8`.
EOF

cat > "$BODIES/spec-layout.md" <<'EOF'
## Contexte
Le **layout de la Banque Lune** est variable d'une partie à l'autre pour préserver la rejouabilité (voir `docs/GAMEPLAY.md §3` acte 1 et `src/adventures/banque-lune/ART.md §10.3`).

À spécifier : algorithme de génération ou pool de layouts pré-définis.

## Questions ouvertes
- **Génération procédurale** ou **layouts pré-définis** tirés au sort ? Mix ?
- Combien de **zones** minimum / maximum par layout ?
- Quelles **contraintes d'équilibrage** ? (toutes les 3 actions emblématiques doivent rester réalisables, sinon un rôle est inutile)
- Comment placer **coffres / PNJ / capteurs** ? Densité, distance entre eux, accessibilité ?
- Le layout influence-t-il la difficulté ? (couplage avec la jauge d'alerte)

## Livrables attendus
- [ ] Schéma de **3-5 layouts** type (esquisses ASCII ou images)
- [ ] Algorithme de génération (si procédural) **ou** règles de tirage (si pré-défini)
- [ ] Contraintes d'équilibrage formalisées (checklist)
- [ ] Exemple complet d'un layout pour la phase de prototypage M2
- [ ] Mapping layout → tilesets nécessaires (cf. ART.md §10.3)

## Sizing
T-shirt : **L**

Refs : `docs/GAMEPLAY.md §3`, `src/adventures/banque-lune/ART.md §10.3`.
EOF

cat > "$BODIES/spec-butin.md" <<'EOF'
## Contexte
Le partage du butin à l'acte 3 est le **moment de bascule** du jeu (voir `docs/GAMEPLAY.md §3` acte 3 et `§9.3`).

Le calcul dépend de la configuration des votes, des Dossiers Compromettant/Accès activés, des garanties achetées, des Pactes tenus/rompus, et de la réussite de l'objectif privé.

À spécifier de bout en bout.

## Questions ouvertes
- **Composition d'un lot** de butin : espèces / lingots / cartes / données / autres ? Comment se compose un lot type ?
- **Fourchette de valeur** par type de lot ?
- **Formules de partage** par configuration des votes :
  - Tous loyaux → split équitable + bonus si objectif privé rempli (combien ?)
  - Un seul traître → quelle part rafle-t-il ? les autres se partagent comment ?
  - Plusieurs traîtres → ratio dégueu, parfois tous perdent — formaliser
- Comment les **Dossiers Compromettant** modulent les parts ?
- Comment les **Dossiers Accès** modulent les parts ?
- **Effet de la réussite de l'objectif privé** sur le partage (bonus en %, en montant fixe, narratif uniquement) ?

## Livrables attendus
- [ ] Modèle de données d'un lot de butin
- [ ] Tables de fourchettes de valeur par type
- [ ] Formules de partage par config (tous loyaux / 1 traître / 2+ traîtres)
- [ ] Table d'interaction Dossiers × votes
- [ ] Pseudo-code complet de l'algorithme final
- [ ] 3 exemples de bilan complet (entrée → sortie)

## Sizing
T-shirt : **L**

Refs : `docs/GAMEPLAY.md §3` (acte 3), `§9.3`, `§6.3`.
EOF

cat > "$BODIES/spec-scaling.md" <<'EOF'
## Contexte
Le casse se joue à **3, 4 ou 5 joueurs** (voir `docs/GAMEPLAY.md §2`). La distribution actuelle posée dans le code post-PR #18 :
- 3 joueurs : Hacker + Faussaire + Infiltré
- 4 joueurs : + Négociateur·rice
- 5 joueurs : + Observateur

À valider et à équilibrer numériquement.

## Questions ouvertes
- Le **Négociateur** ou l'**Observateur** doit-il être obligatoire à un autre count ?
- À 3 joueurs, faut-il **ajuster la difficulté** (alerte qui monte plus vite, valeur du butin moindre, événements plus fréquents) ?
- Le mode 5 joueurs est-il intrinsèquement **plus chaotique** (plus de Pactes possibles, plus de Dossiers...) → équilibrage à prévoir ?
- Faut-il prévoir un **mode 2 joueurs** un jour, ou est-ce hors scope (et l'écrire explicitement) ?
- Le Faussaire est-il essentiel pour préserver le pivot info butin ? (s'il manque, qu'est-ce qui le remplace ?)

## Livrables attendus
- [ ] Table définitive des **rôles obligatoires par count** + justification
- [ ] **Ajustements numériques** par count (alerte, valeur butin, fréquence événements, etc.)
- [ ] Justification de chaque choix de scaling
- [ ] Décision explicite sur le mode 2 joueurs (in/out)

## Sizing
T-shirt : **M**

Refs : `docs/GAMEPLAY.md §2`, `§5`.
EOF

cat > "$BODIES/spec-tension.md" <<'EOF'
## Contexte
La table récap de `docs/GAMEPLAY.md §5` montre que **3 rôles n'ont pas de tension propre** :
- Hacker
- Faussaire
- Infiltré

Le Négociateur a celle des Pactes (déléguée à `spec/pacte-secret`). L'Observateur a celle du drone fragile.

À ce stade, ces 3 rôles sont un peu plats côté contrainte personnelle.

## Questions ouvertes
- Quelle **contrainte personnelle** pour l'**Infiltré** ? (sa couverture est-elle limitée dans le temps ? une jauge de suspicion personnelle ?)
- Pour le **Faussaire** : un quota de Substitutions ? une jauge d'authenticité qui se dégrade ?
- Pour le **Hacker** : surchauffe de son matériel après plusieurs Surcharges ?
- Hacker, Faussaire, Infiltré sont-ils **déjà assez intéressants** sans tension propre, ou faut-il leur en ajouter pour homogénéité ?
- Si on ajoute, **comment équilibrer** pour ne pas favoriser/défavoriser un rôle vs un autre ?

## Livrables attendus
- [ ] Pour chaque rôle (H, F, I) : **définition** ou **non-définition motivée** d'une tension propre
- [ ] Cohérence avec les autres rôles (Négo, Obs) — la tension est-elle de même intensité ?
- [ ] Si ajout : impact sur le système de résolution + UI à prévoir
- [ ] Mise à jour de la table récap §5 de `GAMEPLAY.md`

## Sizing
T-shirt : **S-M**

Refs : `docs/GAMEPLAY.md §5`.
EOF

cat > "$BODIES/spec-garanties.md" <<'EOF'
## Contexte
En phase pré-vote (acte 3), un joueur peut **acheter une garantie** avec ses Crédits pour se protéger partiellement contre une trahison (voir `docs/GAMEPLAY.md §6.2` et `§9.1`).

L'effet exact reste à spécifier.

## Questions ouvertes
- **Coût exact** en Crédits (forfait ? variable selon nombre de joueurs ?)
- **Type de protection** : part minimum garantie ? réduction de la perte ? annulation d'un Compromettant ciblé ?
- **Combien de garanties** achetables par joueur ?
- **Interaction avec les Dossiers Compromettant** : la garantie annule-t-elle le chantage de manière directe ?
- La garantie est-elle **visible** des autres joueurs (« X a acheté une garantie ») ou **secrète** ?
- L'effet est-il **annoncé au bilan** ou se résout en silence dans le calcul ?

## Livrables attendus
- [ ] Coût exact en Crédits
- [ ] Effet précis sur le calcul de gains acte 3
- [ ] Table d'interaction avec Dossiers Compromettant et Accès
- [ ] Visibilité (publique vs secrète) tranchée
- [ ] Pseudo-code de résolution intégré au calcul de gains
- [ ] 2-3 exemples de partie avec garanties activées

## Sizing
T-shirt : **S-M**

Refs : `docs/GAMEPLAY.md §6.2`, `§9.1`.
EOF

# --- 9 DEV M1 ---

cat > "$BODIES/dev-m1-adv.md" <<'EOF'
## Contexte
Pose le **contrat `Adventure`** typé et la validation runtime du manifest.

⚠️ **Partiellement livré par PR #19** — l'interface `Adventure`, le manifest enrichi (D8) et `validateManifest` sont déjà en place dans `src/core/types/`. Cette issue couvre la **vérification de cohérence** avec `docs/GAMEPLAY.md` et la finalisation si gap détecté.

## Critères d'acceptation
- [x] Interface `Adventure` (init / start / destroy) avec `start(initialState: Readonly<GameState>)` — fait
- [x] `AdventureManifest` enrichi (D8 : version, longDescription, banner, tags, difficulty, contentRating, languages, pricing optionnel) — fait
- [x] `validateManifest` type-predicate qui rejette runtime un manifest mal formé — fait
- [x] 9 tests sur `validateManifest` — fait
- [ ] Vérifier que rien dans `GAMEPLAY.md` n'exige un champ supplémentaire au manifest → fermer l'issue si rien à ajouter

## Sizing
T-shirt : **XS** (vérification ; **S** s'il faut ajouter un champ).

Refs : `docs/ADVENTURES_GUIDE.md §3`, `docs/DECISIONS.md D8`, PR #19.
EOF

cat > "$BODIES/dev-m1-store.md" <<'EOF'
## Contexte
Étend le `Store` générique (livré par PR #19) avec la **machine à états des trois actes** spécifique au pattern de `GAMEPLAY.md §3`.

Le Store actuel a `status: 'setup' | 'playing' | 'ended'`. Il faut affiner avec les actes du Casse pour que les transitions Acte 1 → Acte 2 → Acte 3 soient typées et déclencheables.

## Critères d'acceptation
- [ ] Type `Act = 'briefing' | 'casse' | 'extraction' | 'ended'`
- [ ] Action `TRANSITION_TO_ACT` (ciblée) et `TRANSITION_NEXT` (séquentiel)
- [ ] Reducer applique la transition uniquement dans l'**ordre prévu** (refus de skip)
- [ ] Émission d'événements `act.entered.briefing`, `act.entered.casse`, etc. (D2 — convention `domaine.action.passé`)
- [ ] Tests : transitions valides, transitions invalides (skip, retour en arrière)
- [ ] Documenté dans `docs/ADVENTURES_GUIDE.md` (services moteur)

## Sizing
T-shirt : **S**

Refs : `docs/GAMEPLAY.md §3`, `docs/DECISIONS.md D7+G1`, PR #19.
EOF

cat > "$BODIES/dev-m1-eventbus.md" <<'EOF'
## Contexte
**Bus d'événements typé** sur l'union discriminée `GameEvent`, format `domaine.action.passé`.

⚠️ **Livré par PR #19** — `EventBus` typé + `GameEventRegistry` augmentable + 6 tests dont `@ts-expect-error`.

Cette issue confirme la conformité à D2 et identifie d'éventuels événements manquants en lien avec `GAMEPLAY.md`.

## Critères d'acceptation
- [x] `EventBus.emit/on/off/clear` typés strict — fait
- [x] Format `domaine.action.passé` — fait
- [x] Augmentation par déclaration merging documentée — fait dans `ADVENTURES_GUIDE.md §5`
- [x] Tests dont `@ts-expect-error` — fait
- [ ] Vérifier que tous les événements du flux `GAMEPLAY.md` (turn.phase.entered.*, vote.cast, dossier.activated, etc.) sont **prévus** au registre ou prévus en M2 → fermer si rien à ajouter

## Sizing
T-shirt : **XS**

Refs : `docs/DECISIONS.md D2`, `docs/GAMEPLAY.md §3`, PR #19.
EOF

cat > "$BODIES/dev-m1-turn.md" <<'EOF'
## Contexte
Implémente la **machine à états d'un tour** dans l'acte 2, agnostique d'aventure (`docs/GAMEPLAY.md §3` acte 2).

Phases d'un tour :
1. **Planification** (60-90s, ouvert)
2. **Actions** (séquentiel, ~30s/joueur)
3. **Événement** (révélé à tous)
4. **Update jauge** (mise à jour visible)

## Critères d'acceptation
- [ ] Type `TurnPhase = 'planning' | 'actions' | 'event' | 'update'`
- [ ] API `TurnSystem.advance()` fait passer à la phase suivante (avec validation d'ordre)
- [ ] Au passage à 'actions', itère sur les joueurs (un par un)
- [ ] Émission d'événements `turn.phase.entered.<phase>` sur chaque transition
- [ ] Hook `onPhaseEnter(phase, callback)` pour qu'une aventure réagisse
- [ ] Tests : ordre des phases, boucle de tour, transitions invalides
- [ ] Tests co-localisés (D1)

## Sizing
T-shirt : **M**

Refs : `docs/GAMEPLAY.md §3` (acte 2), `docs/DECISIONS.md D1+D2+G1`.
EOF

cat > "$BODIES/dev-m1-role.md" <<'EOF'
## Contexte
Cadre **générique** pour qu'une aventure définisse ses rôles + actions sans toucher au core. Référence : `docs/GAMEPLAY.md §5` (mais sans coder le contenu Banque Lune ici).

## Critères d'acceptation
- [ ] Interface `Role { id: string; name: string; color: string; passiveAbility?: PassiveAbility; actions: ActionDescriptor[] }`
- [ ] Interface `PassiveAbility { id; description; activate?(ctx) }`
- [ ] Interface `ActionDescriptor { id; label; riskLevel: 'low'|'medium'|'high'; resolve(ctx): ActionResult }`
- [ ] Type `ActionResult = { kind: 'success' | 'partial' | 'failure'; effects?: Effect[]; cost?: Cost }`
- [ ] **Pas de logique de résolution ici** — c'est l'objet du système de résolution (M2, voir l'issue dédiée)
- [ ] Tests sur la composition et le typage

## Sizing
T-shirt : **M**

Refs : `docs/GAMEPLAY.md §4+§5`, `docs/DECISIONS.md G2`.
EOF

cat > "$BODIES/dev-m1-private-view.md" <<'EOF'
## Contexte
Composant générique pour **info privée par joueur** (G5).

⚠️ **Livré par PR #10** — `DomPrivateView` avec `reveal()` et `pickAction()`, machine à états testée.

Cette issue vérifie la conformité aux usages du `GAMEPLAY.md` (§7) et ajoute les chaînages nécessaires pour la phase pré-vote acte 3.

## Critères d'acceptation
- [x] `reveal()` et `pickAction()` — fait
- [x] State machine testée (5 tests) — fait
- [ ] Vérifier que **chaînage de PrivateView** (un joueur après l'autre, plusieurs vues d'affilée) est supporté pour l'acte 3 (pré-vote + vote)
- [ ] Si manquant : ajouter `revealAll(steps[])` ou `chain(stepGenerator)` qui fait défiler les vues
- [ ] Tests sur le chaînage

## Sizing
T-shirt : **XS-S** (selon résultat de la vérification).

Refs : `docs/GAMEPLAY.md §7+§9.1`, `docs/DECISIONS.md G5`, PR #10.
EOF

cat > "$BODIES/dev-m1-bl-manifest.md" <<'EOF'
## Contexte
Manifest typé du Casse Lune avec les **5 rôles définitifs** (Hacker, Faussaire, Infiltré·e, Négociateur·rice, Observateur).

⚠️ **Livré par PR #19** (manifest enrichi) + PR #18 (alignement DA des rôles).

## Critères d'acceptation
- [x] Manifest avec id, version, title, descriptions, thumbnail, banner, tone, tags, players, durée, difficulté, contentRating, languages, pricing — fait
- [x] À jour avec les 5 rôles définitifs (Hacker / Faussaire / Infiltré / Négociateur / Observateur) — fait dans roles/index.ts
- [ ] Champ `roles: RoleId[]` dans le manifest pour exposer la liste — à ajouter si non présent
- [ ] Vérification que tous les champs `GAMEPLAY.md` exigent sont là

## Sizing
T-shirt : **XS**

Refs : `src/adventures/banque-lune/manifest.ts`, PR #18, PR #19.
EOF

cat > "$BODIES/dev-m1-bl-stubs.md" <<'EOF'
## Contexte
**Stubs des 5 rôles** : capacités passives + descripteurs d'actions, **sans logique de résolution** (la logique vient avec le système de résolution M2).

Référence : `docs/GAMEPLAY.md §5`.

## Critères d'acceptation
- [ ] 5 fichiers `src/adventures/banque-lune/roles/<role>.ts` (hacker, faussaire, infiltre, negociateur, observateur)
- [ ] Chaque rôle expose un `Role` conforme à l'interface du système de rôles générique
- [ ] **Capacité passive** : implémentation minimale ou commentaire pointant `GAMEPLAY.md §5` + ce qui doit être fait
- [ ] **3 actions** par rôle, avec `riskLevel` correct, `resolve()` qui `throw new Error('not specified yet, see #SPEC_DE')`
- [ ] Couleur identité respectée (cf. `ART.md §4`)
- [ ] Tests : chaque rôle est conforme à l'interface `Role`, manifest des actions valide
- [ ] Lint : le throw de `resolve()` doit pointer vers une issue, pas être muet

## Sizing
T-shirt : **M**

Refs : `docs/GAMEPLAY.md §5`, `src/adventures/banque-lune/ART.md §4`.
EOF

cat > "$BODIES/dev-m1-bl-sprites.md" <<'EOF'
## Contexte
**Sprites placeholder** des 5 rôles, conformes à `src/adventures/banque-lune/ART.md §2.3`.

Note : **finaux en M3**. Ici on pose les placeholders (formes de couleur identité + initiale) pour que le rendu Phaser fonctionne en M2.

## Critères d'acceptation
- [ ] Pour chacun des 5 rôles : sprite atlas placeholder **48×48**
- [ ] **4 directions** : haut, bas, gauche, droite
- [ ] Animations **idle** (2 frames) + **walk** (4 frames/dir) + **action** (3 frames)
- [ ] Couleurs identité de la DA (cyan / ambre / magenta / rose / bleu glacé) respectées
- [ ] Atlas exporté en **PNG + JSON Hash** compatible Phaser 3 (D6)
- [ ] Convention de nommage `<role>_atlas.png` / `<role>_atlas.json` (D6)
- [ ] Sprite drone 32×32 séparé pour l'Observateur (G7)
- [ ] Note dans `assets/README.md` : sprites finaux en M3

## Sizing
T-shirt : **L**

Refs : `src/adventures/banque-lune/ART.md §2.3+§4`, `docs/DECISIONS.md D6+G7`.
EOF

# --- 8 DEV M2 (avec placeholders pour spec numbers) ---

cat > "$BODIES/dev-m2-resolution.md" <<EOF
## Contexte
**Système de résolution générique** : dé de risque, modificateurs, coûts de boost (`docs/GAMEPLAY.md §4`).

## Statut
⛔ **Bloquée par #__SPEC_DE__** (spec/grille-resolution).
Ne commence pas l'implémentation avant que la spec soit livrée et validée.

## Critères d'acceptation
- [ ] Fonction \`resolve(action: ActionDescriptor, context: ResolveContext): ActionResult\`
- [ ] Application des modificateurs (capacité passive, équipement, contexte, jauge d'alerte)
- [ ] **Boost** : interface pour dépenser des Crédits (relance, +1)
- [ ] Émet \`action.resolved\` sur l'EventBus avec le résultat
- [ ] Tests exhaustifs (succès / partiel / échec, avec et sans boost, à différents niveaux de jauge)
- [ ] Tests co-localisés

## Sizing
T-shirt : **M**

Refs : \`docs/GAMEPLAY.md §4\`, \`docs/DECISIONS.md G2\`.
EOF

cat > "$BODIES/dev-m2-bl-actions.md" <<EOF
## Contexte
Implémentation des **15 actions** des 5 rôles (`docs/GAMEPLAY.md §5`).

## Statut
⛔ **Bloquée par #__SPEC_DE__** (spec/grille-resolution) et **#__SPEC_GAR__** (spec/garanties — pour les actions qui touchent l'acte 3 indirectement).
Ne commence pas l'implémentation avant que les specs soient livrées et validées.

## Critères d'acceptation
- [ ] **Hacker** : Intrusion système / Collecte de données / Surcharge
- [ ] **Faussaire** : Faux ordre / Substitution / Authentifier
- [ ] **Infiltré** : Reconnaissance / Détournement de garde / Crochetage
- [ ] **Négociateur** : Persuader / Marchandage / Pacte secret (cf. #__SPEC_PACTE__)
- [ ] **Observateur** : Reconnaissance drone / Brouillage / Œil dans le ciel
- [ ] Chaque action implémente \`resolve(ctx)\` selon la grille \`spec/grille-resolution\`
- [ ] Capacités passives implémentées (Vision réseau, Œil d'expert, Couverture, Magnétisme, Vue tactique)
- [ ] Tests par action (succès / partiel / échec, effets sur jauge / Crédits / Dossiers)

## Sizing
T-shirt : **XL**

Refs : \`docs/GAMEPLAY.md §5\`, \`src/adventures/banque-lune/roles/\`.
EOF

cat > "$BODIES/dev-m2-bl-acte1.md" <<EOF
## Contexte
**UI Acte 1 — Briefing** : sélection des rôles, distribution des objectifs privés, plan d'attaque ouvert (`docs/GAMEPLAY.md §3` acte 1).

## Statut
⚠️ **Partiellement bloquée par #__SPEC_OBJ__** (spec/objectifs-prives — pour la table d'objectifs et l'algo de distribution).

Le reste (UI sélection rôles, plan d'attaque) peut commencer dès que les rôles M1 sont stubés.

## Critères d'acceptation
- [ ] UI sélection rôles (5 rôles, couleur HUD = couleur du rôle)
- [ ] Distribution des objectifs privés via PrivateView (chaîné par joueur)
- [ ] Plan d'attaque ouvert avec timer 60s
- [ ] Transition vers l'acte 2 quand tous les joueurs ont leur objectif
- [ ] Émission de \`act.entered.casse\` à la fin de l'acte 1
- [ ] Tests sur les transitions et l'UI (vérification visuelle manuelle a minima)

## Sizing
T-shirt : **L**

Refs : \`docs/GAMEPLAY.md §3\` (acte 1), \`§6.1\`, \`§7\`.
EOF

cat > "$BODIES/dev-m2-bl-acte3.md" <<EOF
## Contexte
**Acte 3 — Vote secret simultané** : phase pré-vote (Dossiers Identité, garanties, Pactes), vote tablette tournée, calcul gains, bilan narratif (`docs/GAMEPLAY.md §3` acte 3 et **§9**).

## Statut
⛔ **Bloquée par #__SPEC_BUTIN__** (spec/calcul-butin) et **#__SPEC_GAR__** (spec/garanties-acte-3).
Bénéficie de **#__SPEC_PACTE__** (pour la résolution des Pactes).
Ne commence pas l'implémentation avant que les specs soient livrées et validées.

## Critères d'acceptation
- [ ] **Phase pré-vote** : activation Dossier Identité, achat garantie, réclamation Pacte
- [ ] **Vote** : tablette tournée par joueur (\`PrivateView.pickAction\`), choix Loyal/Trahir
- [ ] **Révélation simultanée** des votes (tous en même temps)
- [ ] **Calcul des gains** selon \`spec/calcul-butin\` (configurations vote × Dossiers × garanties × Pactes)
- [ ] **Bilan narratif** : qui a réussi son objectif privé, qui repart avec quoi
- [ ] Émission de \`adventure.completed\` à la fin
- [ ] Tests par configuration (tous loyaux / 1 traître / 2+ traîtres) × Dossiers × garanties

## Sizing
T-shirt : **L**

Refs : \`docs/GAMEPLAY.md §3+§9\`, \`docs/DECISIONS.md G3+G6\`.
EOF

cat > "$BODIES/dev-m2-bl-jauge.md" <<EOF
## Contexte
**Jauge d'alerte** : HUD bas d'écran + logique (montée/descente, modif des seuils du dé, déclenchement événements à seuils, fin forcée acte 2 au max). Voir \`docs/GAMEPLAY.md §8\`.

## Statut
⛔ **Bloquée par #__SPEC_JAUGE__** (spec/jauge-alerte).
Ne commence pas l'implémentation avant que la spec soit livrée et validée.

## Critères d'acceptation
- [ ] **HUD** jauge en bas d'écran (cf. \`ART.md §8.2\` zone Alerte)
- [ ] Couplage **éclairage global** selon seuil (cool / tendu / chaud / critique — \`ART.md §6.4\`)
- [ ] Logique **montée/descente** selon table de la spec
- [ ] Modification des **seuils du dé** selon niveau de jauge
- [ ] **Fin forcée acte 2** quand max atteint
- [ ] Émission de \`alert.changed\` à chaque update
- [ ] Tests : transitions de seuil, modificateurs, fin forcée

## Sizing
T-shirt : **M**

Refs : \`docs/GAMEPLAY.md §8\`, \`src/adventures/banque-lune/ART.md §6.4+§8.2\`.
EOF

cat > "$BODIES/dev-m2-bl-evenements.md" <<EOF
## Contexte
**Système d'événements de tour** : tirage selon jauge, application des effets, affichage à tous (\`docs/GAMEPLAY.md §3\` acte 2 + \`§8\`).

## Statut
⛔ **Bloquée par #__SPEC_EVT__** (spec/evenements).
Ne commence pas l'implémentation avant que la spec soit livrée et validée.

## Critères d'acceptation
- [ ] Tirage **selon jauge d'alerte** (algorithme de la spec)
- [ ] Application des **effets** (jauge ±, butin ±, Crédits, Dossiers, modif PNJ, débloque/bloque zones)
- [ ] **Affichage public** (pas privé — l'événement de tour est révélé à tous)
- [ ] Émission de \`event.triggered\` avec id + payload
- [ ] Tests par catégorie d'événement
- [ ] Tests : pas de répétition immédiate du même événement

## Sizing
T-shirt : **L**

Refs : \`docs/GAMEPLAY.md §3+§8\`.
EOF

cat > "$BODIES/dev-m2-bl-layout.md" <<EOF
## Contexte
**Layout de la Banque Lune** : rendu top-down via Phaser, exploration de zones, positionnement PNJ + caméras + capteurs (\`docs/GAMEPLAY.md §3\` acte 1, \`ART.md §10.3\`).

## Statut
⛔ **Bloquée par #__SPEC_LAYOUT__** (spec/layout-banque).
Ne commence pas l'implémentation avant que la spec soit livrée et validée.

## Critères d'acceptation
- [ ] Rendu **top-down via Phaser**, vue orthogonale (cf. \`ART.md §2.1\`)
- [ ] **Exploration** : zones non révélées masquées, action *Reconnaissance* les révèle
- [ ] **PNJ visuels** (gardes, civils) — sprite 32×32 (cf. \`ART.md §2.2\`)
- [ ] **Caméras et capteurs** rendus visuellement (icônes + cônes de vision)
- [ ] **Tilesets** assemblés selon le layout choisi
- [ ] Tests de rendu (snapshot ou vérification visuelle manuelle)

## Sizing
T-shirt : **L**

Refs : \`docs/GAMEPLAY.md §3\`, \`src/adventures/banque-lune/ART.md §2+§10.3\`.
EOF

cat > "$BODIES/dev-m2-bl-drone.md" <<EOF
## Contexte
**Drone de l'Observateur** : sprite distinct, jauge intégrité 3 PV, déplacement séparé des avatars humains (G7, \`docs/GAMEPLAY.md §5\` Observateur).

## Statut
✅ **Peu bloquée** — peut commencer dès que les sprites placeholder M1 et le système de rôles sont en place.

## Critères d'acceptation
- [ ] **Sprite drone 32×32** distinct des avatars humains (48×48) — cf. \`ART.md §2.2+§4.5\`
- [ ] **Jauge intégrité 3 PV** côté Observateur — incrément/décrément via actions et événements
- [ ] **Déplacement séparé** : le drone bouge selon les actions Reconnaissance / Brouillage / Œil dans le ciel, pas avec les avatars humains
- [ ] **Détection possible** : action Brouillage peut faire monter la jauge d'alerte ou endommager le drone
- [ ] **Si drone détruit** : capacités passives partiellement perdues (Vue tactique conservée, actions actives bloquées) — voir \`GAMEPLAY.md §5\`
- [ ] Émission de \`drone.damaged\`, \`drone.destroyed\`
- [ ] Tests sur la jauge intégrité et les états

## Sizing
T-shirt : **M**

Refs : \`docs/GAMEPLAY.md §5\` (Observateur), \`src/adventures/banque-lune/ART.md §4.5\`, \`docs/DECISIONS.md G7\`.
EOF

# ============================================================================
# D. Création des issues
# ============================================================================

echo ""
echo "→ Création des 10 issues spec/game-design..."

create_issue() {
  local title="$1"
  local labels="$2"
  local milestone="$3"
  local body_file="$4"
  local url
  url=$(gh issue create --repo "$R" --title "$title" --label "$labels" --milestone "$milestone" --body-file "$body_file")
  echo "$url" | grep -oE '[0-9]+$'
}

SPEC_PACTE=$(create_issue "[spec] Mécanique détaillée du Pacte secret"                 "spec/game-design,m2" "M2" "$BODIES/spec-pacte.md")
echo "   #$SPEC_PACTE — Pacte secret"
SPEC_DE=$(create_issue    "[spec] Grille de résolution chiffrée du dé de risque"       "spec/game-design,m2" "M2" "$BODIES/spec-de.md")
echo "   #$SPEC_DE — Grille de résolution"
SPEC_OBJ=$(create_issue   "[spec] Table des objectifs privés tordus"                   "spec/game-design,m2" "M2" "$BODIES/spec-objectifs.md")
echo "   #$SPEC_OBJ — Objectifs privés"
SPEC_JAUGE=$(create_issue "[spec] Jauge d'alerte chiffrée"                             "spec/game-design,m2" "M2" "$BODIES/spec-jauge.md")
echo "   #$SPEC_JAUGE — Jauge d'alerte"
SPEC_EVT=$(create_issue   "[spec] Table d'événements de tour"                          "spec/game-design,m2" "M2" "$BODIES/spec-evenements.md")
echo "   #$SPEC_EVT — Événements"
SPEC_LAYOUT=$(create_issue "[spec] Layout de banque"                                   "spec/game-design,m2" "M2" "$BODIES/spec-layout.md")
echo "   #$SPEC_LAYOUT — Layout banque"
SPEC_BUTIN=$(create_issue "[spec] Calcul du butin"                                     "spec/game-design,m2" "M2" "$BODIES/spec-butin.md")
echo "   #$SPEC_BUTIN — Calcul butin"
SPEC_SCALE=$(create_issue "[spec] Scaling 3/4/5 joueurs"                               "spec/game-design,m2" "M2" "$BODIES/spec-scaling.md")
echo "   #$SPEC_SCALE — Scaling joueurs"
SPEC_TENS=$(create_issue  "[spec] Tension propre Infiltré et Négociateur"              "spec/game-design,m2" "M2" "$BODIES/spec-tension.md")
echo "   #$SPEC_TENS — Tension rôles"
SPEC_GAR=$(create_issue   "[spec] Effet exact des garanties (acte 3)"                  "spec/game-design,m2" "M2" "$BODIES/spec-garanties.md")
echo "   #$SPEC_GAR — Garanties acte 3"

echo ""
echo "→ Création des 9 issues dev M1..."

M1_ADV=$(create_issue       "[m1][core] Interface Adventure typée + manifest validation"                "m1,core,dev"                  "M1" "$BODIES/dev-m1-adv.md")
echo "   #$M1_ADV"
M1_STORE=$(create_issue     "[m1][core] Store de partie typé (machine à états Acte 1 / 2 / 3)"           "m1,core,dev"                  "M1" "$BODIES/dev-m1-store.md")
echo "   #$M1_STORE"
M1_EVT=$(create_issue       "[m1][core] Système d'événements typé"                                       "m1,core,dev"                  "M1" "$BODIES/dev-m1-eventbus.md")
echo "   #$M1_EVT"
M1_TURN=$(create_issue      "[m1][core] Phase de tour générique (Planification → Actions → Événement → Update jauge)" "m1,core,dev"      "M1" "$BODIES/dev-m1-turn.md")
echo "   #$M1_TURN"
M1_ROLE=$(create_issue      "[m1][core] Système de rôles générique : Role, ActionDescriptor, ActionResult" "m1,core,dev"                "M1" "$BODIES/dev-m1-role.md")
echo "   #$M1_ROLE"
M1_PRIV=$(create_issue      "[m1][core] Système de tablette tournée"                                     "m1,core,dev"                  "M1" "$BODIES/dev-m1-private-view.md")
echo "   #$M1_PRIV"
M1_BL_MAN=$(create_issue    "[m1][adventure:banque-lune] Manifest typé du Casse Lune (5 rôles + métadonnées)" "m1,adventure:banque-lune,dev" "M1" "$BODIES/dev-m1-bl-manifest.md")
echo "   #$M1_BL_MAN"
M1_BL_STUBS=$(create_issue  "[m1][adventure:banque-lune] Stubs des 5 rôles"                              "m1,adventure:banque-lune,dev" "M1" "$BODIES/dev-m1-bl-stubs.md")
echo "   #$M1_BL_STUBS"
M1_BL_SPRITES=$(create_issue "[m1][adventure:banque-lune] Sprites placeholder des 5 rôles (48×48, 4 directions)" "m1,adventure:banque-lune,dev" "M1" "$BODIES/dev-m1-bl-sprites.md")
echo "   #$M1_BL_SPRITES"

echo ""
echo "→ Création des 8 issues dev M2 (avec injection des numéros spec/)..."

# Substitution des placeholders __SPEC_*__ dans les bodies M2
for f in "$BODIES"/dev-m2-*.md; do
  sed -i \
    -e "s|__SPEC_PACTE__|$SPEC_PACTE|g" \
    -e "s|__SPEC_DE__|$SPEC_DE|g" \
    -e "s|__SPEC_OBJ__|$SPEC_OBJ|g" \
    -e "s|__SPEC_JAUGE__|$SPEC_JAUGE|g" \
    -e "s|__SPEC_EVT__|$SPEC_EVT|g" \
    -e "s|__SPEC_LAYOUT__|$SPEC_LAYOUT|g" \
    -e "s|__SPEC_BUTIN__|$SPEC_BUTIN|g" \
    -e "s|__SPEC_SCALE__|$SPEC_SCALE|g" \
    -e "s|__SPEC_TENS__|$SPEC_TENS|g" \
    -e "s|__SPEC_GAR__|$SPEC_GAR|g" \
    "$f"
done

M2_RES=$(create_issue       "[m2][core] Système de résolution générique (dé de risque, modificateurs, coûts de boost)" "m2,core,dev"                  "M2" "$BODIES/dev-m2-resolution.md")
echo "   #$M2_RES"
M2_BL_ACTIONS=$(create_issue "[m2][adventure:banque-lune] Implémentation des actions des 5 rôles (15 actions)"          "m2,adventure:banque-lune,dev" "M2" "$BODIES/dev-m2-bl-actions.md")
echo "   #$M2_BL_ACTIONS"
M2_BL_ACTE1=$(create_issue  "[m2][adventure:banque-lune] Acte 1 — Briefing UI (sélection rôles, distribution objectifs, plan d'attaque)" "m2,adventure:banque-lune,dev" "M2" "$BODIES/dev-m2-bl-acte1.md")
echo "   #$M2_BL_ACTE1"
M2_BL_ACTE3=$(create_issue  "[m2][adventure:banque-lune] Acte 3 — Vote secret simultané (UI tablette tournée, révélation, calcul gains)" "m2,adventure:banque-lune,dev" "M2" "$BODIES/dev-m2-bl-acte3.md")
echo "   #$M2_BL_ACTE3"
M2_BL_JAUGE=$(create_issue  "[m2][adventure:banque-lune] Jauge d'alerte (HUD + logique)"                                  "m2,adventure:banque-lune,dev" "M2" "$BODIES/dev-m2-bl-jauge.md")
echo "   #$M2_BL_JAUGE"
M2_BL_EVT=$(create_issue    "[m2][adventure:banque-lune] Système d'événements de tour"                                    "m2,adventure:banque-lune,dev" "M2" "$BODIES/dev-m2-bl-evenements.md")
echo "   #$M2_BL_EVT"
M2_BL_LAYOUT=$(create_issue "[m2][adventure:banque-lune] Layout de banque (rendu top-down, exploration)"                  "m2,adventure:banque-lune,dev" "M2" "$BODIES/dev-m2-bl-layout.md")
echo "   #$M2_BL_LAYOUT"
M2_BL_DRONE=$(create_issue  "[m2][adventure:banque-lune] Drone de l'Observateur (sprite, jauge intégrité, déplacement)"   "m2,adventure:banque-lune,dev" "M2" "$BODIES/dev-m2-bl-drone.md")
echo "   #$M2_BL_DRONE"

echo ""
echo "✅ Backlog seedé : 10 specs + 9 dev M1 + 8 dev M2 = 27 issues."
echo ""
echo "Liens : https://github.com/$R/issues"
