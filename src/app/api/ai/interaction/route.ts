import { NextRequest, NextResponse } from 'next/server';
import { 
  generateEngagementComment,
  generatePostSummary,
  translateAndPost,
  findInactivePosts,
  findPostsNeedingSummary,
  postAIComment,
  postSummaryComment,
  runEngagementTasks
} from '@/lib/ai/interaction';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'generate-comment': {
        const { postId, postTitle, postContent, channelTheme, existingComments } = params;
        
        if (!postId || !postTitle || !postContent || !channelTheme) {
          return NextResponse.json({
            success: false,
            message: 'Missing required parameters: postId, postTitle, postContent, channelTheme'
          }, { status: 400 });
        }
        
        const comment = await generateEngagementComment(
          postId,
          postTitle,
          postContent,
          channelTheme,
          existingComments
        );
        
        return NextResponse.json({
          success: !!comment,
          message: comment ? 'Comment generated successfully' : 'No comment generated',
          data: comment
        });
      }

      case 'post-comment': {
        const { postId, postTitle, postContent, channelTheme, existingComments } = params;
        
        if (!postId || !postTitle || !postContent || !channelTheme) {
          return NextResponse.json({
            success: false,
            message: 'Missing required parameters'
          }, { status: 400 });
        }
        
        const comment = await generateEngagementComment(
          postId,
          postTitle,
          postContent,
          channelTheme,
          existingComments
        );
        
        if (!comment || comment.confidence < 70) {
          return NextResponse.json({
            success: false,
            message: 'Could not generate high-quality comment'
          });
        }
        
        const result = await postAIComment(postId, comment.content, comment.type);
        
        return NextResponse.json({
          success: result.success,
          message: result.success ? 'Comment posted successfully' : result.error,
          data: { commentId: result.commentId, comment }
        });
      }

      case 'generate-summary': {
        const { postId, title, content } = params;
        
        if (!postId || !title || !content) {
          return NextResponse.json({
            success: false,
            message: 'Missing required parameters: postId, title, content'
          }, { status: 400 });
        }
        
        const summary = await generatePostSummary(postId, title, content);
        
        return NextResponse.json({
          success: !!summary,
          message: summary ? 'Summary generated successfully' : 'No summary generated',
          data: summary
        });
      }

      case 'post-summary': {
        const { postId, title, content } = params;
        
        if (!postId || !title || !content) {
          return NextResponse.json({
            success: false,
            message: 'Missing required parameters'
          }, { status: 400 });
        }
        
        const summary = await generatePostSummary(postId, title, content);
        
        if (!summary || summary.confidence < 70) {
          return NextResponse.json({
            success: false,
            message: 'Could not generate high-quality summary'
          });
        }
        
        const result = await postSummaryComment(postId, summary);
        
        return NextResponse.json({
          success: result.success,
          message: result.success ? 'Summary posted successfully' : result.error,
          data: { commentId: result.commentId, summary }
        });
      }

      case 'translate': {
        const { content, sourceLanguage, targetChannel, originalUrl } = params;
        
        if (!content || !sourceLanguage || !targetChannel) {
          return NextResponse.json({
            success: false,
            message: 'Missing required parameters: content, sourceLanguage, targetChannel'
          }, { status: 400 });
        }
        
        const translation = await translateAndPost(
          content,
          sourceLanguage,
          targetChannel,
          originalUrl
        );
        
        return NextResponse.json({
          success: !!translation,
          message: translation ? 'Translation completed successfully' : 'Translation failed',
          data: translation
        });
      }

      case 'run-engagement-tasks': {
        const results = await runEngagementTasks();
        
        return NextResponse.json({
          success: true,
          message: `Generated ${results.commentsGenerated} comments and ${results.summariesGenerated} summaries`,
          data: results
        });
      }

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Available actions: generate-comment, post-comment, generate-summary, post-summary, translate, run-engagement-tasks'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('AI interaction API error:', error);
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
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '10');

    switch (action) {
      case 'inactive-posts': {
        const hoursThreshold = parseInt(searchParams.get('hours') || '24');
        const posts = await findInactivePosts(hoursThreshold, limit);
        
        return NextResponse.json({
          success: true,
          message: `Found ${posts.length} inactive posts`,
          data: posts
        });
      }

      case 'posts-needing-summary': {
        const minLength = parseInt(searchParams.get('minLength') || '500');
        const posts = await findPostsNeedingSummary(minLength, limit);
        
        return NextResponse.json({
          success: true,
          message: `Found ${posts.length} posts needing summary`,
          data: posts
        });
      }

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Available actions: inactive-posts, posts-needing-summary'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Get AI interaction API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve data',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}