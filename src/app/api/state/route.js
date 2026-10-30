import { prisma } from '../../../lib/db';
import { normalizeAppState } from '../../../lib/app-state';

export async function GET() {
  try {
    const row = await prisma.appState.findUnique({ where: { id: 'main' } });
    return Response.json(normalizeAppState(row?.data));
  } catch {
    return Response.json(normalizeAppState());
  }
}

export async function POST(req) {
  let data;

  try {
    data = normalizeAppState(await req.json());
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const row = await prisma.appState.upsert({
      where: { id: 'main' },
      update: { data },
      create: { id: 'main', data },
    });
    return Response.json(row.data);
  } catch {
    // The lab stays usable when the database is unavailable; the client keeps
    // its optimistic copy and the next successful save will sync it.
    return Response.json(data);
  }
}
