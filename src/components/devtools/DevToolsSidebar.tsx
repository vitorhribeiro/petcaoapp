import { LayoutDashboard, FlaskConical, Shield, Database, ScrollText, Wrench, PanelLeftClose, PanelLeft, Users, ArrowLeft, Circle, Monitor, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DevSection } from '@/pages/admin/DevTools';
import { cn } from '@/lib/utils';
import { InfoTip } from '@/components/dashboard/InfoTip';
import { useSystemStatus, getOverallStatus, getOverallLabel } from '@/hooks/useSystemStatus';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  active: DevSection;
  onNavigate: (s: DevSection) => void;
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
}

const NAV_ITEMS: { key: DevSection; label: string; icon: typeof LayoutDashboard; color: string }[] = [
  { key: 'overview', label: 'Visão Geral', icon: LayoutDashboard, color: 'text-sky-500' },
  { key: 'environment', label: 'Ambiente', icon: FlaskConical, color: 'text-emerald-500' },
  { key: 'permissions', label: 'Cargos e Acessos', icon: Shield, color: 'text-violet-500' },
  { key: 'logs', label: 'Logs', icon: ScrollText, color: 'text-rose-500' },
  { key: 'tools', label: 'Ferramentas', icon: Wrench, color: 'text-orange-500' },
  { key: 'usuarios', label: 'Usuários', icon: Users, color: 'text-cyan-500' },
];

export function DevToolsSidebar({ active, onNavigate, collapsed, onToggle, mobile }: Props) {
  const navigate = useNavigate();
  const { statuses } = useSystemStatus();
  const overall = getOverallStatus(statuses);
  const overallLabel = getOverallLabel(overall);
  const overallDotColor = overall === 'online'
    ? 'bg-emerald-500'
    : overall === 'degraded'
      ? 'bg-amber-500'
      : 'bg-destructive';
  const w = mobile ? 'w-64' : collapsed ? 'w-16' : 'w-64';

  return (
    <div className={cn(
      'h-full border-r border-border/40 bg-card/40 backdrop-blur-xl flex flex-col transition-all duration-300 relative z-20',
      w
    )}>
      {/* Glow effect in background */}
      <div className="absolute top-0 left-0 w-full h-32 bg-primary/5 blur-[80px] -z-10 pointer-events-none" />

      {/* Logo area */}
      <div className={cn(
        "h-16 flex items-center shrink-0 border-b border-border/10",
        collapsed && !mobile ? 'justify-center px-0' : 'gap-3 px-4'
      )}>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 cursor-pointer",
            collapsed && !mobile && 'mx-auto'
          )}
          onClick={collapsed && !mobile ? onToggle : undefined}
        >
          <Wrench className="w-4 h-4 text-white" />
        </motion.div>
        
        {(!collapsed || mobile) && (
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-black text-foreground tracking-tight whitespace-nowrap overflow-hidden">DEV CONSOLE</h1>
            <p className="text-[10px] font-bold text-muted-foreground/50 tracking-wider">PETCÃO V2.5</p>
          </div>
        )}

        {!mobile && !collapsed && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary transition-all group" 
            onClick={onToggle}
          >
            <PanelLeftClose className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
        {(!collapsed || mobile) && (
          <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] px-3 mb-4">Arquitetura</p>
        )}
        
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = active === item.key;
          
          const btn = (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={cn(
                'w-full flex items-center rounded-xl py-2.5 transition-all duration-200 relative group',
                collapsed && !mobile ? 'justify-center px-0' : 'gap-3 px-3',
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground/70 hover:text-foreground font-medium hover:bg-primary/5'
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-nav-bg"
                  className="absolute inset-0 bg-primary/10 rounded-xl -z-10 ring-1 ring-primary/20 shadow-sm shadow-primary/5" 
                />
              )}
              
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300',
                isActive ? 'bg-primary text-white shadow-md shadow-primary/30 rotate-0' : 'bg-muted/50 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110'
              )}>
                <Icon className={cn('w-4 h-4')} />
              </div>

              {(!collapsed || mobile) && (
                <>
                  <span className="truncate text-xs tracking-tight">{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-40" />}
                </>
              )}
            </button>
          );

          if (collapsed && !mobile) {
            return (
              <Tooltip key={item.key} delayDuration={0}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right" className="bg-popover/90 backdrop-blur-md border-border/40 text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xl">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }
          return <div key={item.key}>{btn}</div>;
        })}
      </nav>

      {/* Footer Area */}
      <div className="mt-auto p-4 space-y-3">
        {(!collapsed || mobile) ? (
          <div className="bg-muted/30 rounded-2xl p-3 border border-border/10">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="w-full flex items-center gap-3 rounded-xl px-2 py-2 text-[11px] font-bold text-muted-foreground hover:bg-primary hover:text-white transition-all shadow-sm group"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-background/50 group-hover:bg-white/20 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              </div>
              <span>Voltar ao Admin</span>
            </button>

            <div className="flex items-center justify-between mt-3 px-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${overallDotColor} ${overall === 'online' ? 'animate-pulse' : ''} shadow-[0_0_8px_rgba(16,185,129,0.5)]`} />
                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest truncate">{overallLabel}</p>
              </div>
              <InfoTip text="Estado dos serviços integrados" />
            </div>
          </div>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-[10px] font-bold">Sair do Console</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

