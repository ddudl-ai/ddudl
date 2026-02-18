import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MasterService } from '@/lib/services/master';
import type { ModerationActionRequest } from '@/types';

const masterService = new MasterService();

// GET /api/master/moderation - Get moderation queue
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channel_id');
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    // Check if user is a master
    const master = await masterService.checkMasterPermission(user.id, channelId);
    if (!master || !master.permissions.canReviewAIDecisions) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view moderation queue' },
        { status: 403 }
      );
    }

    // Get queue items
    const queueItems = await masterService.getModerationQueue(channelId, status, limit);

    // Enrich queue items with additional data
    const enrichedItems = await Promise.all(
      queueItems.map(async (item) => {
        let targetData = null;
        
        if (item.targetType === 'post') {
          const { data } = await supabase
            .from('posts')
            .select('id, title, content, author_id, created_at')
            .eq('id', item.targetId)
            .single();
          targetData = data;
        } else if (item.targetType === 'comment') {
          const { data } = await supabase
            .from('comments')
            .select('id, content, author_id, created_at')
            .eq('id', item.targetId)
            .single();
          targetData = data;
        } else if (item.targetType === 'user') {
          const { data } = await supabase
            .from('profiles')
            .select('id, username, karma_score, created_at')
            .eq('id', item.targetId)
            .single();
          targetData = data;
        }

        return {
          ...item,
          targetData
        };
      })
    );

    return NextResponse.json({
      items: enrichedItems,
      total: enrichedItems.length,
      status
    });
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moderation queue' },
      { status: 500 }
    );
  }
}

// POST /api/master/moderation - Process moderation action
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: ModerationActionRequest = await request.json();
    
    // Process the moderation action
    const result = await masterService.processModerationAction(body, user.id);

    // Send notification if escalated
    if (body.action === 'escalate') {
      // Find higher-level masters
      const { data: owners } = await supabase
        .from('channel_masters')
        .select('id')
        .eq('channel_id', result.channelId) // Using channelId matching result
        .eq('role', 'owner');

      if (owners) {
        for (const owner of owners) {
          await masterService.createNotification({
            masterId: owner.id,
            type: 'queue_threshold',
            title: 'Escalated Moderation Item',
            message: `A moderation item has been escalated for review: ${body.reason || 'No reason provided'}`,
            priority: 'high',
            actionRequired: true,
            actionUrl: `/master/moderation/${result.id}`
          });
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing moderation action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process action' },
      { status: 500 }
    );
  }
}

// PUT /api/master/moderation/assign - Assign queue item to master
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { queueItemId, assignToSelf = true } = await request.json();

    if (!queueItemId) {
      return NextResponse.json(
        { error: 'Queue item ID is required' },
        { status: 400 }
      );
    }

    // Get queue item
    const { data: queueItem, error: fetchError } = await supabase
      .from('moderation_queue')
      .select('channel_id')
      .eq('id', queueItemId)
      .single();

    if (fetchError || !queueItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const master = await masterService.checkMasterPermission(user.id, queueItem.channel_id);
    if (!master || !master.permissions.canReviewAIDecisions) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Assign item
    const { data, error } = await supabase
      .from('moderation_queue')
      .update({
        assigned_to: assignToSelf ? master.id : null
      })
      .eq('id', queueItemId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error assigning queue item:', error);
    return NextResponse.json(
      { error: 'Failed to assign queue item' },
      { status: 500 }
    );
  }
}