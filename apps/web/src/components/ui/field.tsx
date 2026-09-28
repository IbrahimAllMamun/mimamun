import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const controlClass =
  "block w-full rounded-xs border border-rule-strong bg-elevated px-3 text-base text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] duration-(--duration-fast) focus:border-ink focus:outline-2 focus:outline-offset-0 focus:outline-accent-mark aria-[invalid=true]:border-error disabled:opacity-60";

export interface FieldProps {
  label: string;
  description?: ReactNode;
  error?: string | null;
  required?: boolean;
  optionalLabel?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
    required?: boolean;
  }) => ReactNode;
}

/**
 * Label, description and inline error wired to the control through
 * aria-describedby / aria-invalid. The label is always visible.
 */
export function Field({
  label,
  description,
  error,
  required,
  optionalLabel,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-medium text-ink">
        {label}
        {/* Required state reaches assistive technology through the control's required attribute. */}
        {required ? (
          <span aria-hidden className="text-accent">
            *
          </span>
        ) : null}
        {!required && optionalLabel ? (
          <span className="font-normal text-ink-3">optional</span>
        ) : null}
      </label>
      {description ? (
        <p id={descriptionId} className="text-sm text-ink-3">
          {description}
        </p>
      ) : null}
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        required,
      })}
      {error ? (
        <p id={errorId} className="animate-fade text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClass, "min-h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(controlClass, "min-h-32 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(controlClass, "min-h-11 appearance-auto pr-8", className)} {...props}>
      {children}
    </select>
  );
}
