import { NextRequest, NextResponse } from 'next/server';
import { 
  analyzeRealTimeTrends,
  generateChannelSuggestions,
  autoCreateChannels,
  suggestCrossPosts,
  getExistingChannels,
  runTrendAnalysisTask
} from '@/lib/ai/trends';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'analyze-trends': {
        const { timeframe = '24h' } = params;
        
        const trends = await analyzeRealTimeTrends(timeframe);
        
        return NextResponse.json({
          success: true,
          message: `Analyzed ${trends.length} trending topics`,
          data: trends
        });
      }

      case 'suggest-channels': {
        const { timeframe = '24h', minConfidence = 70 } = params;
        
        // Get trending topics
        const trends = await analyzeRealTimeTrends(timeframe);
        const highConfidenceTrends = trends.filter(t => t.confidence >= minConfidence);
        
        if (highConfidenceTrends.length === 0) {
          return NextResponse.json({
            success: false,
            message: 'No high-confidence trends found for channel suggestions'
          });
        }
        
        // Generate suggestions
        const existingChannels = await getExistingChannels();
        const suggestions = await generateChannelSuggestions(highConfidenceTrends, existingChannels);
        
        return NextResponse.json({
          success: true,
          message: `Generated ${suggestions.length} channel suggestions`,
          data: {
            trends: highConfidenceTrends,
            suggestions
          }
        });
      }

      case 'create-channels': {
        const { suggestions, minInterestThreshold = 80 } = params;
        
        if (!suggestions || !Array.isArray(suggestions)) {
          return NextResponse.json({
            success: false,
            message: 'Suggestions array is required'
          }, { status: 400 });
        }
        
        const results = await autoCreateChannels(suggestions, minInterestThreshold);
        
        return NextResponse.json({
          success: results.created > 0,
          message: `Created ${results.created} channels, ${results.failed} failed`,
          data: results
        });
      }

      case 'suggest-crossposts': {
        const { postId, postTitle, postContent, currentChannel, limit = 3 } = params;
        
        if (!postId || !postTitle || !postContent || !currentChannel) {
          return NextResponse.json({
            success: false,
            message: 'Missing required parameters: postId, postTitle, postContent, currentChannel'
          }, { status: 400 });
        }
        
        const suggestions = await suggestCrossPosts(
          postId,
          postTitle,
          postContent,
          currentChannel,
          limit
        );
        
        return NextResponse.json({
          success: !!suggestions,
          message: suggestions ? 'Cross-post suggestions generated' : 'No suitable cross-posts found',
          data: suggestions
        });
      }

      case 'run-trend-analysis': {
        const results = await runTrendAnalysisTask();
        
        return NextResponse.json({
          success: true,
          message: `Trend analysis complete: ${results.trendsAnalyzed} trends, ${results.channelsCreated} channels created`,
          data: results
        });
      }

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Available actions: analyze-trends, suggest-channels, create-channels, suggest-crossposts, run-trend-analysis'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Trends API error:', error);
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

    switch (action) {
      case 'trending-topics': {
        const timeframe = (searchParams.get('timeframe') || '24h') as '1h' | '6h' | '24h' | '7d';
        const trends = await analyzeRealTimeTrends(timeframe);
        
        return NextResponse.json({
          success: true,
          message: `Retrieved ${trends.length} trending topics`,
          data: trends
        });
      }

      case 'existing-channels': {
        const channels = await getExistingChannels();
        
        return NextResponse.json({
          success: true,
          message: `Retrieved ${channels.length} existing channels`,
          data: channels
        });
      }

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Available actions: trending-topics, existing-channels'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Get trends API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve trend data',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}