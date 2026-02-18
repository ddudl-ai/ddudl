"use client&quot;

import * as React from &quot;react&quot;
import * as SwitchPrimitive from &quot;@radix-ui/react-switch&quot;

import { cn } from &quot;@/lib/utils&quot;

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot=&quot;switch&quot;
      className={cn(
        &quot;peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50&quot;,
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot=&quot;switch-thumb&quot;
        className={cn(
          &quot;bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0&quot;
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
