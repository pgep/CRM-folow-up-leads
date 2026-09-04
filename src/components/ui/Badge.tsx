import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info" | "neutral" | "hot" | "warm" | "cold";
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = "",
  variant = "default",
  size = "sm",
  dot = false,
  ...props
}) => {
  const sizeStyles = {
    sm: "text-[11px] px-2.5 py-0.5 gap-1.5 font-medium rounded-md",
    md: "text-xs px-3 py-1 gap-1.5 font-semibold rounded-lg"
  }[size];

  // Map temperature aliases
  const resolvedVariant = 
    variant === "hot" ? "danger" :
    variant === "warm" ? "warning" :
    variant === "cold" ? "info" : variant;

  const variantStyles = {
    default: "bg-[#181C26] text-zinc-300 border border-white/[0.08]",
    primary: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium",
    success: "bg-emerald-500/12 text-emerald-300 border border-emerald-500/25",
    warning: "bg-amber-500/12 text-amber-300 border border-amber-500/25",
    danger: "bg-rose-500/12 text-rose-300 border border-rose-500/25",
    info: "bg-sky-500/12 text-sky-300 border border-sky-500/25",
    neutral: "bg-[#141822] text-zinc-400 border border-white/[0.06]"
  }[resolvedVariant];

  const dotColor = {
    default: "bg-zinc-400",
    primary: "bg-indigo-400",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    danger: "bg-rose-400",
    info: "bg-sky-400",
    neutral: "bg-zinc-500"
  }[resolvedVariant];

  return (
    <span
      className={`inline-flex items-center tracking-normal shrink-0 ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      {children}
    </span>
  );
};
