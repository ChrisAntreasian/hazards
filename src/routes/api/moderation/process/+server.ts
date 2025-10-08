import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ModerationQueue } from '$lib/utils/moderation.js';

export const POST: RequestHandler = async (event) => {
  try {
    const { itemId, action, moderatorId } = await event.request.json();
    
    if (!itemId || !action || !moderatorId) {
      return json({ 
        error: 'Item ID, action, and moderator ID are required' 
      }, { status: 400 });
    }

    const queue = new ModerationQueue(event);
    await queue.processAction(itemId, action, moderatorId);

    return json({ success: true });

  } catch (error) {
    console.error('Error processing moderation action:', error);
    return json(
      { error: 'Failed to process moderation action' },
      { status: 500 }
    );
  }
};
