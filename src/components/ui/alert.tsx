import * as React from &quot;react&quot;
import { cva, type VariantProps } from &quot;class-variance-authority&quot;

import { cn } from &quot;@/lib/utils&quot;

const alertVariants = cva(
  &quot;relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current&quot;,
  {
    variants: {
      variant: {
        default: &quot;bg-card text-card-foreground&quot;,
        destructive:
          &quot;text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90&quot;,
      },
    },
    defaultVariants: {
      variant: &quot;default&quot;,
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<&quot;div&quot;> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot=&quot;alert&quot;
      role=&quot;alert&quot;
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div
      data-slot=&quot;alert-title&quot;
      className={cn(
        &quot;col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight&quot;,
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div
      data-slot=&quot;alert-description&quot;
      className={cn(
        &quot;text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed&quot;,
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
