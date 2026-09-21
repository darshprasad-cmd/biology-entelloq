"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bio-400/50 disabled:pointer-events-none disabled:opacity-40 select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-bio-500 text-ink-950 hover:bg-bio-400 shadow-[0_8px_30px_-8px_rgba(16,185,129,0.6)] font-semibold",
        ghost:
          "text-foreground/80 hover:text-foreground hover:bg-white/5 border border-transparent hover:border-white/10",
        glass:
          "glass text-foreground/90 hover:bg-white/[0.07] hover:border-white/20",
        outline:
          "border border-white/15 text-foreground/90 hover:bg-white/5 hover:border-bio-400/40",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-5",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
