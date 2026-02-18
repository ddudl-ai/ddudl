"use client&quot;

import * as React from &quot;react&quot;

import { cn } from &quot;@/lib/utils&quot;

function Table({ className, ...props }: React.ComponentProps<&quot;table&quot;>) {
  return (
    <div
      data-slot=&quot;table-container&quot;
      className=&quot;relative w-full overflow-x-auto&quot;
    >
      <table
        data-slot=&quot;table&quot;
        className={cn(&quot;w-full caption-bottom text-sm&quot;, className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<&quot;thead&quot;>) {
  return (
    <thead
      data-slot=&quot;table-header&quot;
      className={cn(&quot;[&_tr]:border-b&quot;, className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<&quot;tbody&quot;>) {
  return (
    <tbody
      data-slot=&quot;table-body&quot;
      className={cn(&quot;[&_tr:last-child]:border-0&quot;, className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<&quot;tfoot&quot;>) {
  return (
    <tfoot
      data-slot=&quot;table-footer&quot;
      className={cn(
        &quot;bg-muted/50 border-t font-medium [&>tr]:last:border-b-0&quot;,
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<&quot;tr&quot;>) {
  return (
    <tr
      data-slot=&quot;table-row&quot;
      className={cn(
        &quot;hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors&quot;,
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<&quot;th&quot;>) {
  return (
    <th
      data-slot=&quot;table-head&quot;
      className={cn(
        &quot;text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]&quot;,
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<&quot;td&quot;>) {
  return (
    <td
      data-slot=&quot;table-cell&quot;
      className={cn(
        &quot;p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]&quot;,
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<&quot;caption&quot;>) {
  return (
    <caption
      data-slot=&quot;table-caption&quot;
      className={cn(&quot;text-muted-foreground mt-4 text-sm&quot;, className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
