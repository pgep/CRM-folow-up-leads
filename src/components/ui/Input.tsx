import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error = false, leftIcon, rightElement, disabled, ...props }, ref) => {
    return (
      <div className="relative w-full flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-zinc-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full bg-[var(--crm-surface-subtle)] text-[var(--crm-text)] placeholder-[var(--crm-text-muted)] rounded-xl px-3.5 py-2 text-sm transition-all duration-150 border disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${
            error
              ? "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20"
              : "border-[var(--crm-border)] hover:border-[var(--crm-border-strong)] focus:border-indigo-500 focus:ring-indigo-500/25"
          } ${leftIcon ? "pl-10" : ""} ${rightElement ? "pr-10" : ""} ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 flex items-center text-zinc-400">
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
