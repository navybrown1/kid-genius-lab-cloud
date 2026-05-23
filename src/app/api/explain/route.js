import { z } from 'zod';
import { generateExplain } from '../../../lib/ai';

export async function POST(req) {
  try {
    const body = z.object({
      child: z.enum(['ethan', 'valentino', 'enzo']),
      topic: z.string().trim().min(1),
    }).parse(await req.json());
    const explanation = await generateExplain(body.child, body.topic);
    return Response.json({ explanation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return Response.json({ error: 'Unable to generate explanation' }, { status: 500 });
  }
}
