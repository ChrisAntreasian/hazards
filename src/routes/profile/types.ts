import type { User } from '@supabase/supabase-js';

export interface CustomUser {
  id: string;
  email: string | undefined;
  displayName: string;
  emailConfirmed: boolean;
  createdAt: string;
}

export interface Region {
  id: string;
  name: string;
  timezone: string;
  // Add other region properties as needed
}

export interface ProfilePageData {
  user: CustomUser;
  regions: Region[];
}

export interface ProfileActionData {
  success?: boolean;
  message?: string;
  error?: string;
  user?: CustomUser;
}
