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
  try {
    const data = normalizeAppState(await req.json());
    const row = await prisma.appState.upsert({
      where: { id: 'main' },
      update: { data },
      create: { id: 'main', data }
    });
    return Response.json(row.data);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    return Response.json({ error: 'Unable to save state' }, { status: 500 });
  }
}
