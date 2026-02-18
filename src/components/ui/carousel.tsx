"use client&quot;

import * as React from &quot;react&quot;
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from &quot;embla-carousel-react&quot;
import { ArrowLeft, ArrowRight } from &quot;lucide-react&quot;

import { cn } from &quot;@/lib/utils&quot;
import { Button } from &quot;@/components/ui/button&quot;

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: &quot;horizontal&quot; | &quot;vertical&quot;
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error(&quot;useCarousel must be used within a <Carousel />&quot;)
  }

  return context
}

function Carousel({
  orientation = &quot;horizontal&quot;,
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: React.ComponentProps<&quot;div&quot;> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === &quot;horizontal&quot; ? &quot;x&quot; : &quot;y&quot;,
    },
    plugins
  )
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return
    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())
  }, [])

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev()
  }, [api])

  const scrollNext = React.useCallback(() => {
    api?.scrollNext()
  }, [api])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === &quot;ArrowLeft&quot;) {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === &quot;ArrowRight&quot;) {
        event.preventDefault()
        scrollNext()
      }
    },
    [scrollPrev, scrollNext]
  )

  React.useEffect(() => {
    if (!api || !setApi) return
    setApi(api)
  }, [api, setApi])

  React.useEffect(() => {
    if (!api) return
    onSelect(api)
    api.on(&quot;reInit&quot;, onSelect)
    api.on(&quot;select&quot;, onSelect)

    return () => {
      api?.off(&quot;select&quot;, onSelect)
    }
  }, [api, onSelect])

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation:
          orientation || (opts?.axis === &quot;y&quot; ? &quot;vertical&quot; : &quot;horizontal&quot;),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn(&quot;relative&quot;, className)}
        role=&quot;region&quot;
        aria-roledescription=&quot;carousel&quot;
        data-slot=&quot;carousel&quot;
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

function CarouselContent({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div
      ref={carouselRef}
      className=&quot;overflow-hidden&quot;
      data-slot=&quot;carousel-content&quot;
    >
      <div
        className={cn(
          &quot;flex&quot;,
          orientation === &quot;horizontal&quot; ? &quot;-ml-4&quot; : &quot;-mt-4 flex-col&quot;,
          className
        )}
        {...props}
      />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  const { orientation } = useCarousel()

  return (
    <div
      role=&quot;group&quot;
      aria-roledescription=&quot;slide&quot;
      data-slot=&quot;carousel-item&quot;
      className={cn(
        &quot;min-w-0 shrink-0 grow-0 basis-full&quot;,
        orientation === &quot;horizontal&quot; ? &quot;pl-4&quot; : &quot;pt-4&quot;,
        className
      )}
      {...props}
    />
  )
}

function CarouselPrevious({
  className,
  variant = &quot;outline&quot;,
  size = &quot;icon&quot;,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      data-slot=&quot;carousel-previous&quot;
      variant={variant}
      size={size}
      className={cn(
        &quot;absolute size-8 rounded-full&quot;,
        orientation === &quot;horizontal&quot;
          ? &quot;top-1/2 -left-12 -translate-y-1/2&quot;
          : &quot;-top-12 left-1/2 -translate-x-1/2 rotate-90&quot;,
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft />
      <span className=&quot;sr-only&quot;>Previous slide</span>
    </Button>
  )
}

function CarouselNext({
  className,
  variant = &quot;outline&quot;,
  size = &quot;icon&quot;,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      data-slot=&quot;carousel-next&quot;
      variant={variant}
      size={size}
      className={cn(
        &quot;absolute size-8 rounded-full&quot;,
        orientation === &quot;horizontal&quot;
          ? &quot;top-1/2 -right-12 -translate-y-1/2&quot;
          : &quot;-bottom-12 left-1/2 -translate-x-1/2 rotate-90&quot;,
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight />
      <span className=&quot;sr-only&quot;>Next slide</span>
    </Button>
  )
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}
