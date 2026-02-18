"use client&quot;

import * as React from &quot;react&quot;
import * as SliderPrimitive from &quot;@radix-ui/react-slider&quot;

import { cn } from &quot;@/lib/utils&quot;

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot=&quot;slider&quot;
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        &quot;relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col&quot;,
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot=&quot;slider-track&quot;
        className={cn(
          &quot;bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5&quot;
        )}
      >
        <SliderPrimitive.Range
          data-slot=&quot;slider-range&quot;
          className={cn(
            &quot;bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full&quot;
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot=&quot;slider-thumb&quot;
          key={index}
          className=&quot;border-primary bg-background ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50&quot;
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
