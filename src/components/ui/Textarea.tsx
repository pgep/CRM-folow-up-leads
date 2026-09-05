import React, { forwardRef } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error = false, disabled, rows = 3, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={`w-full bg-[var(--crm-surface-subtle)] text-[var(--crm-text)] placeholder-[var(--crm-text-muted)] rounded-xl px-3 py-2 text-xs transition-all duration-150 border disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 resize-y ${
          error
            ? "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20"
            : "border-[var(--crm-border)] hover:border-[var(--crm-border-strong)] focus:border-indigo-500 focus:ring-indigo-500/20"
        } ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
