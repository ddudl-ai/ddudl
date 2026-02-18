import * as React from &quot;react&quot;
import { Slot } from &quot;@radix-ui/react-slot&quot;
import { cva, type VariantProps } from &quot;class-variance-authority&quot;

import { cn } from &quot;@/lib/utils&quot;

const badgeVariants = cva(
  &quot;inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden&quot;,
  {
    variants: {
      variant: {
        default:
          &quot;border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90&quot;,
        secondary:
          &quot;border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90&quot;,
        destructive:
          &quot;border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60&quot;,
        outline:
          &quot;text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground&quot;,
      },
    },
    defaultVariants: {
      variant: &quot;default&quot;,
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<&quot;span&quot;> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : &quot;span&quot;

  return (
    <Comp
      data-slot=&quot;badge&quot;
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
