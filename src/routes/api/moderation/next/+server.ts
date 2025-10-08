import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ModerationQueue } from '$lib/utils/moderation.js';

export const POST: RequestHandler = async (event) => {
  try {
    const { moderatorId } = await event.request.json();
    
    if (!moderatorId) {
      return json({ error: 'Moderator ID is required' }, { status: 400 });
    }

    const queue = new ModerationQueue(event);
    const item = await queue.getNextItem(moderatorId);

    return json({ item });

  } catch (error) {
    console.error('Error getting next moderation item:', error);
    return json(
      { error: 'Failed to get next moderation item' },
      { status: 500 }
    );
  }
};
