import * as React from &quot;react&quot;
import { Slot } from &quot;@radix-ui/react-slot&quot;
import { cva, type VariantProps } from &quot;class-variance-authority&quot;

import { cn } from &quot;@/lib/utils&quot;

const buttonVariants = cva(
  &quot;inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*=&apos;size-&apos;])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive&quot;,
  {
    variants: {
      variant: {
        default:
          &quot;bg-primary text-primary-foreground shadow-xs hover:bg-primary/90&quot;,
        destructive:
          &quot;bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60&quot;,
        outline:
          &quot;border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50&quot;,
        secondary:
          &quot;bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80&quot;,
        ghost:
          &quot;hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50&quot;,
        link: &quot;text-primary underline-offset-4 hover:underline&quot;,
      },
      size: {
        default: &quot;h-9 px-4 py-2 has-[>svg]:px-3&quot;,
        sm: &quot;h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5&quot;,
        lg: &quot;h-10 rounded-md px-6 has-[>svg]:px-4&quot;,
        icon: &quot;size-9&quot;,
      },
    },
    defaultVariants: {
      variant: &quot;default&quot;,
      size: &quot;default&quot;,
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<&quot;button&quot;> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : &quot;button&quot;

  return (
    <Comp
      data-slot=&quot;button&quot;
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
