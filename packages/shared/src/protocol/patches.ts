/**
 * Patches incrémentaux de l'état serveur → projection client (cf.
 * `docs/specs/store-projection.md §3`).
 *
 * Sous-ensemble de JSON Patch RFC 6902 — uniquement `replace`, `add`,
 * `remove`. Suffisant pour exprimer toutes nos mutations de gameplay sans
 * la complexité d'`op: move` / `copy` / `test`.
 *
 * **Path** au format pointer JSON (RFC 6901) :
 * - `/players/abc/credits` : champ scalaire d'un objet
 * - `/board/doors/3/locked` : index d'array
 * - `/players/abc/dossiers/-` : append à un array (token `-`)
 *
 * Voir aussi la table conventions de store-projection.md §3.1 :
 *
 *   Cas                       | op       | path                       | effet
 *   --------------------------|----------|----------------------------|-----------------
 *   Append à un array         | add      | /path/to/array/-           | push value
 *   Insérer à index i         | add      | /path/to/array/i           | insère + décale
 *   Remplacer index i         | replace  | /path/to/array/i           | overwrite
 *   Supprimer index i         | remove   | /path/to/array/i           | retire + décale
 *   Remplacer l'array entier  | replace  | /path/to/array             | overwrite array
 */

export type StatePatch =
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string };

/**
 * Batch atomique de patches émis par le serveur. Le client applique tous
 * les `patches` dans l'ordre OU rejette le batch entier (cf.
 * `applyPatchBatch` côté ClientStore).
 *
 * `version` est un sérial monotone serveur : démarre à 0 au snapshot
 * initial, incrémenté de 1 à chaque batch. Le client détecte les gaps via
 * `batch.version !== lastVersion + 1` et déclenche un resync.
 */
export interface StatePatchBatch {
  version: number;
  patches: ReadonlyArray<StatePatch>;
}
