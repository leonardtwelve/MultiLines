import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig, parseCorsOrigins } from './env';

describe('parseCorsOrigins', () => {
  it("renvoie '*' sur valeur vide ou explicite", () => {
    expect(parseCorsOrigins('')).toBe('*');
    expect(parseCorsOrigins('   ')).toBe('*');
    expect(parseCorsOrigins('*')).toBe('*');
  });

  it("renvoie '*' si '*' figure dans la CSV (safe degrade)", () => {
    expect(parseCorsOrigins('https://multi-lines.vercel.app, *')).toBe('*');
  });

  it('parse une CSV de strings littérales (égalité exacte côté socket.io)', () => {
    const res = parseCorsOrigins(
      'https://multi-lines.vercel.app, http://localhost:5173',
    );
    expect(res).toEqual([
      'https://multi-lines.vercel.app',
      'http://localhost:5173',
    ]);
  });

  it('dédoublonne les strings littéraux identiques', () => {
    const res = parseCorsOrigins(
      'https://foo.app, https://foo.app, https://foo.app',
    );
    expect(res).toHaveLength(1);
  });

  it('convertit `https://*.vercel.app` en RegExp qui matche les previews', () => {
    const res = parseCorsOrigins('https://*.vercel.app');
    expect(Array.isArray(res)).toBe(true);
    if (!Array.isArray(res)) return;
    const re = res[0];
    expect(re).toBeInstanceOf(RegExp);
    if (!(re instanceof RegExp)) return;
    // Matche les previews + sous-sous-domaines
    expect(re.test('https://multi-lines-git-feat-front.vercel.app')).toBe(true);
    expect(re.test('https://preview.multi-lines.vercel.app')).toBe(true);
    // Ne matche pas un autre TLD
    expect(re.test('https://evil.app')).toBe(false);
    // Ne matche pas le domaine nu sans sous-domaine
    expect(re.test('https://vercel.app')).toBe(false);
    // Accepte un port explicite
    expect(re.test('https://preview.vercel.app:8443')).toBe(true);
  });

  it('mélange string + regex dans une même CSV', () => {
    const res = parseCorsOrigins(
      'http://localhost:5173, https://multi-lines.vercel.app, https://*.vercel.app',
    );
    if (!Array.isArray(res)) throw new Error('attendu : tableau');
    expect(res).toHaveLength(3);
    expect(typeof res[0]).toBe('string');
    expect(typeof res[1]).toBe('string');
    expect(res[2]).toBeInstanceOf(RegExp);
  });

  it('échappe les caractères regex spéciaux dans les hostnames', () => {
    // Hypothétique : un host avec un `+` ne doit pas être interprété
    // comme quantifieur regex.
    const res = parseCorsOrigins('https://a+b.example.com');
    expect(res).toEqual(['https://a+b.example.com']);
  });
});

describe('loadConfig — DEV_ALLOW_SOLO', () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env.DEV_ALLOW_SOLO;
  });

  afterEach(() => {
    if (saved === undefined) delete process.env.DEV_ALLOW_SOLO;
    else process.env.DEV_ALLOW_SOLO = saved;
  });

  it('default = true si la var n’est pas définie (phase de dev — solo activé par défaut)', () => {
    delete process.env.DEV_ALLOW_SOLO;
    expect(loadConfig().devAllowSolo).toBe(true);
  });

  it("'true' (ou '1', 'yes') → true", () => {
    process.env.DEV_ALLOW_SOLO = 'true';
    expect(loadConfig().devAllowSolo).toBe(true);
    process.env.DEV_ALLOW_SOLO = '1';
    expect(loadConfig().devAllowSolo).toBe(true);
    process.env.DEV_ALLOW_SOLO = 'YES';
    expect(loadConfig().devAllowSolo).toBe(true);
  });

  it("'false' (ou '0') → false (override explicite du défaut)", () => {
    process.env.DEV_ALLOW_SOLO = 'false';
    expect(loadConfig().devAllowSolo).toBe(false);
    process.env.DEV_ALLOW_SOLO = '0';
    expect(loadConfig().devAllowSolo).toBe(false);
  });

  it("'' (vide) → fallback au défaut (true en phase de dev)", () => {
    process.env.DEV_ALLOW_SOLO = '';
    expect(loadConfig().devAllowSolo).toBe(true);
  });
});
