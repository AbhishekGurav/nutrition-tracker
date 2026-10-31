import * as React from "react"
import { TextField as TextFieldPrimitive } from "react-aria-components"

import { cn } from "~/lib/utils"
import { FieldDescription, FieldError, FieldLabel } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { Textarea } from "~/components/ui/textarea"

interface TextFieldProps {
  label: React.ReactNode
  value: string
  onChange: (value: string) => void
  description?: React.ReactNode
  error?: string
  placeholder?: string
  autoFocus?: boolean
  isRequired?: boolean
  multiline?: boolean
  maxLength?: number
  className?: string
  name?: string
  onBlur?: () => void
}

/** Labelled text input (or textarea) with description and error wiring. */
export function TextField({
  label,
  value,
  onChange,
  description,
  error,
  placeholder,
  autoFocus,
  isRequired,
  multiline,
  maxLength,
  className,
  name,
  onBlur,
}: TextFieldProps) {
  return (
    <TextFieldPrimitive
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      isInvalid={!!error}
      isRequired={isRequired}
      autoFocus={autoFocus}
      maxLength={maxLength}
      name={name}
      data-slot="field"
      data-invalid={error ? true : undefined}
      className={cn("group/field flex w-full flex-col gap-2", className)}
    >
      <FieldLabel>{label}</FieldLabel>
      {multiline ? <Textarea placeholder={placeholder} /> : <Input placeholder={placeholder} />}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </TextFieldPrimitive>
  )
}
