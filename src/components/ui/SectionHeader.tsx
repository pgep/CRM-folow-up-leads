import React from "react";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  className = ""
}) => {
  return (
    <div className={`flex items-center justify-between gap-3 mb-3 ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-indigo-400 shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-100 tracking-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] text-zinc-500 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
