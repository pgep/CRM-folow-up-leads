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
      "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D12] select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]";

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
        "bg-[#181C26] text-zinc-200 hover:bg-[#202534] hover:text-white border border-white/[0.08] focus-visible:ring-zinc-500",
      outline:
        "bg-transparent text-zinc-300 hover:text-white hover:bg-[#181C26] border border-white/[0.12] focus-visible:ring-zinc-500",
      ghost:
        "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] focus-visible:ring-zinc-500",
      danger:
        "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 hover:text-rose-200 border border-rose-500/30 focus-visible:ring-rose-500/50"
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
