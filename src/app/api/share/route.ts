import z from 'zod';
import { uuid } from '@/lib/crypto';
import { getRandomChars } from '@/lib/generate';
import { parseRequest } from '@/lib/request';
import { badRequest, json, unauthorized } from '@/lib/response';
import { anyObjectParam } from '@/lib/schema';
import { canUpdateEntity } from '@/permissions';
import { createShare, getShareByCode } from '@/queries/prisma';

export async function POST(request: Request) {
  const schema = z.object({
    entityId: z.uuid(),
    shareType: z.coerce.number().int(),
    name: z.string().max(200),
    slug: z.string().max(100).optional(),
    parameters: anyObjectParam,
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { entityId, shareType, name, slug, parameters } = body;
  const shareParameters = parameters ?? {};

  if (!(await canUpdateEntity(auth, entityId))) {
    return unauthorized();
  }

  const slugExists = () =>
    badRequest({ message: 'A share with this slug already exists.', code: 'slug-exists' });

  if (slug && (await getShareByCode(slug))) {
    return slugExists();
  }

  try {
    const share = await createShare({
      id: uuid(),
      entityId,
      shareType,
      name,
      slug: slug || getRandomChars(16),
      parameters: shareParameters,
    });

    return json(share);
  } catch (e) {
    // Unique constraint violation (concurrent create with the same slug)
    if (slug && (e as { code?: string })?.code === 'P2002') {
      return slugExists();
    }
    throw e;
  }
}
