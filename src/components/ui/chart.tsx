"use client&quot;

import * as React from &quot;react&quot;
import * as RechartsPrimitive from &quot;recharts&quot;

import { cn } from &quot;@/lib/utils&quot;

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: &quot;", dark: &quot;.dark&quot; } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error(&quot;useChart must be used within a <ChartContainer />&quot;)
  }

  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<&quot;div&quot;> & {
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >[&quot;children&quot;]
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, &quot;")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot=&quot;chart&quot;
        data-chart={chartId}
        className={cn(
          &quot;[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke=&apos;#ccc&apos;]]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke=&apos;#ccc&apos;]]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke=&apos;#ccc&apos;]]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke=&apos;#fff&apos;]]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke=&apos;#fff&apos;]]:stroke-transparent [&_.recharts-surface]:outline-hidden&quot;,
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join(&quot;\n&quot;)}
}
`
          )
          .join(&quot;\n&quot;),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = &quot;dot&quot;,
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: {
  active?: boolean
  payload?: any[]
  className?: string
  indicator?: &quot;line&quot; | &quot;dot&quot; | &quot;dashed&quot;
  hideLabel?: boolean
  hideIndicator?: boolean
  label?: string
  labelFormatter?: (label: any, payload: any) => React.ReactNode
  labelClassName?: string
  formatter?: (value: any, name: any, item: any, index: number, payload: any) => React.ReactNode
  color?: string
  nameKey?: string
  labelKey?: string
}) {
  const { config } = useChart()

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null
    }

    const [item] = payload
    const key = `${labelKey || item?.dataKey || item?.name || &quot;value&quot;}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value =
      !labelKey && typeof label === &quot;string&quot;
        ? config[label as keyof typeof config]?.label || label
        : itemConfig?.label

    if (labelFormatter) {
      return (
        <div className={cn(&quot;font-medium&quot;, labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      )
    }

    if (!value) {
      return null
    }

    return <div className={cn(&quot;font-medium&quot;, labelClassName)}>{value}</div>
  }, [
    label,
    labelFormatter,
    payload,
    hideLabel,
    labelClassName,
    config,
    labelKey,
  ])

  if (!active || !payload?.length) {
    return null
  }

  const nestLabel = payload.length === 1 && indicator !== &quot;dot&quot;

  return (
    <div
      className={cn(
        &quot;border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl&quot;,
        className
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className=&quot;grid gap-1.5&quot;>
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || &quot;value&quot;}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)
          const indicatorColor = color || item.payload.fill || item.color

          return (
            <div
              key={item.dataKey}
              className={cn(
                &quot;[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5&quot;,
                indicator === &quot;dot&quot; && &quot;items-center&quot;
              )}
            >
              {formatter && item?.value !== undefined && item.name ? (
                formatter(item.value, item.name, item, index, item.payload)
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn(
                          &quot;shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)&quot;,
                          {
                            &quot;h-2.5 w-2.5&quot;: indicator === &quot;dot&quot;,
                            &quot;w-1&quot;: indicator === &quot;line&quot;,
                            &quot;w-0 border-[1.5px] border-dashed bg-transparent&quot;:
                              indicator === &quot;dashed&quot;,
                            &quot;my-0.5&quot;: nestLabel && indicator === &quot;dashed&quot;,
                          }
                        )}
                        style={
                          {
                            &quot;--color-bg&quot;: indicatorColor,
                            &quot;--color-border&quot;: indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    )
                  )}
                  <div
                    className={cn(
                      &quot;flex flex-1 justify-between leading-none&quot;,
                      nestLabel ? &quot;items-end&quot; : &quot;items-center&quot;
                    )}
                  >
                    <div className=&quot;grid gap-1.5&quot;>
                      {nestLabel ? tooltipLabel : null}
                      <span className=&quot;text-muted-foreground&quot;>
                        {itemConfig?.label || item.name}
                      </span>
                    </div>
                    {item.value && (
                      <span className=&quot;text-foreground font-mono font-medium tabular-nums&quot;>
                        {item.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = &quot;bottom&quot;,
  nameKey,
}: {
  className?: string
  hideIcon?: boolean
  payload?: any[]
  verticalAlign?: &quot;top&quot; | &quot;bottom&quot;
  nameKey?: string
}) {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        &quot;flex items-center justify-center gap-4&quot;,
        verticalAlign === &quot;top&quot; ? &quot;pb-3&quot; : &quot;pt-3&quot;,
        className
      )}
    >
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || &quot;value&quot;}`
        const itemConfig = getPayloadConfigFromPayload(config, item, key)

        return (
          <div
            key={item.value}
            className={cn(
              &quot;[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3&quot;
            )}
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className=&quot;h-2 w-2 shrink-0 rounded-[2px]&quot;
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            {itemConfig?.label}
          </div>
        )
      })}
    </div>
  )
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== &quot;object&quot; || payload === null) {
    return undefined
  }

  const payloadPayload =
    &quot;payload&quot; in payload &&
    typeof payload.payload === &quot;object&quot; &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === &quot;string&quot;
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === &quot;string&quot;
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
