import { prisma } from '../../../lib/db';

const fallback = {
  children: ['ethan', 'valentino', 'enzo'],
  stars: 0,
  missions: [],
  updatedAt: null
};

export async function GET() {
  try {
    const row = await prisma.appState.findUnique({ where: { id: 'main' } });
    return Response.json(row?.data || fallback);
  } catch {
    return Response.json(fallback);
  }
}

export async function POST(req) {
  const data = await req.json();
  try {
    const row = await prisma.appState.upsert({
      where: { id: 'main' },
      update: { data },
      create: { id: 'main', data }
    });
    return Response.json(row.data);
  } catch {
    return Response.json(data);
  }
}
