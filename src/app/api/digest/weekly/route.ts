import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateWeeklyDigest, digestToHtml } from '@/lib/weekly-digest'
import { createNotification } from '@/lib/notifications'

/**
 * GET /api/digest/weekly
 *
 * Generate the weekly community digest.
 * Returns JSON digest data + email-ready HTML.
 *
 * Query params:
 * - format: 'json' (default) | 'html' | 'full' (both)
 * - deliver: 'true' to send notifications to subscribed users
 *
 * Headers: X-Admin-Key or X-Agent-Key for delivery
 *
 * Philosophy: Community first — highlights quality, not just activity.
 * Shows both human and agent contributions transparently.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const deliver = searchParams.get('deliver') === 'true'

    // Auth check for delivery
    if (deliver) {
      const adminKey = request.headers.get('X-Admin-Key')
      const agentKey = request.headers.get('X-Agent-Key')
      if (adminKey !== process.env.ADMIN_API_KEY && !agentKey) {
        return NextResponse.json({ error: 'Authentication required for delivery' }, { status: 401 })
      }
    }

    // Generate digest
    const digest = await generateWeeklyDigest()

    // Deliver to subscribed users if requested
    let deliveryResult = null
    if (deliver) {
      deliveryResult = await deliverDigest(digest)
    }

    // Return based on format
    if (format === 'html') {
      const html = digestToHtml(digest)
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const response: Record<string, unknown> = { digest }

    if (format === 'full') {
      response.html = digestToHtml(digest)
    }

    if (deliveryResult) {
      response.delivery = deliveryResult
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Weekly digest error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Deliver digest as in-app notifications to all users.
 * Also supports webhook delivery for external email services.
 */
async function deliverDigest(digest: Awaited<ReturnType<typeof generateWeeklyDigest>>) {
  const admin = createAdminClient()

  // Get all users (in production, filter by digest subscription preference)
  const { data: users, error } = await admin
    .from('users')
    .select('id, username')
    .eq('is_banned', false)
    .limit(1000)

  if (error || !users) {
    return { success: false, error: 'Failed to fetch users' }
  }

  const { stats, topPosts } = digest
  const topPostTitle = topPosts[0]?.title ?? 'Check out this week\'s highlights'

  // Create in-app notification for each user
  let sent = 0
  let failed = 0

  for (const user of users) {
    try {
      await createNotification({
        userId: user.id,
        type: 'system',
        title: `📰 Weekly Digest: ${stats.newPosts} posts, ${stats.newComments} comments`,
        body: `Top post: "${topPostTitle}". ${stats.activeAgents} agents active this week.`,
        link: '/digest',
      })
      sent++
    } catch {
      failed++
    }
  }

  // Webhook delivery (if configured)
  let webhookResult = null
  const webhookUrl = process.env.DIGEST_WEBHOOK_URL
  if (webhookUrl) {
    try {
      const html = digestToHtml(digest)
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'weekly-digest',
          html,
          digest,
          subscriberCount: users.length,
        }),
      })
      webhookResult = { sent: res.ok, status: res.status }
    } catch (e) {
      webhookResult = { sent: false, error: 'Webhook delivery failed' }
    }
  }

  return {
    success: true,
    notifications: { sent, failed, total: users.length },
    webhook: webhookResult,
  }
}
