"use client&quot;

import * as React from &quot;react&quot;
import * as ScrollAreaPrimitive from &quot;@radix-ui/react-scroll-area&quot;

import { cn } from &quot;@/lib/utils&quot;

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot=&quot;scroll-area&quot;
      className={cn(&quot;relative&quot;, className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot=&quot;scroll-area-viewport&quot;
        className=&quot;focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1&quot;
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = &quot;vertical&quot;,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot=&quot;scroll-area-scrollbar&quot;
      orientation={orientation}
      className={cn(
        &quot;flex touch-none p-px transition-colors select-none&quot;,
        orientation === &quot;vertical&quot; &&
          &quot;h-full w-2.5 border-l border-l-transparent&quot;,
        orientation === &quot;horizontal&quot; &&
          &quot;h-2.5 flex-col border-t border-t-transparent&quot;,
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot=&quot;scroll-area-thumb&quot;
        className=&quot;bg-border relative flex-1 rounded-full&quot;
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
