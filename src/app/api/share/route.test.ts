import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
  canUpdateEntity: vi.fn(),
  createShare: vi.fn(),
  getShareByCode: vi.fn(),
}));

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/permissions', () => ({
  canUpdateEntity: mocks.canUpdateEntity,
}));

vi.mock('@/queries/prisma', () => ({
  createShare: mocks.createShare,
  getShareByCode: mocks.getShareByCode,
}));

const parseRequestMock = vi.mocked(parseRequest);

const entityId = '4d8f8c1e-6a0b-4c43-9a55-0f3b2f1f9a11';

beforeEach(() => {
  parseRequestMock.mockReset();
  mocks.canUpdateEntity.mockReset();
  mocks.createShare.mockReset();
  mocks.getShareByCode.mockReset();

  mocks.canUpdateEntity.mockResolvedValue(true);
  mocks.getShareByCode.mockResolvedValue(null);
  mocks.createShare.mockImplementation(async data => data);
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { entityId, shareType: 1, name: 'Share', slug: 'my-slug' },
    error: undefined,
  } as any);
});

const post = () => POST(new Request('http://localhost/api/share', { method: 'POST' }));

test('returns 400 when the slug already exists', async () => {
  mocks.getShareByCode.mockResolvedValue({ id: 'existing' });

  const response = await post();

  expect(response.status).toBe(400);
  expect(mocks.createShare).not.toHaveBeenCalled();
});

test('returns 400 when the database reports a unique violation', async () => {
  mocks.createShare.mockRejectedValue({ code: 'P2002' });

  const response = await post();

  expect(response.status).toBe(400);
});

test('rethrows other errors', async () => {
  mocks.createShare.mockRejectedValue(new Error('boom'));

  await expect(post()).rejects.toThrow('boom');
});

test('creates a share with a unique slug', async () => {
  const response = await post();

  expect(response.status).toBe(200);
  expect(mocks.createShare).toHaveBeenCalledWith(expect.objectContaining({ slug: 'my-slug' }));
});

test('generates a slug when none is provided', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { entityId, shareType: 1, name: 'Share' },
    error: undefined,
  } as any);

  const response = await post();

  expect(response.status).toBe(200);
  expect(mocks.getShareByCode).not.toHaveBeenCalled();
  expect(mocks.createShare.mock.calls[0][0].slug).toHaveLength(16);
});
