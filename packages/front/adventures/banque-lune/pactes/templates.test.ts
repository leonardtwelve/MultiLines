import { describe, it, expect } from 'vitest';
import { PACTE_TEMPLATES } from './templates';

describe('PACTE_TEMPLATES', () => {
  it('expose exactement 3 templates (G9)', () => {
    expect(Object.keys(PACTE_TEMPLATES)).toHaveLength(3);
  });

  it('chaque template a une description et un détail non-vides', () => {
    for (const [, t] of Object.entries(PACTE_TEMPLATES)) {
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.details.length).toBeGreaterThan(0);
      expect(t.emoji.length).toBeGreaterThan(0);
    }
  });

  it("Échange direct se résout à l'acceptation, les autres à l'acte 3", () => {
    expect(PACTE_TEMPLATES.exchange.resolvesAt).toBe('on-accept');
    expect(PACTE_TEMPLATES.loyalty.resolvesAt).toBe('act-3');
    expect(PACTE_TEMPLATES.protection.resolvesAt).toBe('act-3');
  });
});
