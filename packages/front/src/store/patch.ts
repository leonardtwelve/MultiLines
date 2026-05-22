/**
 * Mini applicateur JSON Patch (cf. `docs/specs/store-projection.md §3`).
 *
 * Sous-ensemble strict de RFC 6902 — uniquement les 3 opérations dont on
 * a besoin : `replace`, `add`, `remove`. Pas de `move` / `copy` / `test`.
 *
 * Conformité :
 * - Le `path` suit RFC 6901 (JSON Pointer) : tokens séparés par `/`,
 *   `~1` = `/`, `~0` = `~`.
 * - Pour les arrays, l'index est un nombre, et `-` désigne « après le
 *   dernier élément » (append) — cf. §3.1 table conventions.
 *
 * **Pure** : `applyPatches(state, patches)` renvoie un NOUVEL objet (deep
 * clone du state d'entrée + patches appliqués). Le state d'entrée n'est
 * jamais muté. Bundle léger (zéro dépendance).
 *
 * Les erreurs (path invalide, traversée d'un noeud absent…) sont levées
 * en `PatchError` — le `ClientStore` les capture pour déclencher un
 * resync (cf. spec §4 désynchronisation).
 */

import type { StatePatch } from '@pixel-quests/shared';

export class PatchError extends Error {
  constructor(
    message: string,
    readonly path: string,
    readonly op: string,
  ) {
    super(`PatchError [${op} ${path}]: ${message}`);
    this.name = 'PatchError';
  }
}

/**
 * Applique un batch de patches en série sur une copie profonde du
 * state. Renvoie le nouvel état. Lève `PatchError` en cas d'incohérence.
 *
 * **Atomicité** : si l'application d'un patch échoue, l'erreur remonte
 * — le caller (ClientStore) doit prévoir un resync. On ne tente PAS de
 * rollback partiel (cf. faiblesse #6 review specs : on a opté pour le
 * resync forcé en cas d'erreur, plutôt qu'un rollback complexe).
 */
export function applyPatches(state: unknown, patches: ReadonlyArray<StatePatch>): unknown {
  let cur = deepClone(state);
  for (const p of patches) {
    cur = applyOne(cur, p);
  }
  return cur;
}

// === Internes ===

/**
 * Deep clone défensif (cf. review 3c-4 #2). Utilisé à 2 endroits :
 * 1. Au début d'`applyPatches` pour ne pas muter le state d'entrée.
 * 2. Sur chaque `patch.value` avant insertion, pour éviter de stocker
 *    une référence à un objet du caller (qui finirait `Object.freeze`-é
 *    par le `freezeDeep` du `ClientStore` → effet de bord externe).
 *
 * Limites du fallback JSON : perd `undefined`, `Date`, `Map`, `Set`.
 * OK pour notre state plain-JSON ; à revoir si on en sort.
 */
function deepClone<T>(v: T): T {
  if (v === null || typeof v !== 'object') return v;
  if (typeof structuredClone === 'function') {
    return structuredClone(v);
  }
  return JSON.parse(JSON.stringify(v)) as T;
}

function applyOne(state: unknown, patch: StatePatch): unknown {
  const segments = parsePath(patch.path, patch.op);
  if (segments.length === 0) {
    // RFC 6901 : path "" pointe la racine. On supporte uniquement le
    // replace de root pour rester explicite ; les autres ops à la
    // racine sont des erreurs sémantiques. `patch.value` est cloné pour
    // éviter la fuite de référence (cf. review 3c-4 #2).
    if (patch.op === 'replace') return deepClone(patch.value);
    throw new PatchError(`cannot ${patch.op} root`, patch.path, patch.op);
  }
  const { parent, lastSegment } = navigate(state, segments, patch.op, patch.path);
  if (patch.op === 'remove') {
    removeFrom(parent, lastSegment, patch.path);
  } else {
    setOn(parent, lastSegment, patch.value, patch.op, patch.path);
  }
  return state;
}

function parsePath(path: string, op: string): string[] {
  if (path === '') return [];
  if (!path.startsWith('/')) {
    throw new PatchError('path must start with "/" or be empty', path, op);
  }
  return path
    .slice(1)
    .split('/')
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
}

interface NavigationResult {
  parent: Record<string, unknown> | unknown[];
  lastSegment: string;
}

function navigate(
  state: unknown,
  segments: string[],
  op: string,
  path: string,
): NavigationResult {
  let cur: unknown = state;
  // On s'arrête au PARENT du dernier segment — c'est lui qu'on mute.
  for (let i = 0; i < segments.length - 1; i++) {
    cur = step(cur, segments[i], op, path);
  }
  if (cur === null || typeof cur !== 'object') {
    throw new PatchError('parent is not an object/array', path, op);
  }
  return {
    parent: cur as Record<string, unknown> | unknown[],
    lastSegment: segments[segments.length - 1],
  };
}

function step(node: unknown, segment: string, op: string, path: string): unknown {
  if (node === null || typeof node !== 'object') {
    throw new PatchError(`path traverses non-object at "${segment}"`, path, op);
  }
  if (Array.isArray(node)) {
    const idx = parseIndex(segment);
    if (idx === null) {
      throw new PatchError(`expected array index, got "${segment}"`, path, op);
    }
    if (idx < 0 || idx >= node.length) {
      throw new PatchError(`array index out of bounds: ${idx}`, path, op);
    }
    return node[idx];
  }
  return (node as Record<string, unknown>)[segment];
}

function setOn(
  parent: Record<string, unknown> | unknown[],
  segment: string,
  value: unknown,
  op: string,
  path: string,
): void {
  // Defensive copy (cf. review 3c-4 #2) : on n'insère JAMAIS une
  // référence directe à `value`. Le caller peut continuer à manipuler
  // son objet sans craindre que le `Object.freeze` récursif appliqué
  // par le `ClientStore` gèle aussi sa copie locale.
  const v = deepClone(value);
  if (Array.isArray(parent)) {
    if (segment === '-') {
      // Pattern d'append (cf. spec §3.1).
      if (op !== 'add') {
        throw new PatchError('"-" target only valid for op "add"', path, op);
      }
      parent.push(v);
      return;
    }
    const idx = parseIndex(segment);
    if (idx === null) {
      throw new PatchError(`expected array index, got "${segment}"`, path, op);
    }
    if (op === 'add') {
      if (idx < 0 || idx > parent.length) {
        throw new PatchError(`add index out of bounds: ${idx}`, path, op);
      }
      parent.splice(idx, 0, v);
    } else {
      if (idx < 0 || idx >= parent.length) {
        throw new PatchError(`replace index out of bounds: ${idx}`, path, op);
      }
      parent[idx] = v;
    }
    return;
  }
  // Objet : refuse le segment "-" (réservé aux arrays, RFC 6902).
  if (segment === '-') {
    throw new PatchError('"-" target is array-only, not an object key', path, op);
  }
  // add et replace sont équivalents sur un objet (RFC 6902 : add
  // overwrite si la clé existe, replace exige qu'elle existe). On
  // reste tolérant — documenté dans le README spec.
  (parent as Record<string, unknown>)[segment] = v;
}

function removeFrom(
  parent: Record<string, unknown> | unknown[],
  segment: string,
  path: string,
): void {
  if (Array.isArray(parent)) {
    const idx = parseIndex(segment);
    if (idx === null) {
      throw new PatchError(`expected array index, got "${segment}"`, path, 'remove');
    }
    if (idx < 0 || idx >= parent.length) {
      throw new PatchError(`remove index out of bounds: ${idx}`, path, 'remove');
    }
    parent.splice(idx, 1);
    return;
  }
  if (!(segment in (parent as Record<string, unknown>))) {
    throw new PatchError(`key "${segment}" does not exist`, path, 'remove');
  }
  delete (parent as Record<string, unknown>)[segment];
}

function parseIndex(s: string): number | null {
  if (s === '') return null;
  if (!/^\d+$/.test(s)) return null;
  return parseInt(s, 10);
}
