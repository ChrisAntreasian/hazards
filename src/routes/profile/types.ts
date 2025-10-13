export interface CustomUser {
  id: string;
  email: string | undefined;
  displayName: string;
  emailConfirmed: boolean;
  createdAt: string;
  role: string;
  trustScore: number;
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
