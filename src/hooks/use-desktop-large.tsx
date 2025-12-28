import * as React from "react";

const DESKTOP_LARGE_BREAKPOINT = 1024;

export function useIsDesktopLarge() {
  const [isDesktopLarge, setIsDesktopLarge] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const checkBreakpoint = () => {
      setIsDesktopLarge(window.innerWidth >= DESKTOP_LARGE_BREAKPOINT);
    };
    
    checkBreakpoint();
    window.addEventListener("resize", checkBreakpoint);
    return () => window.removeEventListener("resize", checkBreakpoint);
  }, []);

  return !!isDesktopLarge;
}

