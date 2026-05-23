/**
 * Reducer de l'état `casse` (cf. `docs/specs/server-state-machine.md §3.3`).
 *
 * Le coeur du gameplay. Sous-machine de tours :
 *   turn-start → proposals → resolution → events → alerte → turn-end → (loop ou exit)
 *
 * Slice 3e-2 — scope :
 * - Initialisation à la transition `briefing → casse` (init du tour 1)
 * - Handle `action.propose` : valide → hooks.resolveAction → applique
 *   patches → triggerTurnEvents → check exit → advance turn → emit
 *   state.patch + turn.* + action.resolved
 * - Conditions de sortie : `alert >= ALERT_THRESHOLD_FAILURE` (échec) ou
 *   `turnNumber > MAX_TURNS` (timeout). Précédence : échec > timeout
 *   (cf. spec server-state-machine §3.3 ordre fixe).
 *
 * Hors scope (slice 3e-2b+) :
 * - `move.tile`, `pacte.*`, `vote.cast` (renvoient accept([]) silencieux)
 * - sub-machine fine turn-start / events / alerte (séparés) — pour
 *   l'instant tout est fait en une seule transition par action.propose
 * - timer côté serveur (deadline turn)
 * - succès anticipé (objectifs publics complétés)
 */

import type {
  ClientRequest,
  PlayerId,
  PublicGameState,
  StatePatch,
  TurnEvent,
} from '@pixel-quests/shared';
import type { Room } from '../../Room';
import type { ActionResult, AdventureHooks } from '../hooks';
import { accept, reject, type Emit, type Reaction, type Sender } from '../types';

export interface CasseReducerDeps {
  hooks: AdventureHooks;
  rng?: () => number;
}

/** Seuil d'alerte au-delà duquel la partie échoue. */
export const ALERT_THRESHOLD_FAILURE = 100;
/** Nombre max de tours avant fin par timeout. */
export const MAX_TURNS = 10;

/**
 * Appelé par la state machine quand status devient `casse`. Initialise
 * le tour 1 + émet `turn.started` + `state.patch` qui pose `status='casse'`
 * et `turn={number:1, activePlayerId}`.
 *
 * À appeler **une fois**, par le reducer briefing à la transition
 * `briefing → casse`.
 */
export function enterCasse(room: Room): Reaction {
  const session = room.getSession();
  if (!session) return accept([]);
  const firstPlayer = session.turnOrder[0];
  if (!firstPlayer) return accept([]);

  const patches: StatePatch[] = [
    { op: 'replace', path: '/status', value: 'casse' },
    {
      op: 'add',
      path: '/turn',
      value: { number: 1, activePlayerId: firstPlayer },
    },
  ];
  applyPatchesToSession(session.public, patches);
  // setSession sera fait par le caller via session déjà mutée ;
  // on bump explicitement la version pour respecter le contrat patch.
  room.mutateSession(() => {
    // Mutation déjà faite ci-dessus ; ce callback ne fait que bumper version.
  });
  session.casseSubState = 'proposals';

  const emits: Emit[] = [
    {
      to: 'room',
      type: 'state.patch',
      payload: { version: session.version, patches },
    },
    {
      to: 'room',
      type: 'turn.started',
      payload: { turnNumber: 1, activePlayerId: firstPlayer },
    },
  ];
  return accept(emits);
}

export function applyCasse(
  room: Room,
  msg: ClientRequest,
  sender: Sender,
  deps: CasseReducerDeps,
): Reaction {
  if (msg.type === 'action.propose') {
    return handleActionPropose(room, msg.payload, sender, deps);
  }
  // Les autres messages (move.tile, pacte.*, vote.cast) seront branchés
  // en 3e-2b / 3e-3. On accept silencieusement pour ne pas casser un
  // client qui les enverrait prématurément.
  return accept([]);
}

interface ActionProposePayload {
  actionId: string;
  params?: Readonly<Record<string, unknown>>;
}

function handleActionPropose(
  room: Room,
  payload: ActionProposePayload,
  sender: Sender,
  deps: CasseReducerDeps,
): Reaction {
  const session = room.getSession();
  if (!session) return accept([]);
  if (sender.kind !== 'player') {
    return reject({
      code: 'NOT_IN_ROOM',
      message: 'Seul un joueur peut proposer une action.',
    });
  }
  // Validators ont déjà vérifié status=casse + active player + action ∈
  // capabilities. On peut directement résoudre.
  const result: ActionResult | null = deps.hooks.resolveAction(
    payload.actionId,
    payload.params ?? {},
    session.public,
    sender.playerId,
  );
  if (!result) {
    return reject({
      code: 'ACTION_UNKNOWN',
      message: `Action "${payload.actionId}" non implémentée pour ton rôle.`,
    });
  }

  // 1) Applique les patches du résolveur à la session publique.
  applyPatchesToSession(session.public, result.patches);

  // 2) triggerTurnEvents (slice 3e-2 = stub vide).
  const extraEvents: ReadonlyArray<TurnEvent> = deps.hooks.triggerTurnEvents(
    session.public,
    { rng: deps.rng },
  );

  // 3) Check conditions de sortie casse (cf. spec §3.3 précédence).
  const exitReason = checkExitReason(session.public);

  // 4) Avance le tour (sauf si on sort).
  const turnPatches: StatePatch[] = [];
  if (!exitReason) {
    const nextTurnPatches = computeNextTurnPatches(session, sender.playerId);
    turnPatches.push(...nextTurnPatches);
    applyPatchesToSession(session.public, turnPatches);
  } else {
    // Transition vers extraction (échec ou timeout — slice 3e-3 traitera
    // ce qui suit). Pour l'instant on pose status='extraction'.
    turnPatches.push({ op: 'replace', path: '/status', value: 'extraction' });
    applyPatchesToSession(session.public, turnPatches);
    room.setStatus('extraction');
  }

  // 5) Bump version après TOUS les patches du batch (action + turn).
  const allPatches = [...result.patches, ...turnPatches];
  room.mutateSession(() => {
    // Mutations déjà appliquées, on ne fait que bumper version via le callback vide.
  });
  const version = session.version;

  const emits: Emit[] = [
    {
      to: 'room',
      type: 'state.patch',
      payload: { version, patches: allPatches },
    },
    {
      to: 'room',
      type: 'action.resolved',
      payload: {
        // Pas d'idempotency key MVP — `actionId` fait office. Slice
        // future : générer un vrai nanoid côté handler avant routing.
        proposalId: payload.actionId,
        actionId: payload.actionId,
        byPlayerId: sender.playerId,
        success: result.success,
      },
    },
  ];
  // Les `extraEvents` du triggerTurnEvents seront diffusés via
  // `turn.ended` quand la sous-machine sera plus fine (slice 3e-2b).
  void extraEvents;

  if (!exitReason) {
    // Notifie le nouveau tour démarré (le state.patch a déjà mis le
    // nouvel activePlayerId dans /turn).
    const newTurn = session.public.turn;
    if (newTurn) {
      emits.push({
        to: 'room',
        type: 'turn.started',
        payload: { turnNumber: newTurn.number, activePlayerId: newTurn.activePlayerId },
      });
    }
  } else {
    // Émet game.ended (signal du serveur) — le bilan détaillé (score
    // par joueur, atteinte des objectifs) arrive en slice 3e-4. Pour
    // l'instant on émet juste endReason + finalState.
    emits.push({
      to: 'room',
      type: 'game.ended',
      payload: {
        endReason: exitReason,
        finalState: session.public,
      },
    });
    // `computeFinalScore` sera consommé par la UI bilan plus tard.
    void deps.hooks.computeFinalScore(session.public, exitReason);
  }

  return accept(emits);
}

// === Helpers ===

/**
 * Détermine si une condition de sortie est atteinte (cf. spec §3.3
 * précédence : échec > succès anticipé > timeout). Slice 3e-2 ne
 * couvre que échec (alerte) et timeout (turn limit).
 */
function checkExitReason(state: PublicGameState): null | 'failure-alert' | 'turn-limit' {
  if ((state.alert ?? 0) >= ALERT_THRESHOLD_FAILURE) {
    return 'failure-alert';
  }
  const turnNumber = state.turn?.number ?? 0;
  if (turnNumber >= MAX_TURNS) {
    return 'turn-limit';
  }
  return null;
}

/**
 * Calcule les patches pour passer au tour suivant (incrément
 * turnNumber + rotation activePlayerId selon turnOrder).
 */
function computeNextTurnPatches(
  session: { public: PublicGameState; turnOrder: ReadonlyArray<PlayerId> },
  currentActivePlayerId: PlayerId,
): StatePatch[] {
  const { turnOrder } = session;
  const curIdx = turnOrder.indexOf(currentActivePlayerId);
  // Rotation cyclique. Si le current n'est plus dans l'ordre (player
  // parti), on prend l'index 0.
  const nextIdx = curIdx === -1 ? 0 : (curIdx + 1) % turnOrder.length;
  const nextPlayerId = turnOrder[nextIdx] ?? turnOrder[0];
  const currentTurn = session.public.turn?.number ?? 0;
  return [
    {
      op: 'replace',
      path: '/turn',
      value: { number: currentTurn + 1, activePlayerId: nextPlayerId },
    },
  ];
}

/**
 * Applique un batch de patches en place sur le state public. Sous-set
 * de RFC 6902 (replace, add, remove) — suffisant pour les patches
 * produits par les resolvers + le turn loop.
 *
 * Implémentation simple : reproduit le pattern de patch.ts côté front
 * mais en TS plain (pas de PatchError élaborée — on assume les patches
 * produits côté serveur sont toujours valides).
 */
function applyPatchesToSession(
  target: PublicGameState,
  patches: ReadonlyArray<StatePatch>,
): void {
  for (const p of patches) {
    applyOne(target as unknown as Record<string, unknown>, p);
  }
}

function applyOne(root: Record<string, unknown>, patch: StatePatch): void {
  const segments = patch.path.split('/').slice(1);
  if (segments.length === 0) return; // root replace non utilisé ici
  let parent: Record<string, unknown> | unknown[] = root;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const seg = segments[i];
    if (Array.isArray(parent)) {
      const idx = Number(seg);
      parent = parent[idx] as Record<string, unknown> | unknown[];
    } else {
      parent = parent[seg] as Record<string, unknown> | unknown[];
    }
  }
  const last = segments[segments.length - 1];
  if (patch.op === 'remove') {
    if (Array.isArray(parent)) {
      parent.splice(Number(last), 1);
    } else {
      delete parent[last];
    }
    return;
  }
  // add / replace
  if (Array.isArray(parent)) {
    if (last === '-') parent.push(patch.value);
    else if (patch.op === 'add') parent.splice(Number(last), 0, patch.value);
    else parent[Number(last)] = patch.value;
  } else {
    parent[last] = patch.value;
  }
}
