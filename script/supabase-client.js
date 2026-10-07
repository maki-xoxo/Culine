import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://vmdoojppbolonlmjgxtk.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_4tkr-ghFSw6ItmNEhV38qQ_Z7k92y9c';

export const supabaseConfigured =
  !SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
  !SUPABASE_PUBLISHABLE_KEY.includes('REPLACE_WITH');

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

