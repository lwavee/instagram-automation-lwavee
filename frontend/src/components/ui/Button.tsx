import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "gradient";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export function Button({
  className,
  variant = "default",
  size = "md",
  isLoading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variantStyles = {
    default: "bg-brand-600 text-white hover:bg-brand-500 shadow-md shadow-brand-500/20 active:scale-[0.98]",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
    outline: "border border-border bg-transparent hover:bg-secondary hover:text-foreground active:scale-[0.98]",
    ghost: "bg-transparent hover:bg-secondary hover:text-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
    gradient: "bg-gradient-to-r from-brand-600 via-pink-600 to-amber-500 text-white hover:opacity-95 shadow-lg shadow-pink-500/20 active:scale-[0.98]",
  };

  const sizeStyles = {
    sm: "h-8 px-3 text-xs rounded-md",
    md: "h-9 px-4 text-sm rounded-lg",
    lg: "h-11 px-6 text-base rounded-lg",
    icon: "h-9 w-9 p-0 rounded-lg flex items-center justify-center",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

