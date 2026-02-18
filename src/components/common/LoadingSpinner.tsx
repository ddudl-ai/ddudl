import { Loader2 } from &quot;lucide-react&quot;
import { cn } from &quot;@/lib/utils&quot;

interface LoadingSpinnerProps {
  size?: &quot;sm&quot; | &quot;md&quot; | &quot;lg&quot;
  className?: string
  text?: string
}

export function LoadingSpinner({ size = &quot;md&quot;, className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: &quot;h-4 w-4&quot;,
    md: &quot;h-6 w-6&quot;, 
    lg: &quot;h-8 w-8&quot;
  }

  return (
    <div className={cn(&quot;flex items-center space-x-2&quot;, className)}>
      <Loader2 className={cn(&quot;animate-spin&quot;, sizeClasses[size])} />
      {text && <span className=&quot;text-sm text-muted-foreground&quot;>{text}</span>}
    </div>
  )
}