import { createClient } from '@/lib/supabase/server';
import type {
  ChannelMaster,
  ModerationSettings,
  ModerationQueueItem,
  MasterDashboardStats,
  MasterAction,
  PolicyConflict,
  MasterNotification,
  ModerationActionRequest,
} from '@/types';

export class MasterService {
  private async getSupabase() {
    return await createClient();
  }

  /**
   * Check if user is a master of the channel
   */
  async checkMasterPermission(userId: string, channelId: string): Promise<ChannelMaster | null> {
    const supabase = await this.getSupabase();
    
    const { data, error } = await supabase
      .from('channel_masters')
      .select('*')
      .eq('user_id', userId)
      .eq('channel_id', channelId)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    return data as ChannelMaster;
  }

  /**
   * Get moderation settings for a channel
   */
  async getModerationSettings(channelId: string): Promise<ModerationSettings | null> {
    const supabase = await this.getSupabase();
    
    const { data, error } = await supabase
      .from('moderation_settings')
      .select('*')
      .eq('channel_id', channelId)
      .single();

    if (error || !data) {
      // Create default settings if none exist
      return await this.createDefaultModerationSettings(channelId);
    }
    
    return data as ModerationSettings;
  }

  /**
   * Create default moderation settings
   */
  private async createDefaultModerationSettings(channelId: string): Promise<ModerationSettings> {
    const supabase = await this.getSupabase();
    
    const defaultSettings = {
      channel_id: channelId,
      profanity_level: 'moderate',
      spam_protection: {
        enabled: true,
        linkLimit: 3,
        repetitionThreshold: 0.7,
        newUserRestrictions: true
      },
      banned_words: [],
      automod_enabled: true,
      ai_moderation_enabled: true,
      ai_confidence_threshold: 0.85,
      karma_requirements: {
        minToPost: 10,
        minToComment: 1,
        bypassForVerified: true
      },
      new_user_restrictions: {
        enabled: true,
        accountAgeInDays: 7,
        requireEmailVerification: true
      }
    };

    const { data, error } = await supabase
      .from('moderation_settings')
      .insert(defaultSettings)
      .select()
      .single();

    if (error) throw error;
    return data as ModerationSettings;
  }

  /**
   * Update moderation settings
   */
  async updateModerationSettings(
    channelId: string,
    settings: Partial<ModerationSettings>,
    masterId: string
  ): Promise<ModerationSettings> {
    const supabase = await this.getSupabase();
    
    // Check permissions
    const master = await this.checkMasterPermission(masterId, channelId);
    if (!master || !master.permissions.canEditPolicies) {
      throw new Error('Insufficient permissions to edit policies');
    }

    const { data, error } = await supabase
      .from('moderation_settings')
      .update(settings)
      .eq('channel_id', channelId)
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await this.logMasterAction({
      masterId: master.id,
      channelId,
      actionType: 'update_policy',
      targetId: data.id,
      reason: 'Updated moderation settings',
      details: settings,
      updatedAt: new Date(),
      reversible: false
    });

    return data as ModerationSettings;
  }

  /**
   * Get moderation queue items
   */
  async getModerationQueue(
    channelId: string,
    status: string = 'pending',
    limit: number = 50
  ): Promise<ModerationQueueItem[]> {
    const supabase = await this.getSupabase();
    
    const query = supabase
      .from('moderation_queue')
      .select('*')
      .eq('channel_id', channelId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (status !== 'all') {
      query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data as ModerationQueueItem[];
  }

  /**
   * Process moderation action
   */
  async processModerationAction(
    request: ModerationActionRequest,
    masterId: string
  ): Promise<ModerationQueueItem> {
    const supabase = await this.getSupabase();
    
    // Get the queue item
    const { data: queueItem, error: fetchError } = await supabase
      .from('moderation_queue')
      .select('*')
      .eq('id', request.queueItemId)
      .single();

    if (fetchError || !queueItem) {
      throw new Error('Queue item not found');
    }

    // Check permissions
    const master = await this.checkMasterPermission(masterId, queueItem.channel_id);
    if (!master || !master.permissions.canReviewAIDecisions) {
      throw new Error('Insufficient permissions to review moderation items');
    }

    // Update queue item
    const { data, error } = await supabase
      .from('moderation_queue')
      .update({
        status: request.action,
        resolved_at: new Date().toISOString(),
        resolved_by: master.id,
        resolution: request.reason
      })
      .eq('id', request.queueItemId)
      .select()
      .single();

    if (error) throw error;

    // Process additional actions
    if (request.additionalActions) {
      for (const action of request.additionalActions) {
        await this.processAdditionalAction(action, master, queueItem);
      }
    }

    // Log the action
    await this.logMasterAction({
      masterId: master.id,
      channelId: queueItem.channel_id,
      actionType: request.action === 'approve' ? 'approve_content' : 'remove_content',
      targetId: queueItem.target_id,
      reason: request.reason || '',
      details: { queueItemId: request.queueItemId, action: request.action },
      updatedAt: new Date(),
      reversible: true
    });

    return data as ModerationQueueItem;
  }

  /**
   * Process additional moderation actions
   */
  private async processAdditionalAction(
    action: { type: string; parameters: Record<string, unknown> },
    master: ChannelMaster,
    queueItem: ModerationQueueItem
  ): Promise<void> {
    const supabase = await this.getSupabase();
    
    switch (action.type) {
      case 'ban_user':
        if (!master.permissions.canBanUsers) {
          throw new Error('Insufficient permissions to ban users');
        }
        
        const duration = action.parameters.duration as number || 0;
        const reason = action.parameters.reason as string || 'Policy violation';
        
        await supabase
          .from('profiles')
          .update({
            is_banned: true,
            ban_reason: reason,
            banned_until: duration > 0 
              ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()
              : null
          })
          .eq('id', queueItem.metadata.authorId);
        break;

      case 'remove_similar':
        // Find and remove similar content
        // Implementation depends on specific similarity logic
        break;

      case 'update_policy':
        // Update policy based on this case
        // Implementation depends on policy update logic
        break;
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(
    channelId: string,
    period: '24h' | '7d' | '30d' = '24h'
  ): Promise<MasterDashboardStats> {
    const supabase = await this.getSupabase();
    
    // Calculate time range
    const since = new Date();
    switch (period) {
      case '24h':
        since.setHours(since.getHours() - 24);
        break;
      case '7d':
        since.setDate(since.getDate() - 7);
        break;
      case '30d':
        since.setDate(since.getDate() - 30);
        break;
    }

    // Get overview stats
    const [posts, comments, users, queue, actions] = await Promise.all([
      // Posts count
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', channelId)
        .gte('created_at', since.toISOString()),
      
      // Comments count - need to join with posts to find comments in this channel
      supabase
        .from('comments')
        .select(`id, posts!inner(channel_id)`, { count: 'exact', head: true })
        .eq('posts.channel_id', channelId)
        .gte('created_at', since.toISOString()),
      
      // Active users
      supabase
        .from('posts')
        .select('author_id')
        .eq('channel_id', channelId)
        .gte('created_at', since.toISOString()),
      
      // Moderation queue
      supabase
        .from('moderation_queue')
        .select('*')
        .eq('channel_id', channelId)
        .gte('created_at', since.toISOString()),
      
      // Master actions
      supabase
        .from('master_actions')
        .select('*')
        .eq('channel_id', channelId)
        .gte('created_at', since.toISOString())
    ]);

    // Calculate statistics
    const uniqueUsers = new Set(users.data?.map((u: any) => u.author_id) || []);
    const queueData = queue.data || [];
    const actionsData = actions.data || [];

    return {
      channelId,
      period,
      overview: {
        totalPosts: posts.count || 0,
        totalComments: comments.count || 0,
        activeUsers: uniqueUsers.size,
        newUsers: 0, // Would need additional logic to calculate
        growth: 0 // Would need historical data to calculate
      },
      moderation: {
        queueSize: queueData.filter((q: any) => q.status === 'pending').length,
        itemsReviewed: queueData.filter((q: any) => q.status !== 'pending').length,
        aiDecisions: queueData.filter((q: any) => q.ai_score !== null).length,
        manualOverrides: actionsData.filter((a: any) => a.action_type === 'override_ai').length,
        falsePositives: 0, // Would need additional tracking
        accuracy: 0 // Would need to calculate based on overrides
      },
      content: {
        postsRemoved: actionsData.filter((a: any) => a.action_type === 'remove_content' && a.target_id).length,
        commentsRemoved: 0, // Would need additional tracking
        usersBanned: actionsData.filter((a: any) => a.action_type === 'ban_user').length,
        reportsReceived: queueData.filter((q: any) => q.reported_by !== null).length,
        avgResponseTime: this.calculateAvgResponseTime(queueData as ModerationQueueItem[])
      },
      trends: {
        topPosts: [], // Would need to fetch and analyze
        violations: [] // Would need to analyze queue reasons
      }
    };
  }

  /**
   * Calculate average response time for moderation items
   */
  private calculateAvgResponseTime(items: ModerationQueueItem[]): number {
    const resolved = items.filter(item => item.resolvedAt);
    if (resolved.length === 0) return 0;

    const totalTime = resolved.reduce((sum, item) => {
      const created = new Date(item.createdAt).getTime();
      const resolved = new Date(item.resolvedAt!).getTime();
      return sum + (resolved - created);
    }, 0);

    return Math.round(totalTime / resolved.length / 60000); // Convert to minutes
  }

  /**
   * Log master action
   */
  private async logMasterAction(action: Omit<MasterAction, 'id' | 'createdAt'>): Promise<void> {
    const supabase = await this.getSupabase();
    
    await supabase
      .from('master_actions')
      .insert({
        master_id: action.masterId,
        channel_id: action.channelId,
        action_type: action.actionType,
        target_id: action.targetId,
        reason: action.reason,
        details: action.details || {},
        reversible: action.reversible || false
      });
  }

  /**
   * Create master notification
   */
  async createNotification(notification: Omit<MasterNotification, 'id' | 'createdAt' | 'updatedAt' | 'read' | 'readAt'>): Promise<void> {
    const supabase = await this.getSupabase();
    
    await supabase
      .from('master_notifications')
      .insert({
        master_id: notification.masterId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        action_required: notification.actionRequired,
        action_url: notification.actionUrl
      });
  }

  /**
   * Check for policy conflicts
   */
  async checkPolicyConflicts(channelId: string): Promise<PolicyConflict[]> {
    const supabase = await this.getSupabase();
    
    const { data, error } = await supabase
      .from('policy_conflicts')
      .select('*')
      .eq('channel_id', channelId)
      .is('resolved_at', null);

    if (error) throw error;
    return data as PolicyConflict[];
  }

  /**
   * Resolve policy conflict
   */
  async resolvePolicyConflict(
    conflictId: string,
    resolution: 'platform_override' | 'channel_exception' | 'manual_review',
    masterId: string
  ): Promise<void> {
    const supabase = await this.getSupabase();
    
    await supabase
      .from('policy_conflicts')
      .update({
        resolution,
        resolved_by: masterId,
        resolved_at: new Date().toISOString()
      })
      .eq('id', conflictId);
  }
}