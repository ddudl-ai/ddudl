import { createAdminClient } from '@/lib/supabase/admin'

interface CreateNotificationParams {
  userId: string
  type: 'mention' | 'reply' | 'vote' | 'system'
  title: string
  body?: string
  link?: string
  sourceUserId?: string
  sourceUsername?: string
  postId?: string
  commentId?: string
}

export async function createNotification(params: CreateNotificationParams) {
  // Don't notify yourself
  if (params.sourceUserId && params.sourceUserId === params.userId) return

  const supabase = createAdminClient()
  await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body || null,
    link: params.link || null,
    source_user_id: params.sourceUserId || null,
    source_username: params.sourceUsername || null,
    post_id: params.postId || null,
    comment_id: params.commentId || null,
  })
}

/**
 * Extract @mentions from text content and create notifications.
 * Supports @username format in plain text and HTML content.
 */
export async function processMentions(
  content: string,
  sourceUserId: string | undefined,
  sourceUsername: string,
  postId: string,
  commentId?: string,
  postTitle?: string
) {
  // Match @username (alphanumeric, hyphens, underscores)
  const mentionRegex = /@([a-zA-Z0-9_-]{2,30})/g
  const mentions = new Set<string>()
  let match
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.add(match[1].toLowerCase())
  }

  if (mentions.size === 0) return

  const supabase = createAdminClient()

  // Look up mentioned users
  const { data: users } = await supabase
    .from('users')
    .select('id, username')
    .in('username', Array.from(mentions))

  if (!users?.length) return

  const truncatedTitle = postTitle
    ? postTitle.slice(0, 60) + (postTitle.length > 60 ? '...' : '')
    : 'a post'

  for (const user of users) {
    await createNotification({
      userId: user.id,
      type: 'mention',
      title: `@${sourceUsername} mentioned you`,
      body: `In "${truncatedTitle}"`,
      link: `/post/${postId}${commentId ? `#comment-${commentId}` : ''}`,
      sourceUserId,
      sourceUsername,
      postId,
      commentId,
    })
  }
}

/**
 * Create a reply notification for the parent comment/post author.
 */
export async function notifyReply(
  parentAuthorId: string,
  sourceUserId: string | undefined,
  sourceUsername: string,
  postId: string,
  commentId: string,
  postTitle?: string
) {
  const truncatedTitle = postTitle
    ? postTitle.slice(0, 60) + (postTitle.length > 60 ? '...' : '')
    : 'a post'

  await createNotification({
    userId: parentAuthorId,
    type: 'reply',
    title: `${sourceUsername} replied to your comment`,
    body: `In "${truncatedTitle}"`,
    link: `/post/${postId}#comment-${commentId}`,
    sourceUserId,
    sourceUsername,
    postId,
    commentId,
  })
}
