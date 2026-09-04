import React, { forwardRef } from "react";
import { Check } from "lucide-react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", label, description, checked, disabled, id, onChange, ...props }, ref) => {
    const inputId = id || (label ? `cb-${String(label).toLowerCase().replace(/\s+/g, "-").slice(0, 20)}` : undefined);

    return (
      <label
        htmlFor={inputId}
        className={`inline-flex items-start gap-2.5 cursor-pointer select-none group ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${className}`}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="sr-only peer"
            {...props}
          />
          <div className="w-4 h-4 rounded-md border border-zinc-700 bg-[#0B0D12] peer-checked:bg-indigo-600 peer-checked:border-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-zinc-950 transition-all flex items-center justify-center">
            {checked && <Check className="w-3 h-3 text-white stroke-[3]" />}
          </div>
        </div>
        {(label || description) && (
          <div className="text-xs">
            {label && <span className="font-medium text-zinc-200 group-hover:text-white transition-colors">{label}</span>}
            {description && <p className="text-zinc-500 text-[11px] leading-snug mt-0.5">{description}</p>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
