import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useTestModes } from '@/contexts/TestModesContext';
import { useProAccess } from '@/hooks/useProAccess';
import {
  LayoutDashboard, CalendarDays, Package, Shield, Scissors,
  Settings, ArrowLeft, UserCheck, Wrench, PawPrint,
  ChevronsLeft, ChevronsRight, History, Monitor, ChevronDown,
  DollarSign, ShoppingBag, BarChart3, Bell, Megaphone, Crown, Images,
} from 'lucide-react';
import logoPetDefault from '@/assets/logopet.webp';
import { useBranding } from '@/contexts/BrandingContext';
import { usePageAccess } from '@/hooks/usePageAccess';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PageKey } from '@/hooks/usePageAccess';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
}

interface SidebarItem {
  path: string;
  label: string;
  icon: React.ElementType;
  pageKey?: PageKey;
  roles?: string[];
  badge?: number;
  devOnly?: boolean;
  isDevTool?: boolean;
  isPro?: boolean;
  children?: SidebarItem[];
}

const MotionAside = motion.aside;

export function AdminSidebar({ collapsed, onToggle, mobile = false }: AdminSidebarProps) {
  const { user, isDev } = useAuth();
  const { appointments } = useAdmin();
  const { clientModeActive } = useTestModes();
  const { branding } = useBranding();
  const { canAccess } = usePageAccess();
  const { isProActive } = useProAccess();
  const location = useLocation();
  const navigateTo = useNavigate();
  const logoSrc = branding.mascotUrl || logoPetDefault;
  const role = user?.role || 'cliente';
  const pendingCount = appointments.filter(a => a.status === 'pendente').length;

  const isCollapsed = mobile ? false : collapsed;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const isOnDevPage = location.pathname.startsWith('/admin/devtools') || location.pathname.startsWith('/dev-tools');
    const isOnProPage = ['/admin/financeiro', '/admin/estoque', '/admin/relatorios', '/admin/lembretes', '/admin/marketing'].includes(location.pathname);
    return { 
      dev: isOnDevPage,
      pro: isOnProPage
    };
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [proModal, setProModal] = useState(false);

  const items: SidebarItem[] = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, pageKey: 'dashboard' },
    { path: '/admin/agendamentos', label: 'Agendamentos', icon: CalendarDays, pageKey: 'agendamentos', badge: pendingCount },
    { path: '/admin/pacotes', label: 'Pacotes', icon: Package, pageKey: 'pacotes' },
    { path: '/admin/clientes', label: 'Clientes', icon: UserCheck, pageKey: 'clientes' },
    { path: '/admin/pets', label: 'Pets', icon: PawPrint, pageKey: 'clientes' },
    { path: '/admin/servicos', label: 'Serviços e Valores', icon: Scissors, pageKey: 'servicos' },
    { path: '/admin/moderacao', label: 'Galeria e Avaliações', icon: Images, pageKey: 'moderacao' },
    { path: '/admin/configuracoes', label: 'Configurações', icon: Settings, pageKey: 'configuracoes' },
    { path: '/admin/audit-log', label: 'Registro de Alterações', icon: History, pageKey: 'configuracoes' },
  ];

  const proItems: SidebarItem[] = [
    { path: '/admin/financeiro', label: 'Financeiro', icon: DollarSign, isPro: true },
    { path: '/admin/estoque', label: 'Estoque', icon: ShoppingBag, isPro: true },
    { path: '/admin/relatorios', label: 'Relatórios', icon: BarChart3, isPro: true },
    { path: '/admin/lembretes', label: 'Lembretes Inteligentes', icon: Bell, isPro: true },
    { path: '/admin/marketing', label: 'Marketing', icon: Megaphone, isPro: true },
  ];

  const devItem: SidebarItem = {
    path: '/admin/devtools',
    label: 'Desenvolvedor',
    icon: Wrench,
    devOnly: true,
    isDevTool: true,
  };

  const isActive = (path: string) => location.pathname === path;
  const isGroupActive = (item: SidebarItem) => {
    if (isActive(item.path)) return true;
    return item.children?.some(c => isActive(c.path)) ?? false;
  };

  const renderChildItem = (item: SidebarItem) => {
    const active = isActive(item.path);
    const Icon = item.icon;

    const linkContent = (
      <NavLink
        to={item.path}
        className={cn(
          'group relative flex items-center gap-2.5 rounded-xl text-[13px] font-medium transition-all duration-200',
          isCollapsed ? 'justify-center px-3 py-2.5' : 'pl-11 pr-3 py-2',
          active
            ? 'text-primary font-bold'
            : 'text-muted-foreground/60 hover:text-foreground hover:bg-primary/5'
        )}
      >
        {active && (
          <motion.div 
            layoutId="active-child-bg"
            className="absolute inset-0 bg-primary/10 rounded-xl -z-10 ring-1 ring-primary/20" 
          />
        )}
        <Icon className="w-3.5 h-3.5 shrink-0" />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </NavLink>
    );

    if (isCollapsed && !mobile) {
      return (
        <Tooltip key={item.path} delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-bold bg-popover/90 backdrop-blur-md border-border/40 px-3 py-1.5 rounded-lg shadow-xl">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.path}>{linkContent}</div>;
  };

  const handleProClick = (item: SidebarItem) => {
    if (isProActive) {
      navigateTo(item.path);
    } else {
      window.dispatchEvent(new CustomEvent('pro-modal-change', { detail: true }));
      setProModal(true);
    }
  };

  const renderProItem = (item: SidebarItem) => {
    if (clientModeActive) return null;
    const Icon = item.icon;
    const locked = !isProActive;
    const active = isActive(item.path);

    const content = (
      <button
        onClick={() => handleProClick(item)}
        className={cn(
          'w-full group relative flex items-center rounded-xl transition-all duration-300',
          isCollapsed ? 'justify-center px-0 h-10' : 'gap-3 px-3 py-2',
          active
            ? 'text-amber-500 font-bold'
            : locked
              ? 'text-muted-foreground/40 hover:bg-amber-500/5'
              : 'text-muted-foreground/70 hover:text-foreground hover:bg-amber-500/5'
        )}
      >
        {active && (
          <motion.div 
            layoutId="active-pro-bg"
            className="absolute inset-0 bg-amber-500/10 rounded-xl -z-10 ring-1 ring-amber-500/20 shadow-sm shadow-amber-500/5" 
          />
        )}
        
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300',
          active ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-muted/50 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110'
        )}>
          <Icon className="w-4 h-4" />
        </div>

        {!isCollapsed && (
          <>
            <span className="truncate text-xs font-bold tracking-tight">{item.label}</span>
            {locked ? (
              <Crown className="w-3 h-3 ml-auto text-amber-500 opacity-60" />
            ) : (
              <span className="ml-auto text-[8px] font-black bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-tighter">PRO</span>
            )}
          </>
        )}
      </button>
    );

    if (isCollapsed && !mobile) {
      return (
        <Tooltip key={item.path} delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-bold bg-popover/90 backdrop-blur-md border-border/40 px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2">
            {item.label} <Crown className="w-3 h-3 text-amber-500" />
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.path} className="px-1">{content}</div>;
  };

  const renderItem = (item: SidebarItem) => {
    if (item.devOnly && !isDev()) return null;
    if (clientModeActive && !item.devOnly) return null;
    if (item.pageKey && !canAccess(role, item.pageKey)) return null;

    const active = isActive(item.path);
    const Icon = item.icon;

    const linkContent = (
      <NavLink
        to={item.path}
        className={cn(
          'group relative flex items-center rounded-xl transition-all duration-300',
          isCollapsed ? 'justify-center px-0 h-11' : 'gap-3 px-3 py-2.5',
          active
            ? item.isDevTool ? 'text-amber-500' : 'text-primary font-bold'
            : 'text-muted-foreground/70 hover:text-foreground hover:bg-primary/5'
        )}
      >
        {active && (
          <motion.div 
            layoutId="active-nav-bg"
            className={cn(
              "absolute inset-0 rounded-xl -z-10 shadow-sm transition-all duration-300",
              item.isDevTool 
                ? "bg-amber-500/10 ring-1 ring-amber-500/20 shadow-amber-500/5" 
                : "bg-primary/10 ring-1 ring-primary/20 shadow-primary/5"
            )} 
          />
        )}
        
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 relative',
          active 
            ? item.isDevTool ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-primary text-white shadow-lg shadow-primary/30 rotate-0' 
            : 'bg-muted/50 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 group-hover:rotate-3'
        )}>
          <Icon className="w-4.5 h-4.5" />
          
          {/* Badge indicator on collapsed */}
          {isCollapsed && item.badge && item.badge > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-[9px] font-black text-white rounded-full flex items-center justify-center ring-2 ring-background ring-offset-background">
              {item.badge}
            </div>
          )}
        </div>

        {!isCollapsed && (
          <>
            <span className="truncate text-xs font-bold tracking-tight">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="ml-auto bg-destructive/10 text-destructive text-[10px] font-black rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 border border-destructive/20">
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );

    if (isCollapsed && !mobile) {
      return (
        <Tooltip key={item.path} delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-bold bg-popover/90 backdrop-blur-md border-border/40 px-3 py-1.5 rounded-lg shadow-xl">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.path}>{linkContent}</div>;
  };

  const sidebarWidth = mobile ? '100%' : isCollapsed ? 72 : 256;

  return (
    <>
      <MotionAside
        className={cn(
          'flex flex-col border-r border-border/40 bg-card/40 backdrop-blur-xl relative z-20 overflow-hidden',
          mobile ? 'h-full w-full' : 'h-full',
          !mobile && 'hidden lg:flex'
        )}
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Glow effect in background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-primary/5 blur-[80px] -z-10 pointer-events-none" />

        {/* Header */}
        <div className={cn(
          'h-16 flex items-center shrink-0 border-b border-border/10',
          isCollapsed && !mobile ? 'justify-center px-0' : 'gap-3 px-4'
        )}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "w-9 h-9 rounded-xl bg-background flex items-center justify-center shrink-0 shadow-sm border border-border/10 overflow-hidden",
              isCollapsed && !mobile && 'mx-auto'
            )}
          >
            <img src={logoSrc} alt="logo" className="w-full h-full object-cover" />
          </motion.div>
          
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black text-foreground tracking-tight truncate uppercase">PAINEL ADMIN</h2>
              <p className="text-[10px] font-bold text-muted-foreground/50 truncate uppercase tracking-widest">{branding.shopName}</p>
            </div>
          )}

          {!mobile && (
            <button
              onClick={onToggle}
              className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all group",
                isCollapsed && "mx-auto"
              )}
            >
              {isCollapsed ? (
                <ChevronsRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              ) : (
                <ChevronsLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              )}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          {(!isCollapsed || mobile) && (
            <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] px-3 mb-4">Gestão Base</p>
          )}
          
          <div className="space-y-1">
            {items.map(renderItem)}
          </div>

          {/* PRO section */}
          {!clientModeActive && (
            <div className="pt-6 space-y-1.5">
              {(!isCollapsed || mobile) && (
                <p className="text-[10px] font-bold text-amber-500/40 uppercase tracking-[0.2em] px-3 mb-4 flex items-center gap-2">
                  <Crown className="w-3 h-3" /> Módulos PRO
                </p>
              )}
              
              <div className="space-y-1">
                {proItems.map(renderProItem)}
              </div>
            </div>
          )}
        </nav>

        {/* Footer Area */}
        <div className="mt-auto p-4 space-y-3">
          {(!isCollapsed || mobile) ? (
            <div className="bg-muted/30 rounded-2xl p-3 border border-border/10">
              {isDev() && (
                <div className="mb-3">
                  {renderItem(devItem)}
                </div>
              )}
              
              <button
                onClick={() => navigateTo('/')}
                className="w-full flex items-center gap-3 rounded-xl px-2 py-2 text-[11px] font-bold text-muted-foreground hover:bg-primary hover:text-white transition-all shadow-sm group"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-background/50 group-hover:bg-white/20 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                </div>
                <span>Voltar ao Site</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {isDev() && renderItem(devItem)}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigateTo('/')}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-[10px] font-bold">Voltar ao site</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </MotionAside>

      {/* PRO Upsell Modal — z-[300] to sit above Sheet (z-50) and TestModeIndicator (z-[200]) */}
      <AnimatePresence>
        {proModal && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setProModal(false); window.dispatchEvent(new CustomEvent('pro-modal-change', { detail: false })); }}
          >
            <motion.div
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                  <Crown className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Desbloqueie recursos avançados</h3>
                <p className="text-sm text-muted-foreground">
                  Este módulo está disponível apenas para usuários com Plano PRO. Faça upgrade para acessar Financeiro, Estoque, Relatórios, Lembretes e Marketing.
                </p>
                <div className="flex gap-3 justify-center pt-2">
                  <button onClick={() => { setProModal(false); window.dispatchEvent(new CustomEvent('pro-modal-change', { detail: false })); }} className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors">
                    Fechar
                  </button>
                  <button onClick={() => { setProModal(false); window.dispatchEvent(new CustomEvent('pro-modal-change', { detail: false })); }} className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                    Solicitar acesso ao DEV
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
