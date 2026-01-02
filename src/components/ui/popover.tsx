import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, style, align = "center", sideOffset = 4, onWheel, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => contentRef.current as any);

  const handleWheel = React.useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    // Buscar el elemento scrollable dentro del PopoverContent
    const target = e.target as HTMLElement;
    const scrollableElement = target.closest('[cmdk-list]') as HTMLElement;
    
    if (scrollableElement) {
      const { scrollTop, scrollHeight, clientHeight } = scrollableElement;
      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
      
      // Si el elemento scrollable puede hacer scroll, permitirlo y detener propagación
      if ((e.deltaY < 0 && !isAtTop) || (e.deltaY > 0 && !isAtBottom)) {
        e.stopPropagation();
      }
    }
    onWheel?.(e);
  }, [onWheel]);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={contentRef}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-[10001] w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        style={{ 
          pointerEvents: 'auto',
          ...style
        }}
        onWheel={handleWheel}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
