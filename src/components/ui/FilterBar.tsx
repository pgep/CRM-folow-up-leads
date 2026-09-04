import React from "react";

export interface FilterBarProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  children,
  actions,
  className = ""
}) => {
  return (
    <div
      className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs ${className}`}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2.5 min-w-0">
        {children}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800/80">
          {actions}
        </div>
      )}
    </div>
  );
};
