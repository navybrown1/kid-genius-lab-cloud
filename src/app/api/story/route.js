import { z } from 'zod';
import { generateStory } from '../../../lib/ai';

export async function POST(req) {
  try {
    const body = z.object({
      child: z.enum(['ethan', 'valentino', 'enzo']),
      theme: z.string().min(1),
    }).parse(await req.json());
    const story = await generateStory(body.child, body.theme);
    return Response.json({ story });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return Response.json({ error: 'Unable to generate story' }, { status: 500 });
  }
}
