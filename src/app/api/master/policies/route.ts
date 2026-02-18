import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MasterService } from '@/lib/services/master';
import type { CreatePolicyRequest, UpdateModerationSettingsRequest } from '@/types';

const masterService = new MasterService();

// GET /api/master/policies - Get policies and settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channel_id');

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    // Check if user is a master
    const master = await masterService.checkMasterPermission(user.id, channelId);
    if (!master) {
      return NextResponse.json(
        { error: 'Not authorized for this channel' },
        { status: 403 }
      );
    }

    // Get moderation settings
    const settings = await masterService.getModerationSettings(channelId);

    // Get policies
    const { data: policies, error: policiesError } = await supabase
      .from('channel_policies')
      .select('*')
      .eq('channel_id', channelId)
      .eq('enabled', true);

    if (policiesError) {
      throw policiesError;
    }

    // Check for policy conflicts
    const conflicts = await masterService.checkPolicyConflicts(channelId);

    return NextResponse.json({
      settings,
      policies,
      conflicts,
      master: {
        role: master.role,
        permissions: master.permissions
      }
    });
  } catch (error) {
    console.error('Error fetching policies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch policies' },
      { status: 500 }
    );
  }
}

// POST /api/master/policies - Create new policy
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CreatePolicyRequest = await request.json();
    const { channelId, policyType, rules, enabled = true } = body;

    // Check permissions
    const master = await masterService.checkMasterPermission(user.id, channelId);
    if (!master || !master.permissions.canEditPolicies) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create policies' },
        { status: 403 }
      );
    }

    // Create policy
    const { data: policy, error } = await supabase
      .from('channel_policies')
      .insert({
        channel_id: channelId,
        master_id: master.id,
        policy_type: policyType,
        rules,
        enabled
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log action
    await supabase
      .from('master_actions')
      .insert({
        master_id: master.id,
        channel_id: channelId,
        action_type: 'update_policy',
        target_id: policy.id,
        reason: `Created new ${policyType} policy`,
        details: { policy }
      });

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Error creating policy:', error);
    return NextResponse.json(
      { error: 'Failed to create policy' },
      { status: 500 }
    );
  }
}

// PUT /api/master/policies - Update moderation settings
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: UpdateModerationSettingsRequest = await request.json();
    const { channelId, settings } = body;

    // Update settings through service
    const updatedSettings = await masterService.updateModerationSettings(
      channelId,
      settings,
      user.id
    );

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// DELETE /api/master/policies/:id - Delete policy
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const policyId = searchParams.get('id');
    const channelId = searchParams.get('channel_id');

    if (!policyId || !channelId) {
      return NextResponse.json(
        { error: 'Policy ID and Channel ID are required' },
        { status: 400 }
      );
    }

    // Check permissions
    const master = await masterService.checkMasterPermission(user.id, channelId);
    if (!master || !master.permissions.canEditPolicies) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete policies' },
        { status: 403 }
      );
    }

    // Soft delete by disabling
    const { error } = await supabase
      .from('channel_policies')
      .update({ enabled: false })
      .eq('id', policyId)
      .eq('channel_id', channelId);

    if (error) {
      throw error;
    }

    // Log action
    await supabase
      .from('master_actions')
      .insert({
        master_id: master.id,
        channel_id: channelId,
        action_type: 'update_policy',
        target_id: policyId,
        reason: 'Deleted policy',
        reversible: true
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting policy:', error);
    return NextResponse.json(
      { error: 'Failed to delete policy' },
      { status: 500 }
    );
  }
}