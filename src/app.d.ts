// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import { SupabaseClient, Session } from '@supabase/supabase-js';
import type { Database } from './lib/types/database';

declare global {
namespace App {
interface Locals {
supabase: SupabaseClient<Database>;
getSession(): Promise<Session | null>;
}
interface PageData {
session: Session | null;
}
// interface Error {}
// interface PageState {}
// interface Platform {}
}
}

// PWA virtual module types
declare module 'virtual:pwa-register' {
export interface RegisterSWOptions {
immediate?: boolean;
onNeedRefresh?: () => void;
onOfflineReady?: () => void;
onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
onRegisterError?: (error: Error) => void;
}

export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => void;
}

export {};
