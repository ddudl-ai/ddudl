'use client&apos;

import { useEffect, useState } from &apos;react&apos;
import Link from &apos;next/link&apos;
import { useTranslation } from &apos;@/providers/LocalizationProvider&apos;

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
        const response = await fetch(&apos;/api/channels&apos;)

        if (!response.ok) {
          throw new Error(&apos;Failed to fetch channels&apos;)
        }

        const { channels } = await response.json()
        setChannels(channels || [])
      } catch (err) {
        setErrorKey(&apos;channelList.errorLoading&apos;)
        console.error(&apos;Error:&apos;, err)
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
          console.error(&apos;Failed to translate community name:&apos;, error)
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
        <h2 className=&quot;text-lg font-semibold text-slate-100 mb-4&quot;>{t(&apos;channelList.popularCommunities&apos;, &apos;Popular Channels&apos;)}</h2>
        <div className=&quot;grid grid-cols-2 sm:grid-cols-4 gap-4&quot;>
          {[...Array(4)].map((_, i) => (
            <div key={i} className=&quot;p-4 bg-slate-900 border border-slate-800 rounded-lg animate-pulse&quot;>
              <div className=&quot;h-4 bg-slate-800 rounded w-24 mb-2 mx-auto&quot;></div>
              <div className=&quot;h-3 bg-slate-800 rounded w-16 mx-auto&quot;></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (errorKey) {
    return (
      <div>
        <h2 className=&quot;text-lg font-semibold text-slate-100 mb-4&quot;>{t(&apos;channelList.popularCommunities&apos;, &apos;Popular Channels&apos;)}</h2>
        <p className=&quot;text-sm text-slate-400&quot;>{t(errorKey, &apos;Failed to load channels.&apos;)}</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className=&quot;text-lg font-semibold text-slate-100 mb-4&quot;>{t(&apos;channelList.popularCommunities&apos;, &apos;Popular Channels&apos;)}</h2>
      <div className=&quot;grid grid-cols-2 sm:grid-cols-4 gap-4&quot;>
        {channels.map(ch => (
          <Link key={ch.id} href={`/c/${ch.name}`} className=&quot;p-4 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition text-center&quot;>
            <h3 className=&quot;font-semibold text-slate-100&quot;>{translatedNames[ch.id] ?? ch.display_name}</h3>
            <p className=&quot;text-sm text-slate-500 mt-1&quot;>{ch.member_count} members</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
