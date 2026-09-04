import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  variant?: "default" | "elevated" | "subtle";
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  hoverable = false,
  variant = "default",
  ...props
}) => {
  const bgVariant = {
    default: "bg-[#12151C] border-white/[0.06]",
    elevated: "bg-[#181C26] border-white/[0.08] shadow-lg shadow-black/30",
    subtle: "bg-[#0E1118] border-white/[0.04]"
  }[variant];

  return (
    <div
      className={`border rounded-2xl p-5 transition-all duration-200 ${bgVariant} ${
        hoverable ? "hover:border-white/[0.12] hover:bg-[#161B26] hover:shadow-md cursor-pointer" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`flex flex-col space-y-1.5 pb-4 border-b border-white/[0.06] ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <h3 className={`text-base font-bold text-zinc-100 tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <p className={`text-xs text-zinc-400 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`pt-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
};
