import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options?: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", error = false, disabled, children, options, ...props }, ref) => {
    return (
      <div className="relative w-full flex items-center">
        <select
          ref={ref}
          disabled={disabled}
          className={`w-full appearance-none bg-[#12151C] text-zinc-100 rounded-xl pl-3.5 pr-8 py-2 text-xs font-medium transition-all duration-150 border disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 cursor-pointer ${
            error
              ? "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20"
              : "border-white/[0.08] hover:border-white/[0.15] focus:border-indigo-500 focus:ring-indigo-500/20"
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#12151C] text-zinc-100">
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <div className="absolute right-2.5 pointer-events-none text-zinc-400">
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";
