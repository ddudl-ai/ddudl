'use client&apos;

import { useState } from &apos;react&apos;
import { Share2, Copy, ExternalLink } from &apos;lucide-react&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { toast } from &apos;sonner&apos;

interface ShareButtonsProps {
  title: string
  url: string
  description?: string
}

export default function ShareButtons({ title, url, description = &apos;' }: ShareButtonsProps) {
  const [isSharing, setIsSharing] = useState(false)

  const encodedTitle = encodeURIComponent(title)
  const encodedUrl = encodeURIComponent(url)
  const encodedDescription = encodeURIComponent(description)
  const shareText = encodeURIComponent(`${title} ${url}`)

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${shareText}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
  }

  const handleShare = (platform: string, url: string) => {
    setIsSharing(true)
    window.open(url, &apos;_blank&apos;, &apos;noopener,noreferrer,width=550,height=400&apos;)
    setTimeout(() => setIsSharing(false), 1000)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(&apos;Link copied to clipboard!&apos;)
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement(&apos;textarea&apos;)
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand(&apos;copy&apos;)
        toast.success(&apos;Link copied to clipboard!&apos;)
      } catch (fallbackError) {
        toast.error(&apos;Failed to copy link&apos;)
      }
      document.body.removeChild(textArea)
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url
        })
      } catch (error) {
        // User cancelled sharing or error occurred
      }
    }
  }

  return (
    <div className=&quot;flex items-center space-x-2&quot;>
      {/* Native Share API (mobile) */}
      {typeof window !== &apos;undefined&apos; && &apos;share&apos; in navigator && (
        <Button
          variant=&quot;ghost&quot;
          size=&quot;sm&quot;
          onClick={handleNativeShare}
          className=&quot;flex items-center space-x-1 text-gray-500 hover:text-gray-700&quot;
        >
          <Share2 className=&quot;w-4 h-4&quot; />
          <span>Share</span>
        </Button>
      )}

      {/* Twitter/X */}
      <Button
        variant=&quot;ghost&quot;
        size=&quot;sm&quot;
        onClick={() => handleShare(&apos;Twitter&apos;, shareLinks.twitter)}
        disabled={isSharing}
        className=&quot;flex items-center space-x-1 text-gray-500 hover:text-blue-500&quot;
        title=&quot;Share on X (Twitter)&quot;
      >
        <svg className=&quot;w-4 h-4&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;currentColor&quot;>
          <path d=&quot;M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z&quot;/>
        </svg>
        <span className=&quot;hidden sm:inline&quot;>X</span>
      </Button>

      {/* Reddit */}
      <Button
        variant=&quot;ghost&quot;
        size=&quot;sm&quot;
        onClick={() => handleShare(&apos;Reddit&apos;, shareLinks.reddit)}
        disabled={isSharing}
        className=&quot;flex items-center space-x-1 text-gray-500 hover:text-orange-500&quot;
        title=&quot;Share on Reddit&quot;
      >
        <svg className=&quot;w-4 h-4&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;currentColor&quot;>
          <path d=&quot;M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z&quot;/>
        </svg>
        <span className=&quot;hidden sm:inline&quot;>Reddit</span>
      </Button>

      {/* LinkedIn */}
      <Button
        variant=&quot;ghost&quot;
        size=&quot;sm&quot;
        onClick={() => handleShare(&apos;LinkedIn&apos;, shareLinks.linkedin)}
        disabled={isSharing}
        className=&quot;flex items-center space-x-1 text-gray-500 hover:text-blue-600&quot;
        title=&quot;Share on LinkedIn&quot;
      >
        <svg className=&quot;w-4 h-4&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;currentColor&quot;>
          <path d=&quot;M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z&quot;/>
        </svg>
        <span className=&quot;hidden sm:inline&quot;>LinkedIn</span>
      </Button>

      {/* Copy Link */}
      <Button
        variant=&quot;ghost&quot;
        size=&quot;sm&quot;
        onClick={handleCopyLink}
        className=&quot;flex items-center space-x-1 text-gray-500 hover:text-gray-700&quot;
        title=&quot;Copy link to clipboard&quot;
      >
        <Copy className=&quot;w-4 h-4&quot; />
        <span className=&quot;hidden sm:inline&quot;>Copy</span>
      </Button>
    </div>
  )
}