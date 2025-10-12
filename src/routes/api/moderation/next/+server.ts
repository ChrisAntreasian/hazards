import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ModerationQueue } from '$lib/utils/moderation.js';

export const POST: RequestHandler = async (event) => {
  try {
    const { moderatorId, specificItemId } = await event.request.json();
    
    if (!moderatorId) {
      return json({ error: 'Moderator ID is required' }, { status: 400 });
    }

    const queue = new ModerationQueue(event);
    
    // If a specific item is requested, get that one
    if (specificItemId) {
      const item = await queue.getSpecificItem(specificItemId, moderatorId);
      return json({ item });
    }
    
    // Otherwise get the next item in queue
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
