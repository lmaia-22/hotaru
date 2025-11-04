import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('User search auth error:', authError);
      console.error('User:', user);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .or(`email.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20);

    if (error) {
      console.error('Error querying profiles:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const filteredUsers = profiles?.filter((p) => p.id !== user.id) || [];
    
    console.log('User search results:', {
      query,
      totalProfiles: profiles?.length || 0,
      filteredCount: filteredUsers.length,
      currentUserId: user.id,
    });

    return NextResponse.json({
      users: filteredUsers,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
