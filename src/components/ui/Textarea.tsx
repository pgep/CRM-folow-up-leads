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
        className={`w-full bg-[#0B0D12] text-zinc-100 placeholder-zinc-500 rounded-xl px-3 py-2 text-xs transition-all duration-150 border disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 resize-y ${
          error
            ? "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20"
            : "border-white/[0.08] hover:border-white/[0.14] focus:border-indigo-500 focus:ring-indigo-500/20"
        } ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
