import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminKey, unauthorizedResponse } from '@/lib/admin-auth'

interface ConversationScore {
  post_id: string
  title: string
  channel_id: string
  author_name: string
  created_at: string
  score: number // 0-100
  factors: {
    participation: number   // unique participants diversity
    depth: number          // thread nesting depth
    balance: number        // human-AI interaction balance
    constructiveness: number // positive vote ratio
    engagement: number     // comments relative to age
  }
  stats: {
    comment_count: number
    unique_authors: number
    max_depth: number
    human_comments: number
    ai_comments: number
    avg_vote_score: number
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get('days') || '7'), 30)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const sort = searchParams.get('sort') || 'score' // 'score' | 'recent' | 'worst'
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const db = createAdminClient()

    // Get posts with comments in the period
    const { data: posts } = await db
      .from('posts')
      .select('id, title, channel_id, author_name, author_id, ai_generated, created_at, comment_count, vote_score')
      .gte('created_at', since)
      .is('deleted_at', null)
      .gt('comment_count', 0)
      .order('comment_count', { ascending: false })
      .limit(limit * 2) // fetch extra, will filter

    if (!posts || posts.length === 0) {
      return NextResponse.json({ conversations: [], summary: { avg_score: 0, total: 0 } })
    }

    const postIds = posts.map(p => p.id)

    // Fetch all comments for these posts
    const allComments: Array<{
      id: string; post_id: string; author_id: string; author_name: string;
      parent_id: string | null; ai_generated: boolean; vote_score: number; created_at: string;
    }> = []

    for (let i = 0; i < postIds.length; i += 200) {
      const chunk = postIds.slice(i, i + 200)
      const { data } = await db
        .from('comments')
        .select('id, post_id, author_id, author_name, parent_id, ai_generated, vote_score, created_at')
        .in('post_id', chunk)
        .eq('is_deleted', false)

      if (data) allComments.push(...data)
    }

    // Group comments by post
    const commentsByPost = new Map<string, typeof allComments>()
    for (const c of allComments) {
      if (!commentsByPost.has(c.post_id)) commentsByPost.set(c.post_id, [])
      commentsByPost.get(c.post_id)!.push(c)
    }

    // Score each conversation
    const conversations: ConversationScore[] = posts
      .filter(p => commentsByPost.has(p.id))
      .map(post => {
        const comments = commentsByPost.get(post.id)!
        const uniqueAuthors = new Set(comments.map(c => c.author_id))
        uniqueAuthors.add(post.author_id) // include OP

        // Max nesting depth
        const parentMap = new Map(comments.map(c => [c.id, c.parent_id]))
        let maxDepth = 0
        for (const c of comments) {
          let depth = 0
          let pid = c.parent_id
          const visited = new Set<string>()
          while (pid && !visited.has(pid)) {
            visited.add(pid)
            depth++
            pid = parentMap.get(pid) || null
          }
          maxDepth = Math.max(maxDepth, depth)
        }

        // Human-AI balance
        const humanComments = comments.filter(c => !c.ai_generated).length
        const aiComments = comments.filter(c => c.ai_generated).length
        const postIsAI = post.ai_generated ? 1 : 0

        // Vote constructiveness
        const totalVoteScore = comments.reduce((s, c) => s + (c.vote_score || 0), 0)
        const avgVoteScore = comments.length > 0 ? totalVoteScore / comments.length : 0

        // Thread age in hours
        const ageHours = Math.max(1, (Date.now() - new Date(post.created_at).getTime()) / 3600000)

        // Factor scores (0-100 each)
        const participationScore = Math.min(100, (uniqueAuthors.size / Math.max(3, comments.length * 0.5)) * 100)
        const depthScore = Math.min(100, maxDepth * 33) // 3+ depth = 100
        const totalParticipants = humanComments + aiComments + 1 // +1 for OP
        const humanRatio = (humanComments + (postIsAI ? 0 : 1)) / totalParticipants
        const aiRatio = (aiComments + postIsAI) / totalParticipants
        const balanceScore = Math.min(100, (1 - Math.abs(humanRatio - aiRatio)) * 100 * 1.5) // closer to 50/50 = better
        const constructivenessScore = Math.min(100, Math.max(0, (avgVoteScore + 2) * 25)) // -2=0, 2=100
        const engagementScore = Math.min(100, (comments.length / ageHours) * 50) // 2 comments/hour = 100

        // Weighted overall
        const score = Math.round(
          participationScore * 0.25 +
          depthScore * 0.15 +
          balanceScore * 0.20 +
          constructivenessScore * 0.25 +
          engagementScore * 0.15
        )

        return {
          post_id: post.id,
          title: post.title,
          channel_id: post.channel_id,
          author_name: post.author_name,
          created_at: post.created_at,
          score,
          factors: {
            participation: Math.round(participationScore),
            depth: Math.round(depthScore),
            balance: Math.round(balanceScore),
            constructiveness: Math.round(constructivenessScore),
            engagement: Math.round(engagementScore),
          },
          stats: {
            comment_count: comments.length,
            unique_authors: uniqueAuthors.size,
            max_depth: maxDepth,
            human_comments: humanComments,
            ai_comments: aiComments,
            avg_vote_score: Math.round(avgVoteScore * 100) / 100,
          },
        }
      })

    // Sort
    if (sort === 'worst') {
      conversations.sort((a, b) => a.score - b.score)
    } else if (sort === 'recent') {
      conversations.sort((a, b) => b.created_at.localeCompare(a.created_at))
    } else {
      conversations.sort((a, b) => b.score - a.score)
    }

    const result = conversations.slice(0, limit)
    const avgScore = result.length > 0
      ? Math.round(result.reduce((s, c) => s + c.score, 0) / result.length)
      : 0

    return NextResponse.json({
      conversations: result,
      summary: {
        avg_score: avgScore,
        total: result.length,
        excellent: result.filter(c => c.score >= 75).length,
        good: result.filter(c => c.score >= 50 && c.score < 75).length,
        needs_attention: result.filter(c => c.score < 50).length,
      },
    })
  } catch (error) {
    console.error('Conversation quality API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
