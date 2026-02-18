"use client&quot;

import * as React from &quot;react&quot;
import * as AvatarPrimitive from &quot;@radix-ui/react-avatar&quot;

import { cn } from &quot;@/lib/utils&quot;

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot=&quot;avatar&quot;
      className={cn(
        &quot;relative flex size-8 shrink-0 overflow-hidden rounded-full&quot;,
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot=&quot;avatar-image&quot;
      className={cn(&quot;aspect-square size-full&quot;, className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot=&quot;avatar-fallback&quot;
      className={cn(
        &quot;bg-muted flex size-full items-center justify-center rounded-full&quot;,
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
