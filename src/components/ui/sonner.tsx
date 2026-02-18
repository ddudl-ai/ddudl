"use client&quot;

import { useTheme } from &quot;next-themes&quot;
import { Toaster as Sonner, ToasterProps } from &quot;sonner&quot;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = &quot;system&quot; } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps[&quot;theme&quot;]}
      className=&quot;toaster group&quot;
      style={
        {
          &quot;--normal-bg&quot;: &quot;var(--popover)&quot;,
          &quot;--normal-text&quot;: &quot;var(--popover-foreground)&quot;,
          &quot;--normal-border&quot;: &quot;var(--border)&quot;,
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
