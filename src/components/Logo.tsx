import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ className, size = "md", showText = false }: LogoProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-16 w-16 text-2xl",
  };

  return (
    <div className={cn("flex items-center justify-center rounded-lg bg-black text-white font-display font-bold shadow-lg", sizeClasses[size], className)}>
      <span className="text-white" style={{ textShadow: "0 0 2px #2563EB, 0 0 4px #2563EB" }}>
        J
      </span>
    </div>
  );
}

