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
        <label className="flex items-center justify-between text-xs font-semibold text-[var(--crm-text-secondary)]">
          <span>
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </span>
          {hint && <span className="text-[10px] text-[var(--crm-text-muted)] font-normal">{hint}</span>}
        </label>
      )}
      {children}
      {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
    </div>
  );
};
