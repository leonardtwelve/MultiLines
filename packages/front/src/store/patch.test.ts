import { describe, expect, it } from 'vitest';
import { PatchError, applyPatches } from './patch';

describe('applyPatches — replace', () => {
  it('remplace une valeur scalaire au niveau racine', () => {
    const out = applyPatches({ alert: 0 }, [
      { op: 'replace', path: '/alert', value: 50 },
    ]);
    expect(out).toEqual({ alert: 50 });
  });

  it('remplace une valeur imbriquée', () => {
    const out = applyPatches({ turn: { activePlayerId: 'p1', number: 3 } }, [
      { op: 'replace', path: '/turn/activePlayerId', value: 'p2' },
    ]);
    expect(out).toEqual({ turn: { activePlayerId: 'p2', number: 3 } });
  });

  it('remplace un élément à un index précis dans un array', () => {
    const out = applyPatches({ doors: [{ locked: true }, { locked: false }] }, [
      { op: 'replace', path: '/doors/0/locked', value: false },
    ]);
    expect(out).toEqual({ doors: [{ locked: false }, { locked: false }] });
  });

  it("ne mute pas l'état d'entrée (immutabilité de la fonction)", () => {
    const input = { alert: 0 };
    applyPatches(input, [{ op: 'replace', path: '/alert', value: 99 }]);
    expect(input).toEqual({ alert: 0 });
  });
});

describe('applyPatches — add', () => {
  it('ajoute une clé à un objet (équivalent replace tolérant)', () => {
    const out = applyPatches({ a: 1 } as Record<string, unknown>, [
      { op: 'add', path: '/b', value: 2 },
    ]);
    expect(out).toEqual({ a: 1, b: 2 });
  });

  it("supporte le pattern '-' pour append à un array", () => {
    const out = applyPatches({ dossiers: [] as unknown[] }, [
      { op: 'add', path: '/dossiers/-', value: { id: 'd1', label: 'photo' } },
    ]);
    expect(out).toEqual({ dossiers: [{ id: 'd1', label: 'photo' }] });
  });

  it("'-' fonctionne sur un array existant (append à la fin)", () => {
    const out = applyPatches({ list: ['a', 'b'] }, [
      { op: 'add', path: '/list/-', value: 'c' },
    ]);
    expect(out).toEqual({ list: ['a', 'b', 'c'] });
  });

  it('insère à un index précis (décale les suivants)', () => {
    const out = applyPatches({ list: ['a', 'c'] }, [
      { op: 'add', path: '/list/1', value: 'b' },
    ]);
    expect(out).toEqual({ list: ['a', 'b', 'c'] });
  });

  it("refuse '-' avec op replace (le '-' n'a de sens qu'en add)", () => {
    expect(() =>
      applyPatches({ list: ['a'] }, [{ op: 'replace', path: '/list/-', value: 'b' }]),
    ).toThrow(PatchError);
  });
});

describe('applyPatches — remove', () => {
  it("supprime une clé d'un objet", () => {
    const out = applyPatches({ a: 1, b: 2 }, [{ op: 'remove', path: '/b' }]);
    expect(out).toEqual({ a: 1 });
  });

  it("supprime un élément d'un array (décale les suivants)", () => {
    const out = applyPatches({ list: ['a', 'b', 'c'] }, [
      { op: 'remove', path: '/list/1' },
    ]);
    expect(out).toEqual({ list: ['a', 'c'] });
  });

  it('refuse de supprimer une clé absente', () => {
    expect(() =>
      applyPatches({ a: 1 }, [{ op: 'remove', path: '/inconnue' }]),
    ).toThrow(PatchError);
  });

  it('refuse de supprimer un index hors bornes', () => {
    expect(() =>
      applyPatches({ list: ['a'] }, [{ op: 'remove', path: '/list/5' }]),
    ).toThrow(PatchError);
  });
});

describe('applyPatches — batches', () => {
  it('applique plusieurs patches dans l’ordre', () => {
    const out = applyPatches({ alert: 0, list: ['a'] as unknown[] }, [
      { op: 'replace', path: '/alert', value: 25 },
      { op: 'add', path: '/list/-', value: 'b' },
      { op: 'add', path: '/list/-', value: 'c' },
    ]);
    expect(out).toEqual({ alert: 25, list: ['a', 'b', 'c'] });
  });

  it('un échec dans le batch propage l’erreur (pas de rollback partiel — resync forcé en amont)', () => {
    expect(() =>
      applyPatches({ a: 1 }, [
        { op: 'replace', path: '/a', value: 2 },
        { op: 'remove', path: '/inconnue' },
      ]),
    ).toThrow(PatchError);
  });
});

describe('applyPatches — paths invalides', () => {
  it("refuse un path qui ne commence pas par '/'", () => {
    expect(() =>
      applyPatches({ a: 1 }, [{ op: 'replace', path: 'a', value: 2 }]),
    ).toThrow(PatchError);
  });

  it('refuse une traversée à travers null', () => {
    expect(() =>
      applyPatches({ a: null }, [{ op: 'replace', path: '/a/b', value: 2 }]),
    ).toThrow(PatchError);
  });

  it('refuse un index non numérique dans un array', () => {
    expect(() =>
      applyPatches({ list: ['a'] }, [{ op: 'replace', path: '/list/foo', value: 'b' }]),
    ).toThrow(PatchError);
  });

  it('refuse un index hors bornes en replace', () => {
    expect(() =>
      applyPatches({ list: ['a'] }, [{ op: 'replace', path: '/list/5', value: 'b' }]),
    ).toThrow(PatchError);
  });
});

describe('applyPatches — escape RFC 6901', () => {
  it('décode ~1 → /', () => {
    const out = applyPatches({ 'a/b': 0 } as Record<string, unknown>, [
      { op: 'replace', path: '/a~1b', value: 42 },
    ]);
    expect(out).toEqual({ 'a/b': 42 });
  });

  it('décode ~0 → ~', () => {
    const out = applyPatches({ 'a~b': 0 } as Record<string, unknown>, [
      { op: 'replace', path: '/a~0b', value: 42 },
    ]);
    expect(out).toEqual({ 'a~b': 42 });
  });
});

describe('applyPatches — replace de la racine', () => {
  it("path '' + replace renvoie value (remplace tout)", () => {
    const out = applyPatches({ old: true }, [{ op: 'replace', path: '', value: { brand: 'new' } }]);
    expect(out).toEqual({ brand: 'new' });
  });

  it("path '' + remove rejette (remove racine n'a pas de sens)", () => {
    expect(() => applyPatches({ a: 1 }, [{ op: 'remove', path: '' }])).toThrow(
      PatchError,
    );
  });
});
