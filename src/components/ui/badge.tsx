import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full text-xs font-medium",
  {
    variants: {
      variant: {
        ink: "bg-ink/85 px-3 py-1 text-ink-foreground backdrop-blur-sm",
        muted: "bg-muted px-3 py-1 text-muted-foreground",
        primary: "bg-primary px-3 py-1 text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "ink",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
