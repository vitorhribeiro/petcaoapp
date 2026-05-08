import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Crown, EyeOff, User, ShieldCheck, AlertCircle } from 'lucide-react';
import { useTestModes } from '@/contexts/TestModesContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { InfoTip } from '@/components/dashboard/InfoTip';
import { cn } from '@/lib/utils';

export function DevToolsEnvironment() {
  const {
    proModeActive, toggleProMode,
    basicModeActive, toggleBasicMode,
    clientModeActive, toggleClientMode,
  } = useTestModes();
  const navigate = useNavigate();

  const modes = [
    {
      id: 'pro',
      label: 'Modo PRO',
      icon: Crown,
      description: 'Desbloqueia todas as funções PRO e funcionalidades avançadas para demonstração.',
      details: 'Este modo simula um pet shop com assinatura premium ativa. Remove banners de upgrade e habilita ferramentas de analytics e automação avançadas.',
      iconColor: 'text-amber-500',
      bgColor: 'from-amber-500/10 to-transparent',
      borderColor: 'border-amber-500/20',
      ringColor: 'ring-amber-500/30',
      activeColor: 'bg-amber-500',
      switchClass: 'data-[state=checked]:bg-amber-500',
      active: proModeActive,
      onToggle: toggleProMode,
    },
    {
      id: 'basico',
      label: 'Modo Básico',
      icon: EyeOff,
      description: 'Simula a experiência de um plano gratuito ou limitado.',
      details: 'Útil para testar fluxos de upgrade (paywalls). Algumas seções ficam com efeito de blur ou exibem mensagens de "Função Pro".',
      iconColor: 'text-zinc-400',
      bgColor: 'from-zinc-500/10 to-transparent',
      borderColor: 'border-zinc-500/20',
      ringColor: 'ring-zinc-500/30',
      activeColor: 'bg-zinc-500',
      switchClass: 'data-[state=checked]:bg-zinc-500',
      active: basicModeActive,
      onToggle: toggleBasicMode,
    },
    {
      id: 'cliente',
      label: 'Modo Cliente',
      icon: User,
      description: 'Simula a visão do Tutor (cliente final) no aplicativo.',
      details: 'Ao ativar, você é redirecionado para a área do tutor para testar agendamentos e visualização de serviços como se fosse um cliente.',
      iconColor: 'text-sky-500',
      bgColor: 'from-sky-500/10 to-transparent',
      borderColor: 'border-sky-500/20',
      ringColor: 'ring-sky-500/30',
      activeColor: 'bg-sky-500',
      switchClass: 'data-[state=checked]:bg-sky-500',
      active: clientModeActive,
      onToggle: () => {
        toggleClientMode();
        if (!clientModeActive) {
          setTimeout(() => navigate('/perfil'), 400);
        }
      },
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Ambiente de Simulação
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Alterne entre diferentes estados do sistema para validar permissões, layouts e fluxos de usuário sem alterar dados reais no banco.
        </p>
      </div>

      {/* Info Alert */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-start gap-3 shadow-sm"
      >
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-primary">Isolamento de Sessão</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            As simulações abaixo são aplicadas apenas na sua sessão atual do navegador. Outros usuários não serão afetados.
          </p>
        </div>
      </motion.div>

      {/* Modes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modes.map((mode, i) => (
          <motion.div
            key={mode.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="h-full"
          >
            <Card className={cn(
              "relative h-full border-border/60 transition-all duration-300 overflow-hidden group bg-card/50 backdrop-blur-sm",
              mode.active ? cn("ring-2 ring-offset-2 ring-offset-background", mode.ringColor) : "hover:border-primary/30"
            )}>
              {/* Active Background Glow */}
              <AnimatePresence>
                {mode.active && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn("absolute inset-0 bg-gradient-to-br opacity-20", mode.bgColor)}
                  />
                )}
              </AnimatePresence>

              <CardHeader className="pb-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                    mode.active ? "bg-white dark:bg-zinc-900 shadow-md ring-1 ring-white/20" : "bg-muted/50"
                  )}>
                    <mode.icon className={cn("w-6 h-6 transition-colors", mode.active ? mode.iconColor : "text-muted-foreground/60")} />
                  </div>
                  <div className="flex items-center gap-3">
                    <InfoTip title={mode.label} text={mode.details} />
                    <Switch 
                      checked={mode.active} 
                      onCheckedChange={mode.onToggle}
                      className={cn(mode.switchClass)}
                    />
                  </div>
                </div>
                <div className="mt-5 space-y-1.5">
                  <CardTitle className="text-lg flex items-center gap-2 font-bold">
                    {mode.label}
                    {mode.active && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={cn("w-2 h-2 rounded-full animate-pulse", mode.activeColor)}
                      />
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {mode.description}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="pt-0 relative z-10">
                <div className="pt-4 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      Estado Atual
                    </span>
                    <Badge 
                      variant={mode.active ? "default" : "secondary"}
                      className={cn(
                        "text-[10px] font-mono px-2 py-0.5",
                        mode.active ? mode.activeColor + " text-white border-transparent" : "bg-muted/50 text-muted-foreground/70"
                      )}
                    >
                      {mode.active ? "ATIVADO" : "INATIVO"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-center gap-2 py-4 border-t border-border/40">
        <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/60" />
        <span className="text-[11px] text-muted-foreground/60 italic">
          Os modos PRO e Básico são mutuamente exclusivos em alguns fluxos de UI.
        </span>
      </div>
    </div>
  );
}
