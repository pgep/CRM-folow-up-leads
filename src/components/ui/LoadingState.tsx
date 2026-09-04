import React from "react";
import { Loader2 } from "lucide-react";

export interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = "md", className = "" }) => {
  const sizeClass = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  }[size];

  return (
    <Loader2
      className={`animate-spin text-indigo-400 ${sizeClass} ${className}`}
    />
  );
};

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = "Carregando dados...",
  className = ""
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-3 ${className}`}
    >
      <Spinner size="lg" />
      <p className="text-xs text-zinc-400 font-medium">{label}</p>
    </div>
  );
};
