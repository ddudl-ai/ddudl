import { generateDailySeedPosts, publishSeedPosts } from './seed-content';
import { runEngagementTasks } from './interaction';
import { runTrendAnalysisTask } from './trends';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-for-build'
);

export interface ScheduledTask {
  id: string;
  name: string;
  schedule: string; // cron format
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  config: Record<string, unknown>;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  executedAt: Date;
  duration: number;
}

/**
 * Daily seed content generation task
 * Runs every day at 9 AM KST
 */
export async function runDailySeedContentTask(): Promise<TaskResult> {
  const startTime = Date.now();
  const taskId = 'daily-seed-content';
  
  try {
    
    // Generate seed posts
    const seedPosts = await generateDailySeedPosts(10);
    
    if (seedPosts.length === 0) {
      return {
        taskId,
        success: false,
        message: 'No seed posts could be generated',
        executedAt: new Date(),
        duration: Date.now() - startTime
      };
    }
    
    // Filter high-quality posts (confidence > 70)
    const qualityPosts = seedPosts.filter(post => post.confidence > 70);
    
    if (qualityPosts.length === 0) {
      return {
        taskId,
        success: false,
        message: 'No high-quality posts generated',
        data: { totalGenerated: seedPosts.length, qualityThreshold: 70 },
        executedAt: new Date(),
        duration: Date.now() - startTime
      };
    }
    
    // Publish posts
    const publishResult = await publishSeedPosts(qualityPosts);
    
    // Log the task execution
    await logTaskExecution({
      taskId,
      success: publishResult.success > 0,
      message: `Published ${publishResult.success} posts, ${publishResult.failed} failed`,
      data: {
        generated: seedPosts.length,
        published: publishResult.success,
        failed: publishResult.failed,
        errors: publishResult.errors
      },
      executedAt: new Date(),
      duration: Date.now() - startTime
    });
    
    return {
      taskId,
      success: publishResult.success > 0,
      message: `Successfully published ${publishResult.success} seed posts`,
      data: {
        generated: seedPosts.length,
        published: publishResult.success,
        failed: publishResult.failed
      },
      executedAt: new Date(),
      duration: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('Daily seed content task failed:', error);
    
    const result = {
      taskId,
      success: false,
      message: `Task failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executedAt: new Date(),
      duration: Date.now() - startTime
    };
    
    await logTaskExecution(result);
    return result;
  }
}

/**
 * Evening engagement boost task
 * Runs at 6 PM KST to generate lighter content
 */
export async function runEveningEngagementTask(): Promise<TaskResult> {
  const startTime = Date.now();
  const taskId = 'evening-engagement';
  
  try {
    
    // Generate lighter, more casual content for evening hours
    const seedPosts = await generateDailySeedPosts(5, ['entertainment', 'gaming', 'general']);
    
    if (seedPosts.length === 0) {
      return {
        taskId,
        success: false,
        message: 'No evening content could be generated',
        executedAt: new Date(),
        duration: Date.now() - startTime
      };
    }
    
    // Publish posts
    const publishResult = await publishSeedPosts(seedPosts);
    
    await logTaskExecution({
      taskId,
      success: publishResult.success > 0,
      message: `Evening task: Published ${publishResult.success} posts`,
      data: publishResult,
      executedAt: new Date(),
      duration: Date.now() - startTime
    });
    
    return {
      taskId,
      success: publishResult.success > 0,
      message: `Evening engagement: Published ${publishResult.success} posts`,
      data: publishResult,
      executedAt: new Date(),
      duration: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('Evening engagement task failed:', error);
    
    const result = {
      taskId,
      success: false,
      message: `Evening task failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executedAt: new Date(),
      duration: Date.now() - startTime
    };
    
    await logTaskExecution(result);
    return result;
  }
}

/**
 * Cleanup old AI-generated content
 * Runs daily at midnight to remove low-performing AI posts
 */
export async function runContentCleanupTask(): Promise<TaskResult> {
  const startTime = Date.now();
  const taskId = 'content-cleanup';
  
  try {
    
    // Delete AI posts older than 7 days with low engagement
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: lowEngagementPosts, error: selectError } = await supabase
      .from('posts')
      .select('id, title, upvotes, downvotes, comment_count')
      .eq('ai_generated', true)
      .eq('is_deleted', false)
      .lt('created_at', sevenDaysAgo.toISOString())
      .lt('upvotes', 5)
      .lt('comment_count', 2);
    
    if (selectError) {
      throw selectError;
    }
    
    if (!lowEngagementPosts || lowEngagementPosts.length === 0) {
      return {
        taskId,
        success: true,
        message: 'No low-engagement posts to cleanup',
        executedAt: new Date(),
        duration: Date.now() - startTime
      };
    }
    
    // Mark posts as deleted
    const postIds = lowEngagementPosts.map((post: any) => post.id);
    const { error: deleteError } = await supabase
      .from('posts')
      .update({ is_deleted: true })
      .in('id', postIds);
    
    if (deleteError) {
      throw deleteError;
    }
    
    const result = {
      taskId,
      success: true,
      message: `Cleaned up ${lowEngagementPosts.length} low-engagement AI posts`,
      data: { deletedCount: lowEngagementPosts.length },
      executedAt: new Date(),
      duration: Date.now() - startTime
    };
    
    await logTaskExecution(result);
    return result;
    
  } catch (error) {
    console.error('Content cleanup task failed:', error);
    
    const result = {
      taskId,
      success: false,
      message: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executedAt: new Date(),
      duration: Date.now() - startTime
    };
    
    await logTaskExecution(result);
    return result;
  }
}

/**
 * Log task execution to database
 */
async function logTaskExecution(result: TaskResult): Promise<void> {
  try {
    // Create a simple task log table entry
    // In a real implementation, you'd have a dedicated task_logs table
    
    // You could also store this in Supabase or send to monitoring service
    
  } catch (error) {
    console.error('Failed to log task execution:', error);
  }
}

/**
 * Get task execution history
 */
export async function getTaskHistory(taskId?: string, limit: number = 50): Promise<TaskResult[]> {
  // In a real implementation, this would query a task_logs table
  // For now, return empty array as we're just logging to console
  return [];
}


/**
 * Run engagement tasks (comments and summaries)
 * Runs every 4 hours
 */
export async function runEngagementBoostTask(): Promise<TaskResult> {
  const startTime = Date.now();
  const taskId = 'engagement-boost';
  
  try {
    
    const results = await runEngagementTasks();
    
    const result = {
      taskId,
      success: results.commentsGenerated > 0 || results.summariesGenerated > 0,
      message: `Generated ${results.commentsGenerated} comments and ${results.summariesGenerated} summaries`,
      data: results,
      executedAt: new Date(),
      duration: Date.now() - startTime
    };
    
    await logTaskExecution(result);
    return result;
    
  } catch (error) {
    console.error('Engagement boost task failed:', error);
    
    const result = {
      taskId,
      success: false,
      message: `Engagement task failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executedAt: new Date(),
      duration: Date.now() - startTime
    };
    
    await logTaskExecution(result);
    return result;
  }
}

/**
 * Run trend analysis and channel creation
 * Runs twice daily (morning and evening)
 */
export async function runTrendAnalysisScheduledTask(): Promise<TaskResult> {
  const startTime = Date.now();
  const taskId = 'trend-analysis';
  
  try {
    
    const results = await runTrendAnalysisTask();
    
    const result = {
      taskId,
      success: results.trendsAnalyzed > 0,
      message: `Analyzed ${results.trendsAnalyzed} trends, created ${results.channelsCreated} channels`,
      data: results,
      executedAt: new Date(),
      duration: Date.now() - startTime
    };
    
    await logTaskExecution(result);
    return result;
    
  } catch (error) {
    console.error('Trend analysis task failed:', error);
    
    const result = {
      taskId,
      success: false,
      message: `Trend analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executedAt: new Date(),
      duration: Date.now() - startTime
    };
    
    await logTaskExecution(result);
    return result;
  }
}

/**
 * Check if it's time to run scheduled tasks
 */
export function shouldRunTask(schedule: string, lastRun?: Date): boolean {
  if (!lastRun) return true;
  
  const now = new Date();
  const timeSinceLastRun = now.getTime() - lastRun.getTime();
  
  // Simple schedule parsing - in production, use a proper cron parser
  switch (schedule) {
    case 'daily-9am':
      const nineAM = new Date();
      nineAM.setHours(9, 0, 0, 0);
      return now >= nineAM && timeSinceLastRun > 23 * 60 * 60 * 1000; // 23 hours
      
    case 'daily-6pm':
      const sixPM = new Date();
      sixPM.setHours(18, 0, 0, 0);
      return now >= sixPM && timeSinceLastRun > 23 * 60 * 60 * 1000; // 23 hours
      
    case 'daily-midnight':
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      return now >= midnight && timeSinceLastRun > 23 * 60 * 60 * 1000; // 23 hours
      
    case 'every-4h':
      return timeSinceLastRun > 4 * 60 * 60 * 1000; // 4 hours
      
    case 'twice-daily':
      const morning = new Date();
      morning.setHours(10, 0, 0, 0);
      const evening = new Date();
      evening.setHours(22, 0, 0, 0);
      return (now >= morning || now >= evening) && timeSinceLastRun > 11 * 60 * 60 * 1000; // 11 hours
      
    default:
      return false;
  }
}

/**
 * Run all scheduled tasks
 */
export async function runScheduledTasks(): Promise<TaskResult[]> {
  const results: TaskResult[] = [];
  
  // Check and run daily seed content task
  if (shouldRunTask('daily-9am')) {
    const result = await runDailySeedContentTask();
    results.push(result);
  }
  
  // Check and run evening engagement task
  if (shouldRunTask('daily-6pm')) {
    const result = await runEveningEngagementTask();
    results.push(result);
  }
  
  // Check and run cleanup task
  if (shouldRunTask('daily-midnight')) {
    const result = await runContentCleanupTask();
    results.push(result);
  }
  
  // Check and run engagement boost task
  if (shouldRunTask('every-4h')) {
    const result = await runEngagementBoostTask();
    results.push(result);
  }
  
  // Check and run trend analysis task
  if (shouldRunTask('twice-daily')) {
    const result = await runTrendAnalysisScheduledTask();
    results.push(result);
  }
  
  return results;
}