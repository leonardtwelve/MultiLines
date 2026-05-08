# Contribuer à MultiLines

## Reporter un bug
Ouvrir une issue avec le template **Rapport de bug** : https://github.com/leonardtwelve/MultiLines/issues/new?template=bug_report.yml

## Proposer une fonctionnalité
Ouvrir une issue avec le template **Demande de fonctionnalité** : https://github.com/leonardtwelve/MultiLines/issues/new?template=feature_request.yml

## Donner un feedback
Ouvrir une issue avec le template **Retour d'expérience** : https://github.com/leonardtwelve/MultiLines/issues/new?template=feedback.yml

## Workflow de triage
1. Toute nouvelle issue arrive avec le label `status:triage`
2. Après qualification (priorité, sizing, critères d'acceptation) → `status:accepted`
3. Au démarrage du dev → `status:in-progress`
4. Fermeture automatique via `Closes #N` dans le commit qui résout l'issue

## Labels
- **Type** : `bug`, `enhancement`, `feedback`, `tech-debt`, `docs`
- **Priorité** : `P0` (bloquant), `P1`, `P2`, `P3` (nice to have)
- **Statut** : `status:triage`, `status:accepted`, `status:in-progress`
- **Catégorie métier** : `cat:gameplay`, `cat:ui-ux`, `cat:multiplayer`

## Conventions de commit
Format : `<type>: <description courte>` où `<type>` ∈ {`feat`, `fix`, `refactor`, `docs`, `test`, `chore`}.

Référencer l'issue concernée : `Closes #N` ou `Refs #N`.

Co-author IA quand pertinent :
```
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

## Conventions de code
À préciser une fois la stack choisie (voir CLAUDE.md).
