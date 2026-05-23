import { describe, expect, it } from 'vitest';
import {
  capabilitiesOf,
  distributeRoles,
  InvalidPlayerCountError,
  ROLES,
  seededRandom,
  type RoleId,
} from './roles';

describe('ROLES — définition statique', () => {
  it('expose les 5 rôles avec leurs 3 actions chacune (GAMEPLAY §5)', () => {
    const ids: RoleId[] = ['hacker', 'faussaire', 'infiltre', 'negociateur', 'observateur'];
    for (const id of ids) {
      const role = ROLES[id];
      expect(role.id).toBe(id);
      expect(role.actions).toHaveLength(3);
      expect(role.passive.label).toBeTruthy();
      expect(role.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("chaque rôle a exactement 1 action emblématique", () => {
    for (const role of Object.values(ROLES)) {
      const emblematic = role.actions.filter((a) => a.emblematic);
      expect(emblematic).toHaveLength(1);
    }
  });

  it('toutes les actions ont un id stable, un label FR, un risque', () => {
    const seenIds = new Set<string>();
    for (const role of Object.values(ROLES)) {
      for (const action of role.actions) {
        expect(action.id).toMatch(/^[a-z0-9-]+$/);
        expect(action.label).toBeTruthy();
        expect(['low', 'medium', 'high']).toContain(action.risk);
        expect(seenIds.has(action.id)).toBe(false); // unicité globale
        seenIds.add(action.id);
      }
    }
  });
});

describe('capabilitiesOf', () => {
  it('renvoie les 3 actionIds du rôle', () => {
    expect(capabilitiesOf('hacker')).toEqual([
      'intrusion-systeme',
      'collecte-donnees',
      'surcharge',
    ]);
    expect(capabilitiesOf('observateur')).toEqual([
      'reconnaissance-drone',
      'brouillage',
      'oeil-dans-le-ciel',
    ]);
  });
});

describe('distributeRoles', () => {
  it("3 joueurs → Hacker + Faussaire + Infiltré (G7)", () => {
    const out = distributeRoles(['p1', 'p2', 'p3'], seededRandom(42));
    const assigned = new Set(out.values());
    expect(assigned).toEqual(new Set<RoleId>(['hacker', 'faussaire', 'infiltre']));
  });

  it("4 joueurs → + Négociateur (G7)", () => {
    const out = distributeRoles(['p1', 'p2', 'p3', 'p4'], seededRandom(42));
    const assigned = new Set(out.values());
    expect(assigned).toEqual(
      new Set<RoleId>(['hacker', 'faussaire', 'infiltre', 'negociateur']),
    );
  });

  it("5 joueurs → + Observateur (G7)", () => {
    const out = distributeRoles(['p1', 'p2', 'p3', 'p4', 'p5'], seededRandom(42));
    const assigned = new Set(out.values());
    expect(assigned).toEqual(
      new Set<RoleId>(['hacker', 'faussaire', 'infiltre', 'negociateur', 'observateur']),
    );
  });

  it('chaque joueur reçoit exactement un rôle', () => {
    const out = distributeRoles(['p1', 'p2', 'p3', 'p4', 'p5'], seededRandom(7));
    expect(out.size).toBe(5);
  });

  it("reproductible avec le même seed RNG", () => {
    const a = distributeRoles(['p1', 'p2', 'p3', 'p4', 'p5'], seededRandom(123));
    const b = distributeRoles(['p1', 'p2', 'p3', 'p4', 'p5'], seededRandom(123));
    for (const pid of ['p1', 'p2', 'p3', 'p4', 'p5']) {
      expect(a.get(pid)).toBe(b.get(pid));
    }
  });

  it("accepte 1 joueur (mode DEV_ALLOW_SOLO) → Hacker par défaut", () => {
    const out = distributeRoles(['p1'], seededRandom(42));
    expect(out.size).toBe(1);
    expect(out.get('p1')).toBe('hacker');
  });

  it("accepte 2 joueurs (mode DEV_ALLOW_SOLO) → Hacker + Faussaire", () => {
    const out = distributeRoles(['p1', 'p2'], seededRandom(42));
    expect(out.size).toBe(2);
    expect(new Set(out.values())).toEqual(new Set<RoleId>(['hacker', 'faussaire']));
  });

  it('lève InvalidPlayerCountError pour 0 joueur', () => {
    expect(() => distributeRoles([])).toThrow(InvalidPlayerCountError);
  });

  it('lève InvalidPlayerCountError pour 6 joueurs', () => {
    expect(() => distributeRoles(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'])).toThrow(
      InvalidPlayerCountError,
    );
  });
});
