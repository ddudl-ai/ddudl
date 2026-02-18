import { cn } from &quot;@/lib/utils&quot;

function Skeleton({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div
      data-slot=&quot;skeleton&quot;
      className={cn(&quot;bg-accent animate-pulse rounded-md&quot;, className)}
      {...props}
    />
  )
}

export { Skeleton }
