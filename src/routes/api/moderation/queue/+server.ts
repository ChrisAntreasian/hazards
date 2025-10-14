import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ModerationQueue } from '$lib/utils/moderation';

export const GET: RequestHandler = async (event) => {
  try {
    const url = new URL(event.request.url);
    const status = url.searchParams.get('status') as 'pending' | 'approved' | 'rejected' | undefined;
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const queue = new ModerationQueue(event);
    const result = await queue.getQueue(status, limit, offset);

    return json(result);

  } catch (error) {
    console.error('Error getting moderation queue:', error);
    return json(
      { error: 'Failed to get moderation queue' },
      { status: 500 }
    );
  }
};
