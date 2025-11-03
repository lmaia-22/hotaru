import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPaste, deletePaste } from '@/lib/paste';

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paste = await getPaste(params.id);
    if (!paste) {
      return NextResponse.json({ error: 'Paste not found' }, { status: 404 });
    }

    // Check access
    if (
      paste.visibility === 'private' &&
      paste.user_id !== user.id &&
      !paste.shared_with.includes(user.id)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ paste });
  } catch (error) {
    console.error('Error fetching paste:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pasteId = params.id;
    console.log(`Attempting to delete paste ${pasteId} for user ${user.id}`);
    
    const paste = await getPaste(pasteId);
    if (!paste) {
      console.log(`Paste ${pasteId} not found`);
      return NextResponse.json({ error: 'Paste not found' }, { status: 404 });
    }

    if (paste.user_id !== user.id) {
      console.log(`User ${user.id} attempted to delete paste owned by ${paste.user_id}`);
      return NextResponse.json({ error: 'You can only delete your own pastes' }, { status: 403 });
    }

    const success = await deletePaste(pasteId, user.id);
    if (!success) {
      console.error(`Failed to delete paste ${pasteId} for user ${user.id}`);
      return NextResponse.json({ error: 'Failed to delete paste' }, { status: 500 });
    }

    console.log(`Successfully deleted paste ${pasteId} for user ${user.id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting paste:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
