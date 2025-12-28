import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts';
import { Separator } from '@/components/ui/separator';
import { NetworkStatusBanner } from '@/components/NetworkStatusBanner';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { isAuthenticated, user } = useAuth();
  const { isOnline } = useNetworkStatus();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <NetworkStatusBanner />
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col min-w-0">
          <header className="flex h-14 sm:h-16 shrink-0 items-center gap-2 sm:gap-4 border-b bg-card px-3 sm:px-4 lg:px-6 overflow-hidden relative z-[60]" style={{ isolation: 'isolate' }}>
            <div className="relative z-[70]" style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
              <SidebarTrigger className="-ml-1 sm:-ml-2 flex-shrink-0" />
            </div>
            <Separator orientation="vertical" className="h-6 hidden sm:block flex-shrink-0" />
            {title && (
              <h1 className="font-display text-base sm:text-lg font-semibold text-foreground truncate flex-1 min-w-0">{title}</h1>
            )}
            <div className="ml-auto flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline whitespace-nowrap">
                {new Date().toLocaleDateString('es-BO', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
              <span className="text-xs text-muted-foreground sm:hidden whitespace-nowrap">
                {new Date().toLocaleDateString('es-BO', { 
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 relative z-0 min-h-0 w-full">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
