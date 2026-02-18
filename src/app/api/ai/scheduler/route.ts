import { NextRequest, NextResponse } from 'next/server';
import { 
  runDailySeedContentTask, 
  runEveningEngagementTask, 
  runContentCleanupTask,
  runScheduledTasks,
  getTaskHistory
} from '@/lib/ai/scheduler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, force: _force = false } = body;

    let result;

    switch (task) {
      case 'daily-seed-content':
        result = await runDailySeedContentTask();
        break;
        
      case 'evening-engagement':
        result = await runEveningEngagementTask();
        break;
        
      case 'content-cleanup':
        result = await runContentCleanupTask();
        break;
        
      case 'all-scheduled':
        const results = await runScheduledTasks();
        return NextResponse.json({
          success: true,
          message: `Executed ${results.length} scheduled tasks`,
          data: results
        });
        
      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid task name. Available tasks: daily-seed-content, evening-engagement, content-cleanup, all-scheduled'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result
    });

  } catch (error) {
    console.error('Scheduler API error:', error);
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
    const taskId = searchParams.get('taskId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const history = await getTaskHistory(taskId || undefined, limit);

    return NextResponse.json({
      success: true,
      message: `Retrieved ${history.length} task execution records`,
      data: history
    });

  } catch (error) {
    console.error('Get task history API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve task history',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}