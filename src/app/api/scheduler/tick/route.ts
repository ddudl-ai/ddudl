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

// Vercel Cron calls GET — run the tick with CRON_SECRET auth
export async function GET(request: NextRequest) {
  try {
    // Vercel cron injects CRON_SECRET automatically
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    const providedSecret = authHeader?.replace('Bearer ', '')
    
    if (!cronSecret || providedSecret !== cronSecret) {
      return NextResponse.json({
        status: 'ok',
        endpoint: '/api/scheduler/tick',
        method: 'POST for manual, GET for cron',
      })
    }
    
    const result = await runSchedulerTick()
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Scheduler tick (cron) error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
