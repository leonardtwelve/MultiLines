# Roadmap

## Vision
Faire vivre, autour d'une tablette posée sur la table, des soirées de jeu coopératif/asymétrique courtes (30-45 min), avec une direction artistique pixel art forte et une rejouabilité par diversité d'aventures.

## Jalons

### M0 — Bootstrap (en cours)
- [x] Structure de projet, configs, CI.
- [x] Squelette d'aventure `banque-lune` conforme au contrat.
- [x] Écran d'accueil affichant les aventures disponibles.
- [x] Test de pipeline (`EventBus.test.ts`) qui passe.

### M1 — Squelette jouable du Casse de la Banque Lune
- [ ] Setup de partie : sélection des joueurs (3-5), couleurs, noms.
- [ ] Distribution des rôles asymétriques (incl. infiltré).
- [ ] Phase "tour son écran" pour révéler son rôle (`PrivateView` implémenté).
- [ ] Premier scenario linéaire (3 pièces enchaînées).
- [ ] Sauvegarde de partie en cours.

### M2 — Bluff & rejouabilité
- [ ] Mécaniques de bluff (votes, accusations).
- [ ] Plusieurs configurations de rôles selon le nombre de joueurs.
- [ ] Pièces additionnelles + scénario non-linéaire.
- [ ] Soundtrack + SFX cohérents.

### M3 — 2e aventure
- [ ] Choisir un univers contrasté (ton "léger" ou "tendu") pour valider la généricité du moteur.
- [ ] Si une seule modif de `core/` est nécessaire : RAS. Si plus : revoir le contrat.

### Plus tard (non priorisé)
- Multi-écrans (smartphones + tablette).
- Mode online.
- Profils joueurs cross-aventures.
- Localisation EN/ES.
- Outil d'édition de scénario.

## Principe de priorisation
À chaque fin de jalon : démo jouable + retour utilisateur → re-priorisation. Pas de planning rigide à 6 mois ; on avance par incréments testables.
