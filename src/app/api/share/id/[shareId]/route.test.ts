import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { DELETE, GET } from './route';

const mocks = vi.hoisted(() => ({
  canDeleteEntity: vi.fn(),
  canViewEntity: vi.fn(),
  canUpdateEntity: vi.fn(),
  deleteShare: vi.fn(),
  getShare: vi.fn(),
  updateShare: vi.fn(),
}));

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/permissions', () => ({
  canDeleteEntity: mocks.canDeleteEntity,
  canViewEntity: mocks.canViewEntity,
  canUpdateEntity: mocks.canUpdateEntity,
}));

vi.mock('@/queries/prisma', () => ({
  deleteShare: mocks.deleteShare,
  getShare: mocks.getShare,
  updateShare: mocks.updateShare,
}));

const parseRequestMock = vi.mocked(parseRequest);
const params = { params: Promise.resolve({ shareId: 'share-1' }) };

beforeEach(() => {
  parseRequestMock.mockReset();
  Object.values(mocks).forEach(m => m.mockReset());

  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    error: undefined,
  } as any);
  mocks.canDeleteEntity.mockResolvedValue(true);
  mocks.canViewEntity.mockResolvedValue(true);
});

test('GET returns 404 for an unknown id', async () => {
  mocks.getShare.mockResolvedValue(null);

  const response = await GET(new Request('http://localhost/api/share/id/share-1'), params);

  expect(response.status).toBe(404);
});

test('DELETE returns 404 for an unknown id', async () => {
  mocks.getShare.mockResolvedValue(null);

  const response = await DELETE(
    new Request('http://localhost/api/share/id/share-1', { method: 'DELETE' }),
    params,
  );

  expect(response.status).toBe(404);
  expect(mocks.deleteShare).not.toHaveBeenCalled();
});

test('GET returns the share for a valid id', async () => {
  const share = { id: 'share-1', entityId: 'entity-1' };
  mocks.getShare.mockResolvedValue(share);

  const response = await GET(new Request('http://localhost/api/share/id/share-1'), params);

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual(share);
});

test('DELETE deletes the share for a valid id', async () => {
  mocks.getShare.mockResolvedValue({ id: 'share-1', entityId: 'entity-1' });

  const response = await DELETE(
    new Request('http://localhost/api/share/id/share-1', { method: 'DELETE' }),
    params,
  );

  expect(response.status).toBe(200);
  expect(mocks.deleteShare).toHaveBeenCalledWith('share-1');
});
