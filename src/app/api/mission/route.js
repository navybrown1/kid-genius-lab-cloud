import { z } from 'zod';
import { generateMission } from '../../../lib/ai';
import { loadAppState, summarizePerformance } from '../../../lib/app-state';

export async function POST(req) {
  try {
    const body = z.object({
      child: z.enum(['ethan', 'valentino', 'enzo']),
      subject: z.string().trim().min(1),
    }).parse(await req.json());
    const state = await loadAppState();
    const childState = summarizePerformance(state, body.child);
    const data = await generateMission(body.child, body.subject, childState.level, childState.lastDifficulty);
    return Response.json({ ...data, progress: childState });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return Response.json({ error: 'Unable to generate mission' }, { status: 500 });
  }
}
