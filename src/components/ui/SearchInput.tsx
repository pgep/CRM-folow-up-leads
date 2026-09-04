import React from "react";
import { Search, X } from "lucide-react";
import { Input, InputProps } from "./Input";

export interface SearchInputProps extends Omit<InputProps, "leftIcon" | "rightElement"> {
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = "Buscar...",
  className = "",
  ...props
}) => {
  const hasValue = Boolean(value && String(value).length > 0);

  return (
    <Input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      leftIcon={<Search className="w-4 h-4" />}
      rightElement={
        hasValue && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="p-1 text-zinc-500 hover:text-zinc-200 rounded-md transition-colors"
            title="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : undefined
      }
      className={className}
      {...props}
    />
  );
};
