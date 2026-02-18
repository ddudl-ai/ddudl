"use client&quot;

import * as React from &quot;react&quot;
import * as PopoverPrimitive from &quot;@radix-ui/react-popover&quot;

import { cn } from &quot;@/lib/utils&quot;

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot=&quot;popover&quot; {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot=&quot;popover-trigger&quot; {...props} />
}

function PopoverContent({
  className,
  align = &quot;center&quot;,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot=&quot;popover-content&quot;
        align={align}
        sideOffset={sideOffset}
        className={cn(
          &quot;bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden&quot;,
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot=&quot;popover-anchor&quot; {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
