import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Globe, Clock } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggle } = useSidebarCollapse();
  
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = new Intl.DateTimeFormat('pt-BR', { 
    day: '2-digit', month: 'short' 
  }).format(currentTime);
  
  const formattedTime = currentTime.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', minute: '2-digit' 
  });

  return (
    <div className="h-screen overflow-hidden flex">
      {/* Desktop sidebar */}
      <div className="animate-fade-in">
        <AdminSidebar collapsed={collapsed} onToggle={toggle} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top bar */}
        <header
          className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 animate-fade-in"
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 overflow-y-auto">
                <div onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('a[href]')) setMobileOpen(false);
                }}>
                  <AdminSidebar collapsed={false} onToggle={toggle} mobile />
                </div>
              </SheetContent>
            </Sheet>

            {/* Status Bar */}
            <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/40 rounded-full border border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-[11px] font-bold uppercase tracking-tight">{formattedDate}</span>
                  <span className="w-px h-2.5 bg-border/60" />
                  <span className="text-[11px] tabular-nums font-medium opacity-80">{formattedTime}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NavLink 
              to="/" 
              className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors bg-muted/30 hover:bg-muted/50 rounded-full border border-border/40"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voltar ao Site</span>
            </NavLink>

            <div className="w-px h-6 bg-border/60 mx-1" />

            <ThemeToggle />
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={logout} 
              className="h-9 px-3 gap-2 rounded-xl text-destructive hover:text-destructive-foreground hover:bg-destructive transition-all font-bold text-xs"
            >
              <LogOut className="w-4 h-4" /> 
              <span className="hidden sm:inline text-[11px] uppercase tracking-wider">Sair</span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
