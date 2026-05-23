import { z } from 'zod';
import {
  generateEncouragement,
  generateFeedback,
  generateHint,
  generateParentSummary,
  generatePracticeQuestions,
  generateTutorAnswer,
} from '../../../lib/ai';
import { loadAppState, normalizeAppState, nextDifficulty, saveAppState, summarizePerformance, updateChildProgress } from '../../../lib/app-state';

const requestSchema = z.object({
  child: z.enum(['ethan', 'valentino', 'enzo']),
  topic: z.string().trim().min(1),
  mode: z.enum(['tutor', 'practice', 'hint', 'feedback', 'encouragement', 'summary']),
  question: z.string().optional().default(''),
  answer: z.string().optional().default(''),
});
// Scale factor: 100 stars maps to a 1.0 encouragement score, so the prompt treats a fully
// progressed child as "max confidence" and scales lower star counts proportionally.
const ENCOURAGEMENT_STAR_SCALE = 100;

export async function POST(req) {
  try {
    const payload = requestSchema.parse(await req.json());
    const state = await loadAppState();
    const childState = summarizePerformance(state, payload.child);

    if (payload.mode === 'tutor') {
      return Response.json(
        await generateTutorAnswer(payload.child, payload.topic, childState.level, childState.lastDifficulty)
      );
    }

    if (payload.mode === 'practice') {
      return Response.json(
        await generatePracticeQuestions(payload.child, payload.topic, childState.level, childState.lastDifficulty)
      );
    }

    if (payload.mode === 'hint') {
      return Response.json(
        await generateHint(payload.child, payload.topic, payload.question, childState.level)
      );
    }

    if (payload.mode === 'feedback') {
      const feedback = await generateFeedback(
        payload.child,
        payload.topic,
        payload.question,
        payload.answer,
        childState.level,
        childState.lastDifficulty
      );
      const performance = Math.max(0, Math.min(1, feedback.score / 100));
      const updated = updateChildProgress(state, payload.child, {
        topic: payload.topic,
        performance,
        starsDelta: performance >= 0.7 ? 2 : 1,
        quizCountDelta: 1,
        practiceCountDelta: 1,
        lastDifficulty: nextDifficulty(childState.lastDifficulty, performance),
        masteredTopic: performance >= 0.75 ? payload.topic : undefined,
        struggleTopic: performance < 0.55 ? payload.topic : undefined,
        historyEntry: {
          kind: 'quiz-feedback',
          topic: payload.topic,
          score: feedback.score,
          question: payload.question,
        },
      });
      await saveAppState(updated);
      return Response.json({
        feedback,
        state: updated,
        progress: summarizePerformance(normalizeAppState(updated), payload.child),
      });
    }

    if (payload.mode === 'encouragement') {
      return Response.json({
        message: await generateEncouragement(
          payload.child,
          payload.topic,
          Math.min(1, Math.max(0, childState.stars / ENCOURAGEMENT_STAR_SCALE))
        ),
      });
    }

    const summary = await generateParentSummary(payload.child, payload.topic, childState);
    return Response.json({
      summary,
      progress: childState,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }

    return Response.json({ error: 'Unable to generate learning response' }, { status: 500 });
  }
}
