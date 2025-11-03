'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  
  // Check if Supabase automatically detected and exchanged the session
  // This happens when detectSessionInUrl is true and PKCE flow is used

  useEffect(() => {
    const createOrUpdateProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Call API to create/update profile
          await fetch('/api/profiles', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || null,
            }),
          });
        }
      } catch (err) {
        console.error('Profile creation error:', err);
        // Don't fail auth if profile creation fails
      }
    };

    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        const email = searchParams.get('email');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle errors from URL
        if (errorParam || errorDescription) {
          setError(errorDescription || errorParam || 'Authentication failed');
          setStatus('error');
          setTimeout(() => router.push(`/auth/login?error=${encodeURIComponent(errorDescription || errorParam || 'Authentication failed')}`), 2000);
          return;
        }

        // With detectSessionInUrl: true, Supabase may have already detected and exchanged the session
        // Check if we already have a valid session before trying manual exchange
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          console.log('Session already detected by Supabase (detectSessionInUrl)');
          await createOrUpdateProfile();
          router.push('/');
          return;
        }

        // Handle magic link with token (old format, doesn't use PKCE)
        if (token && type === 'magiclink') {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            ...(email ? { email, token } : { token_hash: token }),
            type: 'magiclink',
          });

          if (verifyError) {
            setError(verifyError.message);
            setStatus('error');
            setTimeout(() => router.push(`/auth/login?error=${encodeURIComponent(verifyError.message)}`), 2000);
            return;
          }

          // Success - create/update profile and redirect to home
          await createOrUpdateProfile();
          router.push('/');
          return;
        }

        // Handle code (OAuth or magic link with PKCE)
        if (code) {
          // Log for debugging
          console.log('Processing callback with code:', {
            hasCode: !!code,
            hasEmail: !!email,
            hasToken: !!token,
            type,
            codeLength: code.length,
            codePreview: code.substring(0, 20) + '...',
          });

          // Determine if this is OAuth or magic link
          const savedEmail = localStorage.getItem('hotaru_magic_link_email');
          
          // Magic link indicators:
          // 1. type='magiclink' is definitive
          // 2. email in URL or localStorage suggests magic link
          // 3. We're on /auth/callback (client-side) - OAuth goes to /api/auth/callback (server-side)
          // 4. OAuth NEVER has email (GitHub/Google don't pass email in callback)
          const isDefinitelyMagicLink = type === 'magiclink';
          const hasEmail = !!email || !!savedEmail;
          
          // IMPORTANT: If we're on /auth/callback (this page), it's likely a magic link
          // because OAuth redirects go to /api/auth/callback (server-side route)
          // Magic links from email go to /auth/callback (client-side page)
          const isOnClientCallback = typeof window !== 'undefined' && window.location.pathname === '/auth/callback';
          
          // Magic link if: has type='magiclink' OR has email OR we're on client-side callback route
          // OAuth only goes to /api/auth/callback, never /auth/callback
          const isLikelyMagicLink = isDefinitelyMagicLink || hasEmail || isOnClientCallback;
          const isOAuthFlow = !isLikelyMagicLink; // Only OAuth if definitely not magic link
          
          console.log('Flow detection:', {
            isDefinitelyMagicLink,
            hasEmail,
            isOnClientCallback,
            isLikelyMagicLink,
            isOAuthFlow,
            emailInUrl: !!email,
            emailInStorage: !!savedEmail,
            pathname: typeof window !== 'undefined' ? window.location.pathname : 'server',
          });
          
          // Declare error variables in outer scope
          let verifyError: any = null;
          let verifyError2: any = null;
          let exchangeError: any = null;
          
          // Strategy: For magic links, try verifyOtp first (doesn't need PKCE/cookies)
          // For OAuth, must use exchangeCodeForSession (requires PKCE cookies)
          if (isLikelyMagicLink) {
            // Magic link: Try verifyOtp first (no PKCE needed, works in new tabs)
            const emailToUse = email || savedEmail;
            
            // IMPORTANT: When Supabase uses PKCE for magic links, it sends a 'code'
            // But verifyOtp expects a 'token', not 'code'. However, we can try it.
            // If verifyOtp fails, it means the magic link is using PKCE and we need cookies.
            
            // Try verifyOtp with email if available (this is the preferred method for magic links)
            if (emailToUse) {
              console.log('Magic link flow - attempting verifyOtp with email...', emailToUse);
              // Try with code as token (magic links with PKCE may send code instead of token)
              const result = await supabase.auth.verifyOtp({
                email: emailToUse,
                token: code,
                type: 'magiclink',
              });
              
              verifyError = result.error;

              if (!verifyError) {
                console.log('Magic link verified successfully with email via verifyOtp');
                localStorage.removeItem('hotaru_magic_link_email');
                await createOrUpdateProfile();
                router.push('/');
                return;
              }
              
              console.log('verifyOtp with email failed:', verifyError);
              console.log('This may indicate the magic link is using PKCE and requires cookies');
            }

            // Try verifyOtp with token_hash (alternative format)
            console.log('Attempting verifyOtp with token_hash...');
            const result2 = await supabase.auth.verifyOtp({
              token_hash: code,
              type: 'magiclink',
            });
            
            verifyError2 = result2.error;

            if (!verifyError2) {
              console.log('Magic link verified successfully with token_hash');
              localStorage.removeItem('hotaru_magic_link_email');
              await createOrUpdateProfile();
              router.push('/');
              return;
            }
            
            console.log('verifyOtp with token_hash failed:', verifyError2);
            
            // Fallback: Try exchangeCodeForSession for magic links with PKCE
            // This ONLY works if magic link was opened in same browser session where cookies exist
            // If opened from email in new tab, this will fail (PKCE requires code verifier in cookies)
            console.log('Attempting exchangeCodeForSession as fallback for magic link...');
            console.log('Note: This requires PKCE cookies to be available in the same session');
            const { data: sessionData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
            exchangeError = exchangeErr;

            if (!exchangeError && sessionData?.session) {
              console.log('Magic link authentication successful via exchangeCodeForSession');
              localStorage.removeItem('hotaru_magic_link_email');
              await createOrUpdateProfile();
              router.push('/');
              return;
            }
            
            console.log('exchangeCodeForSession failed for magic link:', exchangeError);
            console.log('This is expected if the magic link was opened in a new tab/window without cookies');
          } else {
            // OAuth flow: Must use exchangeCodeForSession (requires PKCE cookies)
            console.log('OAuth flow detected (no type=magiclink, no email) - attempting exchangeCodeForSession...');
            
            const { data: sessionData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
            exchangeError = exchangeErr;

            if (!exchangeError && sessionData?.session) {
              console.log('OAuth authentication successful');
              localStorage.removeItem('hotaru_magic_link_email'); // Clean up if exists
              await createOrUpdateProfile();
              router.push('/');
              return;
            }
            
            console.log('exchangeCodeForSession failed for OAuth:', exchangeError);
          }

          // All methods failed (if we reach here, none of the above succeeded)
          console.error('All authentication methods failed');
          console.error('Flow type:', isLikelyMagicLink ? 'Magic Link' : 'OAuth');
          console.error('verifyOtp with email error:', verifyError);
          console.error('verifyOtp with token_hash error:', verifyError2);
          console.error('exchangeCodeForSession error:', exchangeError);
          
          let errorMsg = 'Authentication failed. ';
          
          // Check if it's a PKCE issue
          const isPKCEError = exchangeError?.message?.includes('code verifier') || exchangeError?.message?.includes('code_verifier');
          
          // Check if token expired
          const isTokenExpired = verifyError?.message?.includes('expired') || verifyError?.message?.includes('invalid') || 
                                 verifyError2?.message?.includes('expired') || verifyError2?.message?.includes('invalid');
          
          // Determine error message based on flow type
          if (isLikelyMagicLink) {
            // Magic link-specific error messages
            if (isTokenExpired) {
              errorMsg += 'The magic link has expired or was already used. ';
              errorMsg += 'Magic links expire quickly for security. ';
              errorMsg += 'Please request a new login link and use it immediately (within a few minutes).';
            } else if (isPKCEError) {
              errorMsg += 'PKCE session expired or cookies not available. ';
              errorMsg += 'Magic links opened from email may not have access to PKCE cookies. ';
              errorMsg += 'Try requesting the magic link and clicking it in the SAME browser window/tab immediately. ';
              errorMsg += 'Alternatively, use OAuth (GitHub/Google) which handles this better.';
            } else if (verifyError) {
              errorMsg += `Magic link error: ${verifyError.message}`;
            } else if (verifyError2) {
              errorMsg += `Magic link error: ${verifyError2.message}`;
            } else if (exchangeError) {
              errorMsg += `Magic link error: ${exchangeError.message}`;
            } else {
              errorMsg += 'Unknown error occurred. The link may have expired or been used already.';
            }
          } else {
            // OAuth-specific error messages
            if (isPKCEError) {
              errorMsg += 'OAuth authentication failed: PKCE session expired or cookies not available. ';
              errorMsg += 'Please try again. Make sure you\'re using the same browser window. ';
              errorMsg += 'If the problem persists, check your browser\'s cookie settings and ensure third-party cookies are allowed.';
            } else if (exchangeError) {
              errorMsg += `OAuth error: ${exchangeError.message}`;
            } else {
              errorMsg += 'OAuth authentication failed. Please try again.';
            }
          }
          
          setError(errorMsg);
          setStatus('error');
          setTimeout(() => router.push(`/auth/login?error=${encodeURIComponent(errorMsg)}`), 3000);
          return;
        }

        // No code or token - redirect to login
        router.push('/auth/login');
      } catch (err: any) {
        console.error('Callback error:', err);
        setError(err.message || 'An unexpected error occurred');
        setStatus('error');
        setTimeout(() => router.push(`/auth/login?error=${encodeURIComponent(err.message || 'An unexpected error occurred')}`), 2000);
      }
    };

    handleCallback();
  }, [router, searchParams, supabase]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">✗</div>
          <p className="text-gray-600 dark:text-gray-400 mb-2">Authentication failed</p>
          {error && <p className="text-sm text-gray-500 dark:text-gray-500">{error}</p>}
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
