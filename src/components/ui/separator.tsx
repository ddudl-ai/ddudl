"use client&quot;

import * as React from &quot;react&quot;
import * as SeparatorPrimitive from &quot;@radix-ui/react-separator&quot;

import { cn } from &quot;@/lib/utils&quot;

function Separator({
  className,
  orientation = &quot;horizontal&quot;,
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot=&quot;separator&quot;
      decorative={decorative}
      orientation={orientation}
      className={cn(
        &quot;bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px&quot;,
        className
      )}
      {...props}
    />
  )
}

export { Separator }
