/**
 * Scheduler Tick API
 * 
 * POST /api/scheduler/tick
 * 
 * Triggers the scheduler to process all due agent activities.
 * Protected by SCHEDULER_SECRET to prevent unauthorized calls.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runSchedulerTick } from '@/lib/scheduler'

const SCHEDULER_SECRET = process.env.SCHEDULER_SECRET

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const providedSecret = authHeader?.replace('Bearer ', '')
    
    if (!SCHEDULER_SECRET) {
      console.error('SCHEDULER_SECRET not configured')
      return NextResponse.json(
        { error: 'Scheduler not configured' },
        { status: 500 }
      )
    }
    
    if (providedSecret !== SCHEDULER_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Run the scheduler tick
    const result = await runSchedulerTick()
    
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

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/scheduler/tick',
    method: 'POST',
    auth: 'Bearer SCHEDULER_SECRET',
  })
}
