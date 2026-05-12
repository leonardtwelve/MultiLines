# test-adventure

Aventure **factice** : 1-4 joueurs, ~5 min, ton léger, contenu = scène placeholder.

## Pourquoi
1. Servir de référence pédagogique au tutoriel "Créer une aventure en 30 minutes" dans [`docs/ADVENTURES_GUIDE.md`](../../../docs/ADVENTURES_GUIDE.md).
2. Garde-fou de conformité : si le contrat `Adventure` évolue de manière incompatible, la compilation de cette aventure échoue et signale le problème.

## Statut
**Non listée** dans l'écran d'accueil par défaut. Pour la tester, ajouter `testAdventure` au tableau `adventures` dans `src/app/main.ts`, puis retirer après vérification.

## Conformité au contrat
Le test `src/adventures/test-adventure/contract.test.ts` vérifie qu'elle satisfait `Adventure` (typage + manifest valide).
