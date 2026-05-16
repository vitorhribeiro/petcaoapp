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

function InterestModal({ pkg, open, onClose }: { pkg: PackageRow | null; open: boolean; onClose: () => void }) {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const petshopWhatsAppPhone = getPetshopWhatsAppPhone();

  const handleWhatsApp = () => {
    if (!pkg || !selectedSize) return;
    const sizeLabel = SIZE_OPTIONS.find(s => s.value === selectedSize)?.label || selectedSize;
    const message = `Olá! Tenho interesse no pacote *${pkg.name}* (${getIntervalLabel(pkg.interval_days)}) para um cachorro de porte *${sizeLabel}*.\nGostaria de mais informações!`;
    openWhatsAppConversation({ phone: petshopWhatsAppPhone, message });
    onClose();
    setSelectedSize('');
  };

  if (!pkg) return null;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={() => { onClose(); setSelectedSize(''); }}
      title={`Pacote ${pkg.name}`}
      description={pkg.description || `${getIntervalLabel(pkg.interval_days)} — agendamentos regulares com desconto`}
      icon={
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
          <Repeat className="w-5 h-5 text-white" />
        </div>
      }
      maxWidth="max-w-md"
      stickyFooter={
        <Button
          size="lg"
          className={cn(
            "w-full h-12 text-base font-semibold rounded-xl gap-2",
            "bg-[#25D366] hover:bg-[#25D366]/90 text-white",
            "shadow-[0_4px_16px_-3px_rgba(37,211,102,0.3)]",
            "hover:shadow-[0_6px_24px_-4px_rgba(37,211,102,0.35)]",
            "transition-all duration-200",
          )}
          disabled={!selectedSize}
          onClick={handleWhatsApp}
        >
          <MessageCircle className="w-5 h-5" />
          Falar no WhatsApp
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-[15px]">
            <Dog className="w-5 h-5 text-primary" />
            Qual o porte do seu cachorro?
          </h4>

          <div className="grid grid-cols-3 gap-3">
            {SIZE_OPTIONS.map((opt) => {
              const isSelected = selectedSize === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSelectedSize(opt.value)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all duration-200 text-center",
                    isSelected
                      ? 'border-primary bg-primary/[0.04] dark:bg-primary/[0.08] shadow-[0_2px_12px_-4px_hsl(var(--primary)/0.15)]'
                      : 'border-border/50 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-sm'
                  )}
                >
                  <span className="text-lg mb-1 block">{opt.emoji}</span>
                  <p className="font-semibold text-foreground text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
}

export function PackagesSection() {
  const { settings } = usePetshop();
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState<PackageRow | null>(null);

  useEffect(() => {
    getPackages().then((data) => {
      setPackages(data.filter(p => p.active !== false));
      setLoading(false);
    });
  }, []);

  if (loading) return null;
  
  if (packages.length === 0) {
    return (
      <section id="pacotes" className="py-24 md:py-32 scroll-mt-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-xl mx-auto"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-secondary/[0.08] dark:bg-secondary/[0.12] border border-secondary/15 rounded-full text-secondary text-[11px] font-bold tracking-[0.2em] uppercase mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              Exclusividade vindo aí
            </span>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-foreground tracking-tight leading-none">
              Pacotes{' '}
              <span className="bg-gradient-to-r from-secondary via-secondary/80 to-secondary/60 bg-clip-text text-transparent">
                Premium
              </span>
            </h2>
            
            <p className="text-base md:text-lg text-muted-foreground/70 mb-12 leading-relaxed">
              Estamos desenhando pacotes personalizados para garantir o melhor cuidado para o seu melhor amigo.
            </p>

            <div className="relative p-12 rounded-[3rem] bg-white/40 dark:bg-card/40 backdrop-blur-md border border-dashed border-secondary/30 group">
              <div className="absolute inset-0 bg-secondary/[0.02] rounded-[3rem] blur-2xl group-hover:bg-secondary/[0.05] transition-colors duration-700" />
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-secondary/10 flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Package className="w-10 h-10 text-secondary/40" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Em breve no Petcão</h3>
                <p className="text-sm text-muted-foreground/60 max-w-[280px] mx-auto">
                  Configurações de planos quinzenais e mensais estarão disponíveis em instantes.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="pacotes" className="py-24 md:py-32 scroll-mt-20 relative overflow-hidden">
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute top-[5%] right-[10%] w-[600px] h-[600px] rounded-full bg-secondary/[0.03] dark:bg-secondary/[0.05] blur-[150px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        {/* ── Header ── */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-secondary/[0.08] dark:bg-secondary/[0.12] border border-secondary/15 rounded-full text-secondary text-[11px] font-black tracking-[0.2em] uppercase mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Vantagens Exclusivas
          </span>

          <h2 className="text-4xl md:text-5xl lg:text-[4rem] font-black text-foreground leading-[1] tracking-tighter max-w-3xl mx-auto mb-6">
            Escolha o{' '}
            <span className="bg-gradient-to-r from-secondary via-secondary/80 to-secondary/60 bg-clip-text text-transparent">
              Pacote Premium
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground/70 max-w-2xl mx-auto leading-relaxed">
            Economize até 20% com nossos pacotes recorrentes e garanta a agenda do seu pet sempre em dia.
          </p>
        </motion.div>

        {/* ── Cards grid ── */}
        <motion.div
          className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {packages.map((pkg) => {
            const intervalLabel = getIntervalLabel(pkg.interval_days);
            const intervalDesc = getIntervalDesc(pkg.interval_days);
            const isPopular = settings.package_destaque_ids?.includes(pkg.id);
            const prices = settings.package_prices?.[pkg.id] || { pequeno: 0, medio: 0, grande: 0 };
            const features = settings.package_features?.[pkg.id] || DEFAULT_FEATURES;

            return (
              <motion.div
                key={pkg.id}
                className="relative group h-full"
                variants={fadeUp}
              >
                <div className={cn(
                  "relative h-full flex flex-col rounded-3xl overflow-hidden transition-all duration-700 ease-out",
                  "bg-white/80 dark:bg-card/40 backdrop-blur-md",
                  "border border-border/40 hover:-translate-y-3",
                  isPopular 
                    ? 'border-secondary/40 shadow-[0_20px_50px_-12px_hsl(var(--secondary)/0.2)]' 
                    : 'shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.12)]'
                )}>
                  {/* Popular badge */}
                  {isPopular && (
                    <div className="absolute top-6 right-6 z-10">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20 transition-transform duration-700 group-hover:scale-105">
                        <Sparkles className="w-3 h-3" />
                        Destaque
                      </span>
                    </div>
                  )}

                  <div className="p-7 lg:p-9 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex items-start gap-5 mb-8">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6",
                        isPopular ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                      )}>
                        <Repeat className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground tracking-tight mb-1">
                          {pkg.name}
                        </h3>
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-sm font-bold uppercase tracking-wider",
                            isPopular ? "text-secondary" : "text-primary"
                          )}>{intervalLabel}</span>
                          <span className="text-xs text-muted-foreground/60">{intervalDesc}</span>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-8 p-5 rounded-2xl bg-muted/30 border border-border/5">
                      <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-1.5">Pacotes a partir de</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className={cn("text-sm font-bold", isPopular ? "text-secondary" : "text-primary")}>R$</span>
                        <span className={cn("text-4xl font-black tracking-tighter", isPopular ? "text-secondary" : "text-foreground")}>
                          {prices.pequeno}
                        </span>
                        <span className="text-sm text-muted-foreground/40 font-medium">/mês</span>
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-4 mb-10 flex-1">
                      {features.map((feat) => (
                        <li key={feat} className="flex items-start gap-3 text-[13px] font-medium text-foreground/80 leading-snug">
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                            isPopular ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
                          )}>
                            <Check className="w-3 h-3" />
                          </div>
                          {feat}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div className="space-y-3">
                      <Button
                        size="lg"
                        className={cn(
                          "w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl gap-2 transition-all duration-700",
                          isPopular
                            ? "bg-secondary text-secondary-foreground shadow-[0_8px_20px_-6px_hsl(var(--secondary)/0.4)] hover:shadow-[0_12px_25px_-4px_hsl(var(--secondary)/0.5)] hover:brightness-110"
                            : "bg-primary text-primary-foreground shadow-[0_8px_20px_-6px_hsl(var(--primary)/0.3)] hover:shadow-[0_12px_25px_-4px_hsl(var(--primary)/0.4)] hover:brightness-110"
                        )}
                        onClick={() => setSelectedPkg(pkg)}
                      >
                        Agendar Pacote
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                      <p className="text-center text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">
                        Cancelamento flexível sem taxas
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <InterestModal
        pkg={selectedPkg}
        open={!!selectedPkg}
        onClose={() => setSelectedPkg(null)}
      />
    </section>
  );
}
