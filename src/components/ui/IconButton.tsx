import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  "aria-label": string;
  icon?: React.ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      children,
      className = "",
      variant = "ghost",
      size = "md",
      loading = false,
      disabled,
      icon,
      "aria-label": ariaLabel,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center transition-all duration-150 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95";

    const sizeStyles = {
      xs: "w-7 h-7 p-1 text-xs",
      sm: "w-8 h-8 p-1.5 text-xs",
      md: "w-9 h-9 p-2 text-sm",
      lg: "w-11 h-11 p-2.5 text-base"
    }[size];

    const variantStyles = {
      primary:
        "bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 focus-visible:ring-indigo-500/50 shadow-sm",
      secondary:
        "bg-[#181C26] text-zinc-300 hover:text-white hover:bg-[#202534] border border-white/[0.08] focus-visible:ring-indigo-500/50",
      outline:
        "bg-transparent text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-white/[0.08] focus-visible:ring-indigo-500/50",
      ghost:
        "bg-transparent text-zinc-400 hover:text-white hover:bg-white/[0.04] focus-visible:ring-indigo-500/50",
      danger:
        "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 border border-rose-500/25 focus-visible:ring-rose-500/50"
    }[variant];

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        title={ariaLabel}
        disabled={isDisabled}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          icon || children
        )}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
