import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onWheel, onKeyDown, ...props }, ref) => {
    // Prevenir el comportamiento del spinner en campos numéricos
    const handleWheel = React.useCallback(
      (e: React.WheelEvent<HTMLInputElement>) => {
        if (type === "number") {
          // Prevenir que el scroll cambie el valor
          e.currentTarget.blur();
        }
        onWheel?.(e);
      },
      [type, onWheel]
    );

    // Prevenir que las flechas arriba/abajo cambien el valor
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (type === "number" && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
          e.preventDefault();
        }
        onKeyDown?.(e);
      },
      [type, onKeyDown]
    );

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
