"use client&quot;

import * as React from &quot;react&quot;
import * as LabelPrimitive from &quot;@radix-ui/react-label&quot;
import { Slot } from &quot;@radix-ui/react-slot&quot;
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from &quot;react-hook-form&quot;

import { cn } from &quot;@/lib/utils&quot;
import { Label } from &quot;@/components/ui/label&quot;

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error(&quot;useFormField should be used within <FormField>&quot;)
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

function FormItem({ className, ...props }: React.ComponentProps<&quot;div&quot;>) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot=&quot;form-item&quot;
        className={cn(&quot;grid gap-2&quot;, className)}
        {...props}
      />
    </FormItemContext.Provider>
  )
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId } = useFormField()

  return (
    <Label
      data-slot=&quot;form-label&quot;
      data-error={!!error}
      className={cn(&quot;data-[error=true]:text-destructive&quot;, className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      data-slot=&quot;form-control&quot;
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
}

function FormDescription({ className, ...props }: React.ComponentProps<&quot;p&quot;>) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      data-slot=&quot;form-description&quot;
      id={formDescriptionId}
      className={cn(&quot;text-muted-foreground text-sm&quot;, className)}
      {...props}
    />
  )
}

function FormMessage({ className, ...props }: React.ComponentProps<&quot;p&quot;>) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? &quot;") : props.children

  if (!body) {
    return null
  }

  return (
    <p
      data-slot=&quot;form-message&quot;
      id={formMessageId}
      className={cn(&quot;text-destructive text-sm&quot;, className)}
      {...props}
    >
      {body}
    </p>
  )
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
