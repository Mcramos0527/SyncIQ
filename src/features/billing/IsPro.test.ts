import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWhere = vi.fn();

vi.mock('@/libs/DB', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: mockWhere,
      }),
    }),
  },
}));

describe('isPro', () => {
  beforeEach(() => {
    mockWhere.mockReset();
  });

  it('returns true when the workspace row has plan=pro', async () => {
    mockWhere.mockResolvedValueOnce([{ id: 'ws_1', plan: 'pro' }]);
    const { isPro } = await import('./IsPro');

    expect(await isPro('ws_1')).toBe(true);
  });

  it('returns false when the workspace row has plan=free', async () => {
    mockWhere.mockResolvedValueOnce([{ id: 'ws_1', plan: 'free' }]);
    const { isPro } = await import('./IsPro');

    expect(await isPro('ws_1')).toBe(false);
  });

  it('returns false when no workspace row exists yet', async () => {
    mockWhere.mockResolvedValueOnce([]);
    const { isPro } = await import('./IsPro');

    expect(await isPro('ws_never_seen')).toBe(false);
  });
});
