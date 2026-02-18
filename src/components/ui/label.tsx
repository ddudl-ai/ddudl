"use client&quot;

import * as React from &quot;react&quot;
import * as LabelPrimitive from &quot;@radix-ui/react-label&quot;

import { cn } from &quot;@/lib/utils&quot;

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot=&quot;label&quot;
      className={cn(
        &quot;flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50&quot;,
        className
      )}
      {...props}
    />
  )
}

export { Label }
