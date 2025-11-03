import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPaste, getAllAccessiblePastes, getUserPastes } from '@/lib/paste';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const createPasteSchema = z.object({
  content: z.string().max(100 * 1024, 'Content must be less than 100 KB'),
  visibility: z.enum(['public', 'private']),
  shared_with: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');

    let pastes;
    if (type === 'mine') {
      pastes = await getUserPastes(user.id, limit);
    } else {
      pastes = await getAllAccessiblePastes(user.id, limit);
    }

    return NextResponse.json({ pastes });
  } catch (error: any) {
    console.error('Error fetching pastes:', error);
    
    // Handle Redis authentication errors
    if (error?.message?.includes('WRONGPASS') || error?.message?.includes('auth token')) {
      return NextResponse.json(
        { 
          error: 'Redis configuration error',
          message: 'Upstash Redis authentication failed. Please check your UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables in your .env.local file.',
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetAt: rateLimit.resetAt,
          remaining: rateLimit.remaining,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validated = createPasteSchema.parse(body);

    // Validate shared_with users if visibility is private
    if (validated.visibility === 'private' && validated.shared_with) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .in('id', validated.shared_with);

      if (!profiles || profiles.length !== validated.shared_with.length) {
        return NextResponse.json(
          { error: 'Invalid user IDs in shared_with' },
          { status: 400 }
        );
      }
    }

    const paste = await createPaste(user.id, {
      content: validated.content,
      visibility: validated.visibility,
      shared_with: validated.shared_with,
    });

    return NextResponse.json(
      { paste, rateLimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt } },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating paste:', error);
    
    // Handle Redis authentication errors
    if (error?.message?.includes('WRONGPASS') || error?.message?.includes('auth token')) {
      return NextResponse.json(
        { 
          error: 'Redis configuration error',
          message: 'Upstash Redis authentication failed. Please check your UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables in your .env.local file.',
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
