/**
 * API publique de l'aventure « Banque Lune » côté serveur.
 *
 * Exporte les hooks `AdventureHooks` et les définitions de rôles +
 * objectifs. Consommé par le `RoomRegistry` via une factory.
 */

export { createBanqueLuneAdventureHooks } from './hooks';
export type { BanqueLuneHooksOptions } from './hooks';
export { ROLES, capabilitiesOf, distributeRoles, seededRandom } from './roles';
export type { RoleId, Role, RoleAction, ActionRisk } from './roles';
export {
  BLOCKING_PAIRS,
  OBJECTIVES,
  OBJECTIVES_BY_ROLE,
  distributeObjectives,
} from './objectives';
export type { Objective, ObjectiveAxis } from './objectives';
