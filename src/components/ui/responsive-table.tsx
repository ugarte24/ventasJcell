import * as React from "react";
import { cn } from "@/lib/utils";

type ResponsiveTableMinWidth = "sm" | "md" | "lg" | "xl";

const minWidthClass: Record<ResponsiveTableMinWidth, string> = {
  sm: "min-w-[480px]",
  md: "min-w-[640px]",
  lg: "min-w-[800px]",
  xl: "min-w-[960px]",
};

interface ResponsiveTableProps {
  children: React.ReactNode;
  minWidth?: ResponsiveTableMinWidth;
  className?: string;
  innerClassName?: string;
}

/** Contenedor con scroll horizontal para tablas anchas en móvil. */
export function ResponsiveTable({
  children,
  minWidth = "md",
  className,
  innerClassName,
}: ResponsiveTableProps) {
  return (
    <div
      className={cn(
        "rounded-lg border overflow-x-auto overscroll-x-contain",
        className,
      )}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className={cn(minWidthClass[minWidth], innerClassName)}>{children}</div>
    </div>
  );
}
