# Roadmap

> ⚠️ **Pivot Jackbox — 12 mai 2026.**
> La vision a évolué : passage du modèle "écran partagé pur" au modèle **hybride Jackbox** (tablette + smartphone perso + serveur). Le jalon M2 a été **redéfini** comme la migration vers cette nouvelle architecture. Voir `docs/DECISIONS.md` (D7, G5, F9-F20) et l'epic [#67](https://github.com/leonardtwelve/MultiLines/issues/67).

## Vision (post-pivot)
Faire vivre des soirées de jeu coopératif/asymétrique courtes (30-45 min), avec une direction artistique pixel art forte et une rejouabilité par diversité d'aventures. Le format **Jackbox** (tablette centrale + smartphones individuels) permet :
- une information privée propre et naturelle (chaque joueur a son écran),
- la possibilité de jouer **à distance** (avec call audio en parallèle, F11),
- une expérience tactile bien adaptée à l'écran partagé pour le contenu public.

## Jalons

### M0 — Bootstrap (livré M1)
- [x] Structure de projet, configs, CI.
- [x] Squelette d'aventure `banque-lune` conforme au contrat.
- [x] Écran d'accueil affichant les aventures disponibles.
- [x] Test de pipeline (`EventBus.test.ts`) qui passe.

### M1 — PoC mono-device + design game/front (livré 10 mai 2026)
- [x] Setup de partie : sélection des joueurs (3-5), couleurs, noms.
- [x] Distribution des rôles asymétriques (incl. infiltré·e).
- [x] Phase "tour son écran" (PrivateView/DomPrivateView — depuis archivés post-pivot).
- [x] Premier scenario linéaire (3 pièces, BoardScene 9 zones — depuis archivés post-pivot).
- [x] DECISIONS D1-D8 + G1-G10 actées.
- [x] GAMEPLAY.md v2 + ART.md v1 + FRONTEND.md v1.
- [x] Resolver 2d6 + 30 objectifs + Pactes templates + plateau BoardScene livrés en code.

### M2 — Migration Jackbox + vertical slice (en cours)
**Jalon redéfini suite au pivot.** Estimation : **6-8 semaines** en solo full-time.

**Phase A — Spec architecturale** (7 issues `spec/tech` : #60-#66)
- [ ] Protocole WebSocket (#60)
- [ ] Machine à états serveur (#61)
- [ ] Connexion QR + code (#62)
- [ ] Store projection client (#63)
- [ ] Setup monorepo (#64) — partiellement livré par PR #68
- [ ] Portée déplacement (#65)
- [ ] Mouvement drone (#66)

**Phase B — Migration monorepo** (en review : PR #68)
- [x] Archivage du code pre-pivot
- [x] Structure `packages/front/` + `packages/server/` (placeholder)
- [x] CI + Vercel adaptés
- [ ] Merge sur develop

**Phase C — Serveur Node + WebSocket** (Prompt 2)
- [ ] Squelette serveur + déploiement Fly.io
- [ ] Implémentation du protocole (#60)
- [ ] Machine à états (#61)

**Phase D — Refonte rendu plateau map continue** (Prompt 3 partie 1)
- [ ] Tilesets + objets décoratifs (F14)
- [ ] Portes physiques + cadenas (F15)
- [ ] Déplacement tile-based (#65)

**Phase E — Player smartphone PWA** (Prompt 3 partie 2)
- [ ] Squelette client Player
- [ ] Onboarding QR (#62)
- [ ] HUD personnel + UI proposition d'action / vote / Pacte
- [ ] Synchronisation projection (#63)

**Phase F — Reconnexion + edge cases**

Objectif vertical slice M2 : **une partie 5 joueurs jouable bout-en-bout** (briefing → casse → vote → bilan) en monorepo Jackbox.

### M3 — 2e aventure
- [ ] Choisir un univers contrasté (ton "léger" ou "tendu") pour valider la généricité du moteur.
- [ ] Si une seule modif de `core/` est nécessaire : RAS. Si plus : revoir le contrat.

### Plus tard (non priorisé)
- ~~Multi-écrans (smartphones + tablette).~~ → **acté M2**.
- ~~Mode online.~~ → **acté M2** (F11 serveur cloud).
- Profils joueurs cross-aventures.
- Localisation EN/ES.
- Outil d'édition de scénario.
- Marketplace d'aventures.

## Principe de priorisation
À chaque fin de jalon : démo jouable + retour utilisateur → re-priorisation. Pas de planning rigide à 6 mois ; on avance par incréments testables.
