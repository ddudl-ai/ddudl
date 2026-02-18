"use client&quot;

import * as React from &quot;react&quot;
import * as ProgressPrimitive from &quot;@radix-ui/react-progress&quot;

import { cn } from &quot;@/lib/utils&quot;

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot=&quot;progress&quot;
      className={cn(
        &quot;bg-primary/20 relative h-2 w-full overflow-hidden rounded-full&quot;,
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot=&quot;progress-indicator&quot;
        className=&quot;bg-primary h-full w-full flex-1 transition-all&quot;
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
