import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "destructive";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "md",
      loading = false,
      loadingText,
      disabled,
      leftIcon,
      rightIcon,
      icon,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0B0D12] select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]";

    const sizeStyles = {
      xs: "text-xs px-2.5 py-1 gap-1.5 h-7.5",
      sm: "text-xs px-3 py-1.5 gap-1.5 h-8.5",
      md: "text-xs sm:text-sm px-4 py-2 gap-2 h-10",
      lg: "text-sm px-5 py-2.5 gap-2.5 h-11.5"
    }[size];

    const actualVariant = variant === "destructive" ? "danger" : variant;

    const variantStyles = {
      primary:
        "bg-[#6366F1] text-white font-semibold hover:bg-[#4F46E5] active:bg-[#4338CA] focus-visible:ring-indigo-500/50 shadow-sm shadow-indigo-950/40",
      secondary:
        "bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-900 border border-slate-300/80 dark:bg-[#181C26] dark:text-zinc-200 dark:hover:bg-[#202534] dark:hover:text-white dark:border-white/[0.08] focus-visible:ring-zinc-500 shadow-xs",
      outline:
        "bg-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300/80 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-[#181C26] dark:border-white/[0.12] focus-visible:ring-zinc-500",
      ghost:
        "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.06] focus-visible:ring-zinc-500",
      danger:
        "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 hover:text-rose-800 border border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25 dark:hover:text-rose-200 focus-visible:ring-rose-500/50"
    }[actualVariant];

    const effectiveLeftIcon = leftIcon || icon;
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {effectiveLeftIcon && <span className="shrink-0">{effectiveLeftIcon}</span>}
            {children && <span>{children}</span>}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
