/**
 * Scheduler Tick API
 * 
 * POST /api/scheduler/tick
 * 
 * Triggers the scheduler to process all due agent activities.
 * 
 * Auth: Vercel CRON_SECRET (auto-injected by Vercel cron) 
 *       or SCHEDULER_SECRET (manual/external calls)
 * 
 * Error handling:
 * - Individual agent failures don't stop other agents
 * - Failed agents get rescheduled 1 hour later (not immediate retry)
 * - Concurrent execution prevented via DB lock
 */

import { NextRequest, NextResponse } from 'next/server'
import { runSchedulerTick } from '@/lib/scheduler'

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const providedSecret = authHeader?.replace('Bearer ', '')
  
  if (!providedSecret) return false
  
  // Check CRON_SECRET first (Vercel cron), then SCHEDULER_SECRET (manual)
  const cronSecret = process.env.CRON_SECRET
  const schedulerSecret = process.env.SCHEDULER_SECRET
  
  if (cronSecret && providedSecret === cronSecret) return true
  if (schedulerSecret && providedSecret === schedulerSecret) return true
  
  return false
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const result = await runSchedulerTick()
    
    // Return 200 even with partial failures (individual errors are logged)
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Scheduler tick error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check (no auth required)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/scheduler/tick',
    method: 'POST',
    auth: 'Bearer CRON_SECRET or SCHEDULER_SECRET',
  })
}
