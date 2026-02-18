import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminKey, unauthorizedResponse } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const db = createAdminClient()
    const { data: channels, error } = await db
      .from('channels')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching channels:', error)
      return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
    }

    return NextResponse.json({ channels: channels || [] })

  } catch (error) {
    console.error('Admin channels GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const { name, display_name, description } = await request.json()
    
    if (!name || !display_name || !description) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        message: 'name, display_name, and description are required.'
      }, { status: 400 })
    }

    const db = createAdminClient()

    // Check for duplicate channel name
    const { data: existingChannel } = await db
      .from('channels')
      .select('id')
      .eq('name', name.toLowerCase())
      .single()

    if (existingChannel) {
      return NextResponse.json({
        error: 'Channel already exists',
        message: `Channel with name '${name}' already exists.`
      }, { status: 400 })
    }

    // Create the channel
    const { data: newChannel, error: createError } = await db
      .from('channels')
      .insert({
        name: name.toLowerCase(),
        display_name,
        description,
        master_id: null, // Admin created channels have no master
        member_count: 0,
        is_nsfw: false,
        moderation_settings: {},
        rules: []
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating channel:', createError)
      return NextResponse.json({ 
        error: 'Failed to create channel',
        message: createError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Channel '${display_name}' created successfully.`,
      channel: newChannel
    })

  } catch (error) {
    console.error('Admin channels POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const { name, updates } = await request.json()
    
    if (!name || !updates) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        message: 'name and updates are required.'
      }, { status: 400 })
    }

    const db = createAdminClient()

    // Update the channel
    const { data: updatedChannel, error: updateError } = await db
      .from('channels')
      .update(updates)
      .eq('name', name.toLowerCase())
      .select()
      .single()

    if (updateError) {
      console.error('Error updating channel:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update channel',
        message: updateError.message
      }, { status: 500 })
    }

    if (!updatedChannel) {
      return NextResponse.json({
        error: 'Channel not found',
        message: `Channel with name '${name}' not found.`
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Channel '${name}' updated successfully.`,
      channel: updatedChannel
    })

  } catch (error) {
    console.error('Admin channels PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}