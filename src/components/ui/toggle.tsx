"use client&quot;

import * as React from &quot;react&quot;
import * as TogglePrimitive from &quot;@radix-ui/react-toggle&quot;
import { cva, type VariantProps } from &quot;class-variance-authority&quot;

import { cn } from &quot;@/lib/utils&quot;

const toggleVariants = cva(
  &quot;inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*=&apos;size-&apos;])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap&quot;,
  {
    variants: {
      variant: {
        default: &quot;bg-transparent&quot;,
        outline:
          &quot;border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground&quot;,
      },
      size: {
        default: &quot;h-9 px-2 min-w-9&quot;,
        sm: &quot;h-8 px-1.5 min-w-8&quot;,
        lg: &quot;h-10 px-2.5 min-w-10&quot;,
      },
    },
    defaultVariants: {
      variant: &quot;default&quot;,
      size: &quot;default&quot;,
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot=&quot;toggle&quot;
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
