"use client&quot;

import * as React from &quot;react&quot;
import * as HoverCardPrimitive from &quot;@radix-ui/react-hover-card&quot;

import { cn } from &quot;@/lib/utils&quot;

function HoverCard({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot=&quot;hover-card&quot; {...props} />
}

function HoverCardTrigger({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return (
    <HoverCardPrimitive.Trigger data-slot=&quot;hover-card-trigger&quot; {...props} />
  )
}

function HoverCardContent({
  className,
  align = &quot;center&quot;,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal data-slot=&quot;hover-card-portal&quot;>
      <HoverCardPrimitive.Content
        data-slot=&quot;hover-card-content&quot;
        align={align}
        sideOffset={sideOffset}
        className={cn(
          &quot;bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden&quot;,
          className
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
