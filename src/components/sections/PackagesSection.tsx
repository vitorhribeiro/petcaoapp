import { useState, useEffect } from 'react';
import { Check, MessageCircle, Dog, ArrowRight, Repeat, Sparkles, Shield, PawPrint, BadgePercent, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePetshop } from '@/contexts/PetshopContext';
import { ResponsiveModal } from '@/components/modals/ResponsiveModal';
import { getPackages, PackageRow } from '@/services/packagesService';
import { getPetshopWhatsAppPhone, openWhatsAppConversation } from '@/lib/whatsapp';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const EASE: [number, number, number, number] = [0.22, 0.03, 0.26, 1];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const SIZE_OPTIONS = [
  { value: 'pequeno', label: 'Pequeno', desc: 'Até 10kg', emoji: '🐕' },
  { value: 'medio', label: 'Médio', desc: '10kg – 25kg', emoji: '🐕‍🦺' },
  { value: 'grande', label: 'Grande', desc: 'Acima de 25kg', emoji: '🦮' },
] as const;

const DEFAULT_FEATURES = [
  'Banho completo',
  'Tosa higiênica',
  'Corte de unhas',
  'Limpeza de ouvidos',
  'Perfume',
];

function getIntervalLabel(days: number): string {
  if (days === 7) return 'Semanal';
  if (days === 15) return 'Quinzenal';
  if (days === 30) return 'Mensal';
  return `A cada ${days} dias`;
}

function getIntervalDesc(days: number): string {
  if (days === 7) return 'Agendamento toda semana';
  if (days === 15) return 'Agendamento a cada 15 dias';
  if (days === 30) return 'Agendamento todo mês';
  return `Agendamento a cada ${days} dias`;
}


export function PackagesSection() {
  const { settings } = usePetshop();
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('pequeno');
  const [selectedFrequency, setSelectedFrequency] = useState<number | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const handleWhatsApp = (pkg: PackageRow) => {
    const petshopWhatsAppPhone = getPetshopWhatsAppPhone();
    const sizeLabel = SIZE_OPTIONS.find(s => s.value === selectedSize)?.label || selectedSize;
    const message = `Olá! Tenho interesse no pacote *${pkg.name}* (${getIntervalLabel(pkg.interval_days)}) para um cachorro de porte *${sizeLabel}*.\nGostaria de mais informações!`;
    openWhatsAppConversation({ phone: petshopWhatsAppPhone, message });
  };

  useEffect(() => {
    getPackages().then(async (data) => {
      let activePackages = data.filter(p => p.active !== false);
      
      // Auto-seed packages if they don't exist
      if (activePackages.length === 0) {
        try {
          const { createPackage } = await import('@/services/packagesService');
          await createPackage({
            name: 'Quinzenal',
            type: 'QUINZENAL',
            description: 'Agendamento a cada 15 dias',
            interval_days: 15,
            active: true
          });
          await createPackage({
            name: 'Semanal',
            type: 'SEMANAL',
            description: 'Agendamento toda semana',
            interval_days: 7,
            active: true
          });
          const newData = await getPackages();
          activePackages = newData.filter(p => p.active !== false);
        } catch (err: any) {
          console.error("Auto-seed failed", err);
          setSeedError(err.message || 'Unknown auto-seed error');
        }
      }
      
      setPackages(activePackages);
      if (activePackages.length > 0) {
        const freqs = Array.from(new Set(activePackages.map(p => p.interval_days))).sort((a, b) => a - b);
        if (freqs.includes(7)) setSelectedFrequency(7);
        else if (freqs.includes(15)) setSelectedFrequency(15);
        else setSelectedFrequency(freqs[0]);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  return (
    <section id="pacotes" className="py-24 md:py-32 scroll-mt-20 relative overflow-hidden bg-background">
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 max-w-5xl">
        {/* ── Header ── */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 border border-[#FBBF24]/30 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase mb-6 text-[#FBBF24] bg-[#FBBF24]/5">
            <Sparkles className="w-3.5 h-3.5" />
            Economize com planos
          </span>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 text-foreground tracking-tight">
            Pacotes <span className="text-[#FBBF24]">Recorrentes</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cuidados contínuos para o seu pet com economia e praticidade.
          </p>

          {/* Size Filter */}
          <div className="mt-12 max-w-2xl mx-auto">
            <h4 className="font-semibold text-foreground mb-6 flex items-center justify-center gap-2 text-[15px]">
              <Dog className="w-5 h-5 text-[#FBBF24]" />
              Qual o porte do seu cachorro?
            </h4>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {SIZE_OPTIONS.map((opt) => {
                const isSelected = selectedSize === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedSize(opt.value)}
                    className={cn(
                      "p-3 sm:p-5 rounded-[20px] sm:rounded-3xl border-2 transition-all duration-300 text-center outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24] focus-visible:ring-offset-2 focus-visible:ring-offset-background relative overflow-hidden group",
                      isSelected
                        ? 'border-[#FBBF24] bg-gradient-to-br from-[#FBBF24]/10 to-[#FBBF24]/5 shadow-[0_8px_24px_-6px_rgba(251,191,36,0.2)] scale-[1.03] z-10'
                        : 'border-border/50 hover:border-[#FBBF24]/40 hover:bg-[#FBBF24]/5 hover:-translate-y-1 hover:shadow-lg'
                    )}
                  >
                    {/* Subtle glow for selected */}
                    {isSelected && <div className="absolute inset-0 bg-gradient-to-t from-[#FBBF24]/20 to-transparent opacity-50" />}
                    
                    <span className="text-2xl sm:text-3xl mb-2 block relative z-10 transition-transform duration-300 group-hover:scale-110">{opt.emoji}</span>
                    <p className={cn("font-bold text-xs sm:text-sm relative z-10 transition-colors", isSelected ? "text-[#F5B000]" : "text-foreground")}>{opt.label}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground/60 mt-1 relative z-10 font-medium">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frequency Filter */}
          {packages.length > 0 && (
            <div className="mt-8 max-w-lg mx-auto">
              <h4 className="font-semibold text-foreground mb-4 flex items-center justify-center gap-2 text-[15px]">
                <Repeat className="w-4 h-4 text-[#FBBF24]" />
                Qual a frequência dos banhos?
              </h4>
              <div className="flex flex-wrap bg-muted/30 p-1.5 rounded-3xl border border-border/50 gap-2">
                {Array.from(new Set(packages.map(p => p.interval_days)))
                  .sort((a, b) => a - b)
                  .map(freq => {
                    const isSelected = selectedFrequency === freq;
                    return (
                      <button
                        key={freq}
                        onClick={() => setSelectedFrequency(freq)}
                        className={cn(
                          "flex-1 py-3.5 px-4 rounded-2xl font-bold text-sm transition-all whitespace-nowrap border-2 relative overflow-hidden group",
                          isSelected
                            ? "border-[#FBBF24] bg-gradient-to-br from-[#FBBF24]/10 to-[#FBBF24]/5 shadow-[0_4px_12px_-2px_rgba(251,191,36,0.2)] text-[#F5B000] scale-[1.02] z-10"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                      >
                        {isSelected && <div className="absolute inset-0 bg-gradient-to-t from-[#FBBF24]/20 to-transparent opacity-50" />}
                        <span className="relative z-10">{getIntervalLabel(freq)}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Cards grid ── */}
        <motion.div
          key={`${selectedSize}-${selectedFrequency}`}
          className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {(() => {
            const filteredPackages = packages.filter(pkg => {
              const allowedSizes = settings.package_sizes?.[pkg.id] || ['pequeno', 'medio', 'grande'];
              const matchesSize = allowedSizes.includes(selectedSize);
              const matchesFreq = selectedFrequency === null || pkg.interval_days === selectedFrequency;
              return matchesSize && matchesFreq;
            });

            if (filteredPackages.length > 0) {
              return filteredPackages.map((pkg) => {
                const isQuinzenal = pkg.name.toLowerCase().includes('quinzenal') || pkg.interval_days === 15;
                const title = pkg.name;
                const subtitleText = getIntervalLabel(pkg.interval_days);
                const descText = getIntervalDesc(pkg.interval_days);
                
                const features = settings.package_features?.[pkg.id] || DEFAULT_FEATURES;
                const isDestaque = settings.package_destaque_ids && settings.package_destaque_ids.length > 0 
                  ? settings.package_destaque_ids.includes(pkg.id) 
                  : pkg.interval_days === 15; // default highlight

                return (
                  <motion.div
                    key={pkg.id}
                    className={cn(
                      "relative group flex flex-col pt-5 w-full max-w-[360px]",
                      isDestaque && "lg:scale-[1.03] lg:-translate-y-2 z-10"
                    )}
                    variants={fadeUp}
                  >
                {/* Destaque Glow Background (behind card) */}
                {isDestaque && (
                  <div className="absolute inset-0 bg-[#FBBF24]/10 dark:bg-[#FBBF24]/5 blur-2xl rounded-[32px] -z-10 transition-opacity duration-500 opacity-0 group-hover:opacity-100" />
                )}
                
                <div className={cn(
                  "relative h-full flex flex-col p-6 sm:p-8 rounded-[32px] border shadow-xl transition-all duration-300",
                  isDestaque 
                    ? "bg-gradient-to-b from-card via-card to-[#FBBF24]/5 dark:from-[#232730] dark:via-[#232730] dark:to-[#FBBF24]/10 border-[#FBBF24]/40 shadow-[0_8px_30px_-4px_rgba(251,191,36,0.2)] hover:border-[#FBBF24]" 
                    : "bg-card dark:bg-[#232730] border-border/50 hover:border-primary/30"
                )}>
                  
                  {/* Badge Mais Escolhido */}
                  {isDestaque && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#F5B000] to-[#FBBF24] shadow-[0_4px_12px_rgba(251,191,36,0.4)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1A1D23] animate-pulse" />
                        <span className="text-[11px] font-black text-[#1A1D23] uppercase tracking-widest whitespace-nowrap">Mais Escolhido</span>
                      </div>
                    </div>
                  )}

                  {/* Top Shine Effect */}
                  {isDestaque && (
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[32px] bg-gradient-to-r from-transparent via-[#FBBF24]/50 to-transparent opacity-50" />
                  )}

                  {/* Header Card */}
                  <div className="flex flex-col gap-4 mb-8 text-center items-center relative z-10">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-transform duration-300 group-hover:scale-110",
                      isDestaque ? "bg-gradient-to-br from-[#F5B000] to-[#FBBF24] shadow-[#FBBF24]/30" : "bg-primary/10 text-primary"
                    )}>
                      <Repeat className={cn("w-7 h-7", isDestaque ? "text-[#1A1D23]" : "text-primary")} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-foreground mb-1.5 leading-tight tracking-tight">{title}</h3>
                      <p className={cn("font-bold text-sm leading-tight mb-1", isDestaque ? "text-[#F5B000]" : "text-primary")}>{subtitleText}</p>
                      <p className="text-muted-foreground text-sm leading-tight">{descText}</p>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8 flex-1">
                    {features.map((feat) => (
                      <li key={feat} className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                          isDestaque ? "border-[#FBBF24] bg-[#FBBF24]/10" : "border-primary/50 bg-primary/10"
                        )}>
                          <Check className={cn("w-3 h-3", isDestaque ? "text-[#FBBF24]" : "text-primary")} />
                        </div>
                        {feat}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="space-y-4 mt-auto">
                    <Button
                      size="lg"
                      className={cn(
                        "w-full h-14 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2",
                        isDestaque 
                          ? "bg-[#FBBF24] hover:bg-[#F5B000] text-[#1A1D23] shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.4)]" 
                          : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                      )}
                      onClick={() => handleWhatsApp(pkg)}
                    >
                      Quero esse plano
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                    <p className="text-center text-xs font-medium text-muted-foreground/60">
                      Cancelamento fácil a qualquer momento.
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          }) 
        } else {
          return (
            <motion.div variants={fadeUp} className="w-full max-w-lg mx-auto text-center py-20">
              {seedError ? (
                <div className="bg-red-500/10 text-red-500 p-4 rounded-xl border border-red-500/20">
                  <p className="font-bold mb-2">Erro ao criar pacotes automaticamente:</p>
                  <code className="text-sm">{seedError}</code>
                  <p className="mt-4 text-xs">Por favor, envie um print desta tela para o desenvolvedor.</p>
                </div>
              ) : (
                <div className="bg-card dark:bg-[#232730] border border-border/50 rounded-3xl p-8 sm:p-12 shadow-lg">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
                    <Dog className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Nenhum pacote disponível</h3>
                  <p className="text-sm text-muted-foreground">
                    No momento não temos pacotes recorrentes disponíveis para cachorros de porte <span className="font-semibold text-foreground capitalize">{selectedSize === 'medio' ? 'médio' : selectedSize}</span>.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-6 rounded-xl gap-2 border-[#FBBF24]/30 hover:bg-[#FBBF24]/10 hover:text-[#FBBF24]"
                    onClick={() => openWhatsAppConversation({ phone: getPetshopWhatsAppPhone(), message: `Olá! Não encontrei um plano recorrente para o porte ${selectedSize}, vocês teriam alguma opção?` })}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Consultar pelo WhatsApp
                  </Button>
                </div>
              )}
            </motion.div>
          );
        }
      })()}
        </motion.div>
      </div>
    </section>
  );
}
