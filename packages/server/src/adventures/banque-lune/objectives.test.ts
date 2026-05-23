import { describe, expect, it } from 'vitest';
import {
  BLOCKING_PAIRS,
  OBJECTIVES,
  OBJECTIVES_BY_ROLE,
  distributeObjectives,
} from './objectives';
import { seededRandom } from './roles';

describe('OBJECTIVES — table statique (GAMEPLAY §7.2)', () => {
  it('expose 30 objectifs au total (6 par rôle)', () => {
    expect(OBJECTIVES).toHaveLength(30);
    for (const role of [
      'hacker',
      'faussaire',
      'infiltre',
      'negociateur',
      'observateur',
    ] as const) {
      expect(OBJECTIVES_BY_ROLE[role]).toHaveLength(6);
    }
  });

  it("tous les ids sont uniques", () => {
    const ids = OBJECTIVES.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tous les codes sont uniques", () => {
    const codes = OBJECTIVES.map((o) => o.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("chaque axis ∈ {action, economic, comparative, narrative}", () => {
    const valid = new Set(['action', 'economic', 'comparative', 'narrative']);
    for (const o of OBJECTIVES) {
      expect(valid.has(o.axis)).toBe(true);
    }
  });
});

describe('BLOCKING_PAIRS', () => {
  it("contient au moins la paire H4 ↔ F4 (G10 §7.4)", () => {
    const pair = BLOCKING_PAIRS.find(
      ([a, b]) =>
        (a === 'richer-than-faussaire' && b === 'richer-than-hacker') ||
        (b === 'richer-than-faussaire' && a === 'richer-than-hacker'),
    );
    expect(pair).toBeDefined();
  });
});

describe('distributeObjectives', () => {
  it("donne un objectif à chaque joueur, dans le pool de son rôle", () => {
    const out = distributeObjectives(
      [
        { playerId: 'p1', roleId: 'hacker' },
        { playerId: 'p2', roleId: 'faussaire' },
        { playerId: 'p3', roleId: 'infiltre' },
      ],
      seededRandom(42),
    );
    expect(out.size).toBe(3);
    expect(out.get('p1')?.role).toBe('hacker');
    expect(out.get('p2')?.role).toBe('faussaire');
    expect(out.get('p3')?.role).toBe('infiltre');
  });

  it("évite la paire bloquante H4 ↔ F4 (re-tirage forcé)", () => {
    // RNG truqué : retourne 0 (premier élément du pool) sur le 1er appel
    // puis 0 (premier élément du POOL FILTRÉ) sur le 2e. Le premier élément
    // du pool hacker est H1 (solo-perfect), pas H4 → pas de blocage à
    // déclencher avec ce seed. On force le test avec un RNG qui PIQUE H4
    // en premier en pickant le 4e index, puis vérifie que F4 n'est pas
    // distribué au Faussaire.
    const forced = (() => {
      // 1er call : pour Hacker → veut prendre H4 (index 3 dans le pool
      // hacker, qui est dans l'ordre H1..H6).
      // 2e call : pour Faussaire → essaie de prendre F4. Le pool filtré
      // exclut F4 (car H4 déjà drawn). Doit donc choisir parmi 5 restants.
      const seq = [
        3 / 6 + 0.001, // index 3 → H4
        3 / 5 + 0.001, // index 3 dans le filtré (5 éléments) → F5
      ];
      let i = 0;
      return () => seq[i++] ?? 0;
    })();
    const out = distributeObjectives(
      [
        { playerId: 'p1', roleId: 'hacker' },
        { playerId: 'p2', roleId: 'faussaire' },
      ],
      forced,
    );
    expect(out.get('p1')?.code).toBe('richer-than-faussaire'); // H4
    expect(out.get('p2')?.code).not.toBe('richer-than-hacker'); // F4 exclu
  });

  it("reproductible avec le même seed RNG", () => {
    const a = distributeObjectives(
      [
        { playerId: 'p1', roleId: 'hacker' },
        { playerId: 'p2', roleId: 'infiltre' },
      ],
      seededRandom(99),
    );
    const b = distributeObjectives(
      [
        { playerId: 'p1', roleId: 'hacker' },
        { playerId: 'p2', roleId: 'infiltre' },
      ],
      seededRandom(99),
    );
    expect(a.get('p1')?.code).toBe(b.get('p1')?.code);
    expect(a.get('p2')?.code).toBe(b.get('p2')?.code);
  });
});
