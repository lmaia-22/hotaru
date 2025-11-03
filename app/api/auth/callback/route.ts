import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const searchParams = requestUrl.searchParams;
  
  // Get parameters from query string (hash is client-side only)
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const next = searchParams.get('next') ?? '/';

  // Handle errors first
  if (error || errorDescription) {
    const errorMsg = errorDescription || error || 'Authentication failed';
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(errorMsg)}`);
  }

  // Check for token (magic link) or code (OAuth/magic link)
  const token = searchParams.get('token');
  const type = searchParams.get('type'); // 'magiclink' for magic links
  const email = searchParams.get('email'); // Email from magic link
  
  if (code || (token && type === 'magiclink')) {
    // Create a response object that we can modify with cookies
    const response = NextResponse.next();
    const supabase = await createClient();
    
    let authError = null;
    
    // Handle magic link authentication
    if (token && type === 'magiclink') {
      // Magic links need email and token
      if (email) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'magiclink',
        });
        authError = verifyError;
      } else {
        // Try with token_hash as fallback
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'magiclink',
        });
        authError = verifyError;
      }
    } 
    // Handle code parameter (OAuth or magic link)
    else if (code) {
      // For OAuth (when no type='magiclink'), always use exchangeCodeForSession
      // The @supabase/ssr server client manages PKCE automatically via cookies
      if (type !== 'magiclink') {
        // OAuth flow - use exchangeCodeForSession
        console.log('Processing OAuth callback on server...');
        
        // Check if we have cookies that might contain PKCE data
        const cookieStore = await import('next/headers').then(m => m.cookies());
        const allCookies = cookieStore.getAll();
        const hasSupabaseCookies = allCookies.some(c => c.name.includes('supabase') || c.name.includes('sb-'));
        console.log('Cookies check:', { 
          totalCookies: allCookies.length, 
          hasSupabaseCookies,
          cookieNames: allCookies.map(c => c.name).slice(0, 5)
        });
        
        const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        authError = exchangeError;
        
        if (!authError && sessionData?.session) {
          console.log('OAuth authentication successful on server');
        } else if (authError) {
          console.error('OAuth exchangeCodeForSession error:', authError);
          console.error('This might indicate that PKCE cookies were not preserved during the OAuth flow.');
        }
      } else {
        // Magic link with code - try verifyOtp first
        if (email) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token: code,
            type: 'magiclink',
          });
          if (verifyError) {
            // Fallback to exchangeCodeForSession if verifyOtp fails
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            authError = exchangeError || verifyError;
          }
        } else {
          // Try exchangeCodeForSession for magic links with code but no email
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          authError = exchangeError;
        }
      }
    }
    
    if (authError) {
      console.error('Auth error:', authError);
      console.error('Parameters:', { code: !!code, token: !!token, type, email: !!email });
      
      // Provide helpful error message
      let errorMsg = authError.message;
      
      if (authError.message.includes('code verifier') || authError.message.includes('code_verifier')) {
        if (type !== 'magiclink') {
          errorMsg = 'OAuth authentication failed: PKCE session expired. This usually means cookies were not preserved. Please try again and ensure you\'re using the same browser window. If the problem persists, check your browser\'s cookie settings.';
        } else {
          errorMsg = 'Session expired. Please request a new login link and use it immediately.';
        }
      } else if (authError.message.includes('expired') || authError.message.includes('invalid')) {
        errorMsg = 'This link has expired or already been used. Please request a new login link.';
      }
      
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(errorMsg)}`);
    }

    // Create or update profile
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (user) {
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email!,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || null,
            updated_at: new Date().toISOString(),
          } as any, {
            onConflict: 'id',
          });
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      } catch (profileError) {
        // Log but don't fail auth if profile creation fails
        console.error('Profile creation error:', profileError);
      }
    }

    const forwardedHost = request.headers.get('x-forwarded-host');
    const isLocalEnv = process.env.NODE_ENV === 'development';
    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}${next}`);
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${next}`);
    } else {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code and no error - redirect to login
  return NextResponse.redirect(`${origin}/auth/login`);
}
