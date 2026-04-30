import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-500",
  secondary:
    "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 focus-visible:ring-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900",
  ghost:
    "text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400 dark:text-slate-200 dark:hover:bg-slate-900",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-400"
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, asChild, variant = "primary", size = "md", type = "button", ...props },
    ref
  ) {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-slate-950",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        type={type}
        {...props}
      />
    );
  }
);
