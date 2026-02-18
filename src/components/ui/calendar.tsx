"use client&quot;

import * as React from &quot;react&quot;
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from &quot;lucide-react&quot;
import { DayButton, DayPicker, getDefaultClassNames } from &quot;react-day-picker&quot;

import { cn } from &quot;@/lib/utils&quot;
import { Button, buttonVariants } from &quot;@/components/ui/button&quot;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = &quot;label&quot;,
  buttonVariant = &quot;ghost&quot;,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>[&quot;variant&quot;]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        &quot;bg-background group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent&quot;,
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(&quot;default&quot;, { month: &quot;short&quot; }),
        ...formatters,
      }}
      classNames={{
        root: cn(&quot;w-fit&quot;, defaultClassNames.root),
        months: cn(
          &quot;flex gap-4 flex-col md:flex-row relative&quot;,
          defaultClassNames.months
        ),
        month: cn(&quot;flex flex-col w-full gap-4&quot;, defaultClassNames.month),
        nav: cn(
          &quot;flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between&quot;,
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          &quot;size-(--cell-size) aria-disabled:opacity-50 p-0 select-none&quot;,
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          &quot;size-(--cell-size) aria-disabled:opacity-50 p-0 select-none&quot;,
          defaultClassNames.button_next
        ),
        month_caption: cn(
          &quot;flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)&quot;,
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          &quot;w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5&quot;,
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          &quot;relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md&quot;,
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          &quot;absolute bg-popover inset-0 opacity-0&quot;,
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          &quot;select-none font-medium&quot;,
          captionLayout === &quot;label&quot;
            ? &quot;text-sm&quot;
            : &quot;rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5&quot;,
          defaultClassNames.caption_label
        ),
        table: &quot;w-full border-collapse&quot;,
        weekdays: cn(&quot;flex&quot;, defaultClassNames.weekdays),
        weekday: cn(
          &quot;text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none&quot;,
          defaultClassNames.weekday
        ),
        week: cn(&quot;flex w-full mt-2&quot;, defaultClassNames.week),
        week_number_header: cn(
          &quot;select-none w-(--cell-size)&quot;,
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          &quot;text-[0.8rem] select-none text-muted-foreground&quot;,
          defaultClassNames.week_number
        ),
        day: cn(
          &quot;relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none&quot;,
          defaultClassNames.day
        ),
        range_start: cn(
          &quot;rounded-l-md bg-accent&quot;,
          defaultClassNames.range_start
        ),
        range_middle: cn(&quot;rounded-none&quot;, defaultClassNames.range_middle),
        range_end: cn(&quot;rounded-r-md bg-accent&quot;, defaultClassNames.range_end),
        today: cn(
          &quot;bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none&quot;,
          defaultClassNames.today
        ),
        outside: cn(
          &quot;text-muted-foreground aria-selected:text-muted-foreground&quot;,
          defaultClassNames.outside
        ),
        disabled: cn(
          &quot;text-muted-foreground opacity-50&quot;,
          defaultClassNames.disabled
        ),
        hidden: cn(&quot;invisible&quot;, defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot=&quot;calendar&quot;
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === &quot;left&quot;) {
            return (
              <ChevronLeftIcon className={cn(&quot;size-4&quot;, className)} {...props} />
            )
          }

          if (orientation === &quot;right&quot;) {
            return (
              <ChevronRightIcon
                className={cn(&quot;size-4&quot;, className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn(&quot;size-4&quot;, className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className=&quot;flex size-(--cell-size) items-center justify-center text-center&quot;>
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant=&quot;ghost&quot;
      size=&quot;icon&quot;
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        &quot;data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70&quot;,
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
