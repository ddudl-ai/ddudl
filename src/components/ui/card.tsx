import * as React from &quot;react&quot;

import { cn } from &quot;@/lib/utils&quot;

function Card({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div
      data-slot=&quot;card&quot;
      className={cn(
        &quot;bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm&quot;,
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div
      data-slot=&quot;card-header&quot;
      className={cn(
        &quot;@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6&quot;,
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div
      data-slot=&quot;card-title&quot;
      className={cn(&quot;leading-none font-semibold&quot;, className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div
      data-slot=&quot;card-description&quot;
      className={cn(&quot;text-muted-foreground text-sm&quot;, className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div
      data-slot=&quot;card-action&quot;
      className={cn(
        &quot;col-start-2 row-span-2 row-start-1 self-start justify-self-end&quot;,
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div
      data-slot=&quot;card-content&quot;
      className={cn(&quot;px-6&quot;, className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div
      data-slot=&quot;card-footer&quot;
      className={cn(&quot;flex items-center px-6 [.border-t]:pt-6&quot;, className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
