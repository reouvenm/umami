import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canDeleteEntity, canViewEntity } from '@/permissions';
import { deleteShare, getShare } from '@/queries/prisma';
import { DELETE, GET } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/permissions', () => ({
  canDeleteEntity: vi.fn(),
  canUpdateEntity: vi.fn(),
  canViewEntity: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  deleteShare: vi.fn(),
  getShare: vi.fn(),
  updateShare: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const canViewEntityMock = vi.mocked(canViewEntity);
const canDeleteEntityMock = vi.mocked(canDeleteEntity);
const getShareMock = vi.mocked(getShare);
const deleteShareMock = vi.mocked(deleteShare);

const params = { params: Promise.resolve({ shareId: 'share-1' }) };
const request = () => new Request('http://localhost/api/share/id/share-1');

beforeEach(() => {
  parseRequestMock.mockReset();
  canViewEntityMock.mockReset();
  canDeleteEntityMock.mockReset();
  getShareMock.mockReset();
  deleteShareMock.mockReset();

  parseRequestMock.mockResolvedValue({ auth: {}, error: undefined } as any);
  canViewEntityMock.mockResolvedValue(true);
  canDeleteEntityMock.mockResolvedValue(true);
});

test('GET returns 404 for an unknown share id', async () => {
  getShareMock.mockResolvedValue(null);

  const response = await GET(request(), params);

  expect(response.status).toBe(404);
});

test('GET returns the share for a valid id', async () => {
  getShareMock.mockResolvedValue({ id: 'share-1', entityId: 'e1' } as any);

  const response = await GET(request(), params);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: 'share-1', entityId: 'e1' });
});

test('DELETE returns 404 for an unknown share id', async () => {
  getShareMock.mockResolvedValue(null);

  const response = await DELETE(request(), params);

  expect(response.status).toBe(404);
  expect(deleteShareMock).not.toHaveBeenCalled();
});

test('DELETE deletes a valid share', async () => {
  getShareMock.mockResolvedValue({ id: 'share-1', entityId: 'e1' } as any);

  const response = await DELETE(request(), params);

  expect(response.status).toBe(200);
  expect(deleteShareMock).toHaveBeenCalledWith('share-1');
});
