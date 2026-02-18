import { NextRequest, NextResponse } from 'next/server';
import { generateDailySeedPosts, publishSeedPosts, validateSeedPost } from '@/lib/ai/seed-content';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-for-build'
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      action = 'generate',
      count = 10,
      channels = [],
      publish = false,
      authorId 
    } = body;

    if (action === 'generate') {
      // Generate seed posts
      const seedPosts = await generateDailySeedPosts(count, channels);
      
      if (seedPosts.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'No seed posts could be generated',
          data: []
        }, { status: 400 });
      }

      // Validate posts if requested
      const validatedPosts = [];
      for (const post of seedPosts) {
        const validation = await validateSeedPost(post);
        validatedPosts.push({
          ...post,
          validation
        });
      }

      // Publish if requested
      let publishResult = null;
      if (publish) {
        const postsToPublish = validatedPosts
          .filter(p => p.validation.isValid)
          .map(p => ({ ...p, validation: undefined }));
        
        if (postsToPublish.length > 0) {
          publishResult = await publishSeedPosts(postsToPublish, authorId);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Generated ${seedPosts.length} seed posts`,
        data: {
          posts: validatedPosts,
          publishResult
        }
      });

    } else if (action === 'publish') {
      // Publish provided posts
      const { posts } = body;
      
      if (!posts || !Array.isArray(posts)) {
        return NextResponse.json({
          success: false,
          message: 'Posts array is required for publish action'
        }, { status: 400 });
      }

      const publishResult = await publishSeedPosts(posts, authorId);
      
      return NextResponse.json({
        success: true,
        message: `Published ${publishResult.success} posts, ${publishResult.failed} failed`,
        data: publishResult
      });

    } else {
      return NextResponse.json({
        success: false,
        message: 'Invalid action. Use "generate" or "publish"'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Seed content API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelName = searchParams.get('channel');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get recent AI-generated posts
    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        created_at,
        upvotes,
        downvotes,
        comment_count,
        flair,
        channels!inner(name, display_name)
      `)
      .eq('ai_generated', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (channelName) {
      query = query.eq('channels.name', channelName);
    }

    const { data: posts, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `Retrieved ${posts?.length || 0} AI-generated posts`,
      data: posts || []
    });

  } catch (error) {
    console.error('Get seed content API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve seed content',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const olderThan = searchParams.get('olderThan'); // ISO date string

    if (postId) {
      // Delete specific post
      const { error } = await supabase
        .from('posts')
        .update({ is_deleted: true })
        .eq('id', postId)
        .eq('ai_generated', true);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: 'Post deleted successfully'
      });

    } else if (olderThan) {
      // Delete posts older than specified date
      const { error } = await supabase
        .from('posts')
        .update({ is_deleted: true })
        .eq('ai_generated', true)
        .lt('created_at', olderThan);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: 'Old AI posts deleted successfully'
      });

    } else {
      return NextResponse.json({
        success: false,
        message: 'Either postId or olderThan parameter is required'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Delete seed content API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete seed content',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}