import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { email } = await request.json();

    if (!email) {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createSupabaseServerClient(cookies);

    if (!supabase) {
      return json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Resend confirmation error:', error);
      return json({ error: error.message }, { status: 400 });
    }

    return json({ message: 'Confirmation email sent successfully' });
  } catch (err) {
    console.error('Resend confirmation exception:', err);
    return json({ error: 'Failed to resend confirmation email' }, { status: 500 });
  }
};
