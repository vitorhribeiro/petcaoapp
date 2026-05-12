import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Crown, EyeOff, User, ShieldCheck, AlertCircle, Sparkles, Check, Zap, Lock, Settings2 } from 'lucide-react';
import { useTestModes } from '@/contexts/TestModesContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { InfoTip } from '@/components/dashboard/InfoTip';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function DevToolsEnvironment() {
  const {
    appPlan, setAppPlan,
    proModeActive, toggleProMode,
    basicModeActive, toggleBasicMode,
    clientModeActive, toggleClientMode,
    anyModeActive
  } = useTestModes();
  const navigate = useNavigate();

  const plans = [
    {
      id: 'pro',
      label: 'Plano PRO',
      icon: Crown,
      tagline: 'Experiência Completa',
      description: 'Todas as funcionalidades premium desbloqueadas, sem restrições ou paywalls.',
      features: ['Analytics Avançado', 'Automação de Marketing', 'Gestão Financeira VIP', 'Suporte Prioritário'],
      color: 'amber',
      iconColor: 'text-amber-500',
      bgColor: 'from-amber-500/10 to-transparent',
      borderColor: 'border-amber-500/30',
      activeColor: 'bg-amber-500',
    },
    {
      id: 'basic',
      label: 'Plano Básico',
      icon: Zap,
      tagline: 'Versão de Entrada',
      description: 'Simula a experiência de um usuário gratuito com limitações estratégicas.',
      features: ['Gestão de Agendamentos', 'Perfil do Pet Shop', 'Galeria de Fotos', 'Banners de Upgrade'],
      color: 'blue',
      iconColor: 'text-blue-500',
      bgColor: 'from-blue-500/10 to-transparent',
      borderColor: 'border-blue-500/30',
      activeColor: 'bg-blue-500',
    }
  ];

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-10">
      {/* Header section */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Settings2 className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/60">Configurações de Desenvolvedor</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Gerenciamento de Ambiente
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Defina o comportamento global do aplicativo e valide fluxos de usuário em tempo real.
        </p>
      </div>

      {/* SECTION 1: APP PLAN */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Nível do Plano do App
            </h3>
            <p className="text-sm text-muted-foreground">Escolha qual plano o aplicativo deve simular para esta sessão.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              whileHover={{ y: -4 }}
              className="relative"
              onClick={() => setAppPlan(plan.id as 'basic' | 'pro')}
            >
              <Card className={cn(
                "h-full cursor-pointer border-border/40 bg-card/40 backdrop-blur-md transition-all duration-500 overflow-hidden",
                appPlan === plan.id ? cn("ring-2 ring-primary ring-offset-4 ring-offset-background border-transparent shadow-2xl") : "hover:border-primary/40 hover:bg-card/60"
              )}>
                {/* Active Indicator Glow */}
                <AnimatePresence>
                  {appPlan === plan.id && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.08]", plan.bgColor)}
                    />
                  )}
                </AnimatePresence>

                <CardHeader className="pb-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                      appPlan === plan.id ? "bg-white dark:bg-zinc-900 shadow-xl" : "bg-muted/40"
                    )}>
                      <plan.icon className={cn("w-7 h-7", appPlan === plan.id ? plan.iconColor : "text-muted-foreground/40")} />
                    </div>
                    {appPlan === plan.id ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                        <Check className="w-3 h-3" />
                        Ativo
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Selecionar
                      </Button>
                    )}
                  </div>
                  
                  <div className="mt-6 space-y-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">{plan.tagline}</span>
                      <CardTitle className="text-2xl font-bold tracking-tight">{plan.label}</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {plan.description}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 relative z-10">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-4 border-t border-border/10">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full", appPlan === plan.id ? "bg-primary" : "bg-muted-foreground/30")} />
                        <span className="text-[11px] font-medium text-foreground/70">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SECTION 2: SIMULATION MODES */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-lg font-bold flex items-center gap-2 text-foreground/80">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Estados de Simulação
            </h3>
            <p className="text-sm text-muted-foreground">Comportamentos temporários que afetam a visualização e fluxos.</p>
          </div>

          {anyModeActive && (
            <Badge variant="outline" className="bg-card/50 backdrop-blur-sm border-emerald-500/20 px-3 py-1 gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Simulação Ativa</span>
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Simular PRO Card */}
          <Card className={cn(
            "relative h-full border-border/40 bg-card/40 backdrop-blur-md transition-all duration-300 overflow-hidden group",
            proModeActive ? "ring-2 ring-amber-500/40 ring-offset-2 ring-offset-background" : "hover:border-primary/30"
          )}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                  proModeActive ? "bg-amber-500 text-white shadow-lg" : "bg-muted/50"
                )}>
                  <Crown className="w-6 h-6" />
                </div>
                <Switch 
                  checked={proModeActive} 
                  onCheckedChange={toggleProMode}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
              <div className="mt-5 space-y-1.5">
                <CardTitle className="text-lg font-bold">Simular Modo PRO</CardTitle>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Força a visualização de funções premium, independente do seu plano atual.
                </p>
              </div>
            </CardHeader>
          </Card>

          {/* Simular Básico Card */}
          <Card className={cn(
            "relative h-full border-border/40 bg-card/40 backdrop-blur-md transition-all duration-300 overflow-hidden group",
            basicModeActive ? "ring-2 ring-slate-500/40 ring-offset-2 ring-offset-background" : "hover:border-primary/30"
          )}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                  basicModeActive ? "bg-slate-500 text-white shadow-lg" : "bg-muted/50"
                )}>
                  <EyeOff className="w-6 h-6" />
                </div>
                <Switch 
                  checked={basicModeActive} 
                  onCheckedChange={toggleBasicMode}
                  className="data-[state=checked]:bg-slate-500"
                />
              </div>
              <div className="mt-5 space-y-1.5">
                <CardTitle className="text-lg font-bold">Simular Modo Básico</CardTitle>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Força a visualização de limitações e paywalls para testes de upgrade.
                </p>
              </div>
            </CardHeader>
          </Card>

          {/* Client Mode Card */}
          <Card className={cn(
            "relative h-full border-border/40 bg-card/40 backdrop-blur-md transition-all duration-300 overflow-hidden group",
            clientModeActive ? "ring-2 ring-sky-500/40 ring-offset-2 ring-offset-background" : "hover:border-primary/30"
          )}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                  clientModeActive ? "bg-sky-500 text-white shadow-lg" : "bg-muted/50"
                )}>
                  <User className="w-6 h-6" />
                </div>
                <Switch 
                  checked={clientModeActive} 
                  onCheckedChange={() => {
                    toggleClientMode();
                    if (!clientModeActive) setTimeout(() => navigate('/perfil'), 400);
                  }}
                  className="data-[state=checked]:bg-sky-500"
                />
              </div>
              <div className="mt-5 space-y-1.5">
                <CardTitle className="text-lg font-bold">Modo Cliente</CardTitle>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Simula a visão do Tutor no aplicativo. Redireciona para o perfil do cliente.
                </p>
              </div>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Info Alert - Redesigned to be more specific */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 flex items-start gap-3.5 transition-all hover:bg-primary/[0.08]">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Settings2 className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-primary tracking-tight">Persistência do Plano</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              A escolha do **Nível do Plano** é salva permanentemente neste navegador. O site permanecerá no plano escolhido até que você o altere manualmente.
            </p>
          </div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 flex items-start gap-3.5 transition-all hover:bg-emerald-500/[0.08]">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">Isolamento de Simulação</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Os **Estados de Simulação** são temporários e isolados. Eles não afetam o banco de dados nem outros usuários do sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

