import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ModerationQueue } from '$lib/utils/moderation.js';

export const GET: RequestHandler = async (event) => {
  try {
    const queue = new ModerationQueue(event);
    const stats = await queue.getStats();

    return json({ stats });

  } catch (error) {
    console.error('Error getting moderation stats:', error);
    return json(
      { error: 'Failed to get moderation stats' },
      { status: 500 }
    );
  }
};
