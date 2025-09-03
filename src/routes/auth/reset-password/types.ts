import type { PageServerLoad } from './$types';

export type PageData = {
  user: {
    id: string;
    email: string;
  } | null;
  error: string | null;
};
