import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminKey, unauthorizedResponse } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    // Validate Admin API Key
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const startTime = Date.now()
    const adminSupabase = createAdminClient()

    // Test database connectivity
    let dbStatus = 'ok'
    let dbResponseTime = 0
    
    try {
      const dbStartTime = Date.now()
      const { error: dbError } = await adminSupabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .limit(1)
      
      dbResponseTime = Date.now() - dbStartTime
      
      if (dbError) {
        dbStatus = 'error'
        console.error('Database health check failed:', dbError)
      }
    } catch (error) {
      dbStatus = 'error'
      console.error('Database connection failed:', error)
    }

    // Calculate response time
    const totalResponseTime = Date.now() - startTime

    // Get basic system info
    const uptime = process.uptime()
    const memory = process.memoryUsage()

    // Check for recent errors (simple approach - you might want to implement error logging)
    let recentErrors = 0
    try {
      // If you have an error_log table, query it here
      // For now, return 0 as placeholder
      recentErrors = 0
    } catch (error) {
      // Error log table might not exist
    }

    const health = {
      status: dbStatus === 'ok' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      db: {
        status: dbStatus,
        response_time_ms: dbResponseTime
      },
      system: {
        uptime_seconds: Math.floor(uptime),
        memory: {
          used_mb: Math.round(memory.heapUsed / 1024 / 1024),
          total_mb: Math.round(memory.heapTotal / 1024 / 1024),
          external_mb: Math.round(memory.external / 1024 / 1024)
        }
      },
      api: {
        response_time_ms: totalResponseTime,
        recent_errors: recentErrors
      },
      environment: {
        node_version: process.version,
        platform: process.platform
      }
    }

    const statusCode = health.status === 'healthy' ? 200 : 503

    return NextResponse.json(health, { status: statusCode })

  } catch (error) {
    console.error('Admin health API error:', error)
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Health check failed',
      code: 'HEALTH_CHECK_ERROR',
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}