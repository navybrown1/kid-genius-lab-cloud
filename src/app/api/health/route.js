import { getAiRuntimeConfig, testKimiConnection } from '../../../lib/ai';

export async function GET(req) {
  const url = new URL(req.url);
  const checkAi = url.searchParams.get('ai') === '1';

  if (!checkAi) {
    return Response.json({
      ok: true,
      app: 'Kid Genius Lab Cloud',
      ai: getAiRuntimeConfig(),
      hint: 'Add ?ai=1 to run a live Kimi connection test.',
    });
  }

  const ai = await testKimiConnection();
  return Response.json({
    ok: ai.ok,
    status: ai.ok ? 'online' : 'degraded',
    app: 'Kid Genius Lab Cloud',
    ai,
  });
}
