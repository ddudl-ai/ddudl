"use client&quot;

import * as React from &quot;react&quot;
import * as CheckboxPrimitive from &quot;@radix-ui/react-checkbox&quot;
import { CheckIcon } from &quot;lucide-react&quot;

import { cn } from &quot;@/lib/utils&quot;

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot=&quot;checkbox&quot;
      className={cn(
        &quot;peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50&quot;,
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot=&quot;checkbox-indicator&quot;
        className=&quot;flex items-center justify-center text-current transition-none&quot;
      >
        <CheckIcon className=&quot;size-3.5&quot; />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
