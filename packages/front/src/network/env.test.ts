import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCAL_SERVER_URL, getServerUrl } from './env';

function fakeEnv(value: string | undefined): ImportMetaEnv {
  // ImportMetaEnv est un type Vite, on bypass avec un cast minimal.
  return { VITE_SERVER_URL: value } as unknown as ImportMetaEnv;
}

describe('getServerUrl', () => {
  it('renvoie le default localhost si VITE_SERVER_URL absent', () => {
    expect(getServerUrl(fakeEnv(undefined))).toBe(DEFAULT_LOCAL_SERVER_URL);
  });

  it('renvoie le default localhost si VITE_SERVER_URL vide', () => {
    expect(getServerUrl(fakeEnv(''))).toBe(DEFAULT_LOCAL_SERVER_URL);
    expect(getServerUrl(fakeEnv('   '))).toBe(DEFAULT_LOCAL_SERVER_URL);
  });

  it("retire les slashs de fin pour éviter '//socket.io/'", () => {
    expect(getServerUrl(fakeEnv('https://pixel-quests-server.fly.dev/'))).toBe(
      'https://pixel-quests-server.fly.dev',
    );
  });

  it("trim les espaces qui traînent (env var copiée à la main)", () => {
    expect(getServerUrl(fakeEnv('  https://api.example.com  '))).toBe(
      'https://api.example.com',
    );
  });
});
