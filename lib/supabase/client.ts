import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Automatically detect and exchange session from URL (for PKCE flow)
        // This helps when magic links are opened in new tabs/windows
        detectSessionInUrl: true,
        // Use PKCE flow for better security
        flowType: 'pkce',
      },
    }
  );
}
