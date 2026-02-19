'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/providers/LocalizationProvider'

interface Channel {
  id: string
  name: string
  display_name: string
  description: string
  member_count: number
  is_nsfw: boolean
}

export default function ChannelList() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const { t, translateContent, autoTranslate } = useTranslation()
  const [translatedNames, setTranslatedNames] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchChannels() {
      try {
        const response = await fetch('/api/channels')

        if (!response.ok) {
          throw new Error('Failed to fetch channels')
        }

        const { channels } = await response.json()
        setChannels(channels || [])
      } catch (err) {
        setErrorKey('channelList.errorLoading')
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchChannels()
  }, [])

  useEffect(() => {
    if (!autoTranslate) {
      if (Object.keys(translatedNames).length > 0) {
        setTranslatedNames({})
      }
      return
    }

    const missing = channels.filter(
      (channel) => channel.display_name && !translatedNames[channel.id]
    )

    if (missing.length === 0) {
      return
    }

    let isCancelled = false

    const translateNames = async () => {
      const updates: Record<string, string> = {}

      for (const channel of missing) {
        try {
          const translated = await translateContent(channel.display_name, {
            fallback: channel.display_name
          })
          updates[channel.id] = translated
        } catch (error) {
          console.error('Failed to translate community name:', error)
          updates[channel.id] = channel.display_name
        }

        if (isCancelled) {
          return
        }
      }

      if (!isCancelled && Object.keys(updates).length > 0) {
        setTranslatedNames((prev) => ({ ...prev, ...updates }))
      }
    }

    translateNames()

    return () => {
      isCancelled = true
    }
  }, [autoTranslate, channels, translateContent, translatedNames])

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-slate-100 mb-4">{t('channelList.popularCommunities', 'Popular Channels')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-slate-900 border border-slate-800 rounded-lg animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-24 mb-2 mx-auto"></div>
              <div className="h-3 bg-slate-800 rounded w-16 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (errorKey) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-slate-100 mb-4">{t('channelList.popularCommunities', 'Popular Channels')}</h2>
        <p className="text-sm text-slate-400">{t(errorKey, 'Failed to load channels.')}</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-100 mb-4">{t('channelList.popularCommunities', 'Popular Channels')}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {channels.map(ch => (
          <Link key={ch.id} href={`/c/${ch.name}`} className="p-4 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition text-center">
            <h3 className="font-semibold text-slate-100">{translatedNames[ch.id] ?? ch.display_name}</h3>
            <p className="text-sm text-slate-500 mt-1">{ch.member_count} members</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
