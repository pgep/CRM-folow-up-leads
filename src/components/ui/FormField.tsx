import React from "react";

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  hint,
  children,
  className = ""
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="flex items-center justify-between text-xs font-medium text-zinc-300">
          <span>
            {label}
            {required && <span className="text-rose-400 ml-1">*</span>}
          </span>
          {hint && <span className="text-[10px] text-zinc-500 font-normal">{hint}</span>}
        </label>
      )}
      {children}
      {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
    </div>
  );
};
