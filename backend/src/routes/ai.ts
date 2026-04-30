import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { gateway } from '@specific-dev/framework';
import { streamText, generateText } from 'ai';
import { z } from 'zod';

const coachingChatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
});

const mealSuggestionsSchema = z.object({
  targetCalories: z.number().optional(),
  targetProtein: z.number().optional(),
  targetCarbs: z.number().optional(),
  targetFat: z.number().optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  mealType: z.string().optional(),
});

export function registerAiRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/ai/coaching - AI coaching chat using GPT-5.2
   */
  app.fastify.post('/api/ai/coaching', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = coachingChatSchema.safeParse(request.body);
      if (!validation.success) {
        app.logger.warn({ errors: validation.error.issues }, 'Invalid coaching chat request');
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      const { messages } = validation.data;

      app.logger.info(
        { messageCount: messages.length, userId: session.user.id },
        'Starting AI coaching chat'
      );

      const result = await streamText({
        model: gateway('openai/gpt-5.2'),
        system: `You are a professional fitness coach with expertise in nutrition, workout planning, and fitness goals.
You provide personalized fitness advice based on the user's goals and current fitness level.
Keep responses concise and actionable. Ask clarifying questions when needed to better understand the user's needs.
Provide evidence-based recommendations and encourage healthy habits.`,
        messages,
      });

      // Return as Server-Sent Events (SSE)
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      });

      for await (const textPart of result.textStream) {
        reply.raw.write(`data: ${JSON.stringify({ text: textPart })}\n\n`);
      }

      reply.raw.end();

      app.logger.info({ userId: session.user.id }, 'AI coaching chat completed');
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Error in AI coaching chat');
      return reply.status(500).send({ error: 'Failed to generate coaching response' });
    }
  });

  /**
   * POST /api/ai/meal-suggestions - AI meal suggestions based on macros
   */
  app.fastify.post('/api/ai/meal-suggestions', async (
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
  ): Promise<any> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    try {
      const validation = mealSuggestionsSchema.safeParse(request.body);
      if (!validation.success) {
        app.logger.warn({ errors: validation.error.issues }, 'Invalid meal suggestions request');
        return reply.status(400).send({ error: 'Invalid request body' });
      }

      app.logger.info({ userId: session.user.id }, 'Generating AI meal suggestions');

      const {
        targetCalories = 2000,
        targetProtein = 150,
        targetCarbs = 200,
        targetFat = 65,
        dietaryRestrictions = [],
        mealType = 'any',
      } = validation.data;

      const restrictionsText =
        dietaryRestrictions.length > 0
          ? `Dietary restrictions: ${dietaryRestrictions.join(', ')}`
          : 'No dietary restrictions';

      const prompt = `Based on the following macro targets, suggest 3 nutritious meal options:
Target Calories: ${targetCalories}
Target Protein: ${targetProtein}g
Target Carbs: ${targetCarbs}g
Target Fat: ${targetFat}g
Meal Type: ${mealType}
${restrictionsText}

For each meal, provide:
1. Meal name
2. Ingredients with quantities
3. Estimated calories
4. Estimated macros (protein, carbs, fat)
5. Preparation time
6. Brief cooking instructions

Format as a JSON array with objects containing the above fields.`;

      const { text } = await generateText({
        model: gateway('openai/gpt-5.2'),
        system: `You are a professional nutritionist. Provide practical, delicious meal suggestions that meet specific macro targets.
Always respond with valid JSON that can be parsed. Return an array of meal objects.`,
        prompt,
        temperature: 0.7,
      });

      // Try to parse the response as JSON
      let meals;
      try {
        // Extract JSON from the response (handle potential markdown code blocks)
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          meals = JSON.parse(jsonMatch[0]);
        } else {
          meals = JSON.parse(text);
        }
      } catch {
        // If JSON parsing fails, return the raw text
        meals = text;
      }

      app.logger.info(
        {
          userId: session.user.id,
          mealCount: Array.isArray(meals) ? meals.length : 0,
          targetCalories,
        },
        'AI meal suggestions generated'
      );

      return {
        meals,
        targetMacros: {
          calories: targetCalories,
          protein: targetProtein,
          carbs: targetCarbs,
          fat: targetFat,
        },
      };
    } catch (error) {
      app.logger.error({ err: error, userId: session.user.id }, 'Error generating meal suggestions');
      return reply.status(500).send({ error: 'Failed to generate meal suggestions' });
    }
  });
}
