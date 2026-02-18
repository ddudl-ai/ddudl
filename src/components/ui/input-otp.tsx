"use client&quot;

import * as React from &quot;react&quot;
import { OTPInput, OTPInputContext } from &quot;input-otp&quot;
import { MinusIcon } from &quot;lucide-react&quot;

import { cn } from &quot;@/lib/utils&quot;

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string
}) {
  return (
    <OTPInput
      data-slot=&quot;input-otp&quot;
      containerClassName={cn(
        &quot;flex items-center gap-2 has-disabled:opacity-50&quot;,
        containerClassName
      )}
      className={cn(&quot;disabled:cursor-not-allowed&quot;, className)}
      {...props}
    />
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div
      data-slot=&quot;input-otp-group&quot;
      className={cn(&quot;flex items-center&quot;, className)}
      {...props}
    />
  )
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<&quot;div&quot;> & {
  index: number
}) {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}

  return (
    <div
      data-slot=&quot;input-otp-slot&quot;
      data-active={isActive}
      className={cn(
        &quot;data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive dark:bg-input/30 border-input relative flex h-9 w-9 items-center justify-center border-y border-r text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px]&quot;,
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className=&quot;pointer-events-none absolute inset-0 flex items-center justify-center&quot;>
          <div className=&quot;animate-caret-blink bg-foreground h-4 w-px duration-1000&quot; />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({ ...props }: React.ComponentProps<&quot;div&quot;>) {
  return (
    <div data-slot=&quot;input-otp-separator&quot; role=&quot;separator&quot; {...props}>
      <MinusIcon />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
