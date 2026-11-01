import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canUpdateEntity } from '@/permissions';
import { createShare, getShareByCode } from '@/queries/prisma';
import { POST } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/permissions', () => ({
  canUpdateEntity: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  createShare: vi.fn(),
  getShareByCode: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const canUpdateEntityMock = vi.mocked(canUpdateEntity);
const createShareMock = vi.mocked(createShare);
const getShareByCodeMock = vi.mocked(getShareByCode);

const body = {
  entityId: '8a1b1c1e-6a3e-4a52-9d5b-5f1d2a0f9c11',
  shareType: 1,
  name: 'Share',
  slug: 'my-slug',
};

beforeEach(() => {
  parseRequestMock.mockReset();
  canUpdateEntityMock.mockReset();
  createShareMock.mockReset();
  getShareByCodeMock.mockReset();

  parseRequestMock.mockResolvedValue({ auth: {}, body, error: undefined } as any);
  canUpdateEntityMock.mockResolvedValue(true);
});

test('POST returns 400 when the slug already exists', async () => {
  getShareByCodeMock.mockResolvedValue({ id: 'existing' } as any);

  const response = await POST(new Request('http://localhost/api/share', { method: 'POST' }));

  expect(response.status).toBe(400);
  expect((await response.json()).error.message).toBe('A share with this slug already exists.');
  expect(createShareMock).not.toHaveBeenCalled();
});

test('POST creates a share when the slug is unique', async () => {
  getShareByCodeMock.mockResolvedValue(null);
  createShareMock.mockResolvedValue({ id: 'new' } as any);

  const response = await POST(new Request('http://localhost/api/share', { method: 'POST' }));

  expect(response.status).toBe(200);
  expect(createShareMock).toHaveBeenCalledWith(expect.objectContaining({ slug: 'my-slug' }));
});
