import { useState } from 'react';
import { Scissors, ArrowRight, Clock, Calendar, Sparkles, Package, PawPrint, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useActiveServices } from '@/hooks/useActiveServices';
import { usePetshop } from '@/contexts/PetshopContext';
import { ServicesSkeleton } from '@/components/skeletons/SectionSkeletons';
import { Button } from '@/components/ui/button';
import { ResponsiveModal } from '@/components/modals/ResponsiveModal';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getCategoryByValue, getIconComponent, ServiceCategory } from '@/lib/serviceCategories';
import { ServiceRow } from '@/services/servicesService';

function getPriceRange(service: ServiceRow): { min: number; max: number } | null {
  const prices = [service.price_pequeno, service.price_medio, service.price_grande]
    .filter((p): p is number => p != null && p > 0);
  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

function fmtPrice(val: number) {
  return `R$ ${val.toFixed(0)}`;
}

interface SizeModalProps {
  service: ServiceRow | null;
  open: boolean;
  onClose: () => void;
  customCategories: ServiceCategory[];
}

const SIZE_OPTIONS = [
  { value: 'pequeno', label: 'Pequeno', desc: 'Até 10kg', emoji: '🐕' },
  { value: 'medio', label: 'Médio', desc: '10kg – 25kg', emoji: '🐕‍🦺' },
  { value: 'grande', label: 'Grande', desc: 'Acima de 25kg', emoji: '🦮' },
] as const;

function SizeModal({ service, open, onClose, customCategories }: SizeModalProps) {
  const [selectedSize, setSelectedSize] = useState<string>('');

  const getPrice = (size: string): number | null => {
    if (!service) return null;
    if (size === 'pequeno') return service.price_pequeno;
    if (size === 'medio') return service.price_medio;
    if (size === 'grande') return service.price_grande;
    return null;
  };

  const currentPrice = getPrice(selectedSize);
  const catInfo = service ? getCategoryByValue(service.category, customCategories) : null;
  const ServiceIcon = service ? getIconComponent(service.icon || (catInfo ? catInfo.icon : 'scissors')) : Package;

  const scrollToAgenda = () => {
    onClose();
    setTimeout(() => {
      const el = document.querySelector('#calendario');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      onClose();
      setSelectedSize('');
    }
  };

  if (!service) return null;

  const TRUST_ITEMS = [
    { icon: PawPrint, text: 'Atendimento especializado' },
    { icon: Sparkles, text: 'Produtos pet premium' },
    { icon: Shield, text: 'Ambiente seguro e higienizado' },
  ];

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleOpenChange}
      title={service.name}
      description={service.description || 'Selecione o porte do seu pet para ver o valor'}
      icon={
        catInfo ? (
          <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-md", catInfo.gradient)}>
            <ServiceIcon className="w-5 h-5 text-white" />
          </div>
        ) : undefined
      }
      maxWidth="max-w-md"
      stickyFooter={
        <Button
          className={cn(
            "w-full h-12 text-base font-semibold rounded-xl gap-2",
            "bg-gradient-to-r from-primary to-primary/85 text-primary-foreground",
            "shadow-[0_4px_16px_-3px_hsl(var(--primary)/0.3)]",
            "hover:shadow-[0_6px_24px_-4px_hsl(var(--primary)/0.35)] hover:brightness-110",
            "transition-all duration-200",
          )}
          onClick={scrollToAgenda}
        >
          Agendar agora
          <ArrowRight className="w-4 h-4" />
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Duration */}
        {service.duration_minutes && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/30">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/60 font-medium">Duração estimada</span>
              <span className="block text-sm font-semibold text-foreground">{service.duration_minutes} minutos</span>
            </div>
          </div>
        )}

        {/* Size selection */}
        <div>
          <span className="text-xs font-semibold text-muted-foreground/60 tracking-wide uppercase mb-3 block">
            Selecione o porte
          </span>
          <RadioGroup value={selectedSize} onValueChange={setSelectedSize} className="grid gap-3">
            {SIZE_OPTIONS.map(opt => {
              const price = getPrice(opt.value);
              if (price == null || price <= 0) return null;
              const isSelected = selectedSize === opt.value;
              return (
                <Label
                  key={opt.value}
                  htmlFor={`size-${opt.value}`}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                    isSelected
                      ? 'border-primary bg-primary/[0.04] dark:bg-primary/[0.08] shadow-[0_2px_12px_-4px_hsl(var(--primary)/0.15)]'
                      : 'border-border/50 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-sm'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={opt.value} id={`size-${opt.value}`} className="shrink-0" />
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl leading-none">{opt.emoji}</span>
                      <div>
                        <span className="font-semibold text-foreground text-[15px]">{opt.label}</span>
                        <span className="block text-xs text-muted-foreground/60">{opt.desc}</span>
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    "text-lg font-extrabold tracking-tight transition-colors",
                    isSelected ? "text-primary" : "text-foreground/80"
                  )}>{fmtPrice(price)}</span>
                </Label>
              );
            })}
          </RadioGroup>
        </div>

        {/* Trust indicators */}
        <div className="grid grid-cols-1 gap-2 pt-2">
          {TRUST_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground/50">
                <Icon className="w-3.5 h-3.5 text-primary/40 shrink-0" />
                <span>{item.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </ResponsiveModal>
  );
}

const EASE: [number, number, number, number] = [0.22, 0.03, 0.26, 1];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
};
const fade = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export function ServicesSection() {
  const { grouped, loading } = useActiveServices();
  const { settings } = usePetshop();
  const customCategories = (settings.custom_categories || []) as ServiceCategory[];
  const [selectedService, setSelectedService] = useState<ServiceRow | null>(null);

  if (loading) return <ServicesSkeleton />;

  const allServices = grouped.flatMap((g) => {
    const config = getCategoryByValue(g.category, customCategories);
    return g.services.map((s) => ({ 
      ...s, 
      config, 
      isPopular: (settings.popular_service_ids || []).includes(s.id),
      customColor: settings.service_colors?.[s.id]
    }));
  }).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <section id="servicos" className="py-16 md:py-20 lg:py-24 scroll-mt-20 relative overflow-hidden">
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute top-[15%] left-[10%] w-[600px] h-[600px] rounded-full bg-primary/[0.02] dark:bg-primary/[0.035] blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[8%] w-[500px] h-[500px] rounded-full bg-primary/[0.015] dark:bg-primary/[0.03] blur-[120px] pointer-events-none" />
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1440 900" fill="none">
        <path d="M-50 300C200 220 500 380 750 280C1000 180 1200 340 1500 260" stroke="hsl(var(--primary))" strokeWidth="0.8" opacity="0.03" />
      </svg>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-6xl">
        {/* ── Header ── */}
        <motion.div
          className="text-center mb-14 md:mb-18"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/[0.06] dark:bg-primary/[0.1] border border-primary/10 rounded-full text-primary text-[11px] font-semibold tracking-[0.15em] uppercase mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Nossos serviços
          </span>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold text-foreground leading-[1.1] tracking-tight max-w-3xl mx-auto mb-5">
            Tudo que seu pet precisa{' '}
            <span className="bg-gradient-to-r from-[#1A73E8] via-[#4285F4] to-[#FBBC04] bg-clip-text text-transparent">
              em um só lugar
            </span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground/70 max-w-xl mx-auto leading-relaxed">
            Banho, tosa e cuidados profissionais com conforto, carinho e segurança.
          </p>
        </motion.div>

        {/* ── Services grid ── */}
        {allServices.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {allServices.map((service, i) => {
              const { config, isPopular, customColor } = service;
              const ServiceIcon = getIconComponent(service.icon || config.icon);
              const hasPrice = (service.price_pequeno || 0) > 0;
              const accentColor = isPopular ? 'hsl(var(--secondary))' : (customColor || 'hsl(var(--primary))');

              return (
                <motion.div key={service.id} variants={fade} className="group h-full">
                  <div
                    className={cn(
                      'relative h-full flex flex-col rounded-[2rem] overflow-hidden transition-all duration-700 ease-out',
                      'bg-white/80 dark:bg-card/40 backdrop-blur-md',
                      'border hover:-translate-y-3',
                      isPopular 
                        ? 'border-secondary/40 shadow-[0_12px_40px_-12px_hsl(var(--secondary)/0.2)]'
                        : 'shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.12)]',
                    )}
                    style={{ 
                      borderColor: !isPopular && customColor ? `${customColor}33` : undefined 
                    }}
                  >
                    {/* Hover Glow Effect */}
                    <div 
                      className="absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-3xl -z-10"
                      style={{ 
                        background: `radial-gradient(circle at center, ${accentColor}25, transparent)` 
                      }}
                    />

                    {/* Badge */}
                    {isPopular && (
                      <div className="absolute top-6 right-6 z-10">
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20 transition-transform duration-700 group-hover:scale-105">
                          <Sparkles className="w-3 h-3" />
                          Popular
                        </span>
                      </div>
                    )}

                    {/* Content */}
                    <div className="relative p-7 lg:p-8 flex-1">
                      {/* Icon & Category */}
                      <div className="flex items-start justify-between mb-8">
                        <div 
                          className={cn(
                            'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-xl relative overflow-hidden'
                          )}
                          style={{ 
                            backgroundColor: isPopular ? 'hsl(var(--secondary))' : accentColor,
                            boxShadow: `0 10px 25px -5px ${isPopular ? 'hsl(var(--secondary)/0.4)' : accentColor + '44'}`
                          }}
                        >
                          <ServiceIcon className="w-7 h-7 text-white relative z-10" />
                        </div>
                        
                        {!isPopular && (
                          <span className={cn(
                            'px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border',
                            config.bgBadge,
                          )}>
                            {config.label}
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h4 
                          className="text-xl font-black tracking-tight transition-colors duration-300 text-foreground"
                          style={{ color: isPopular ? undefined : undefined }} // Let's keep name standard or allow hover?
                        >
                          {service.name}
                        </h4>

                        {service.description ? (
                          <p className="text-sm text-muted-foreground/60 leading-relaxed line-clamp-3 font-medium">
                            {service.description}
                          </p>
                        ) : (
                          <div className="h-12" /> // Spacer to keep height consistent
                        )}
                      </div>
                    </div>

                    {/* Footer / Action Area */}
                    <div className="px-7 lg:px-8 pb-8 pt-0">
                      <div className="flex items-end justify-between gap-4">
                        {/* Price Info */}
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">A partir de</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-bold" style={{ color: accentColor }}>R$</span>
                            <span 
                              className="text-2xl font-black tracking-tighter leading-none transition-colors duration-700"
                              style={{ color: accentColor }}
                            >
                              {service.price_pequeno}
                            </span>
                          </div>
                        </div>

                        {/* Visual indicator button */}
                        <button 
                          onClick={() => setSelectedService(service as any)}
                          className={cn(
                            'h-11 px-4 rounded-2xl flex items-center gap-2 transition-all duration-300 group/btn relative overflow-hidden border',
                          )}
                          style={{
                            backgroundColor: `${accentColor}11`,
                            color: accentColor,
                            borderColor: `${accentColor}22`
                          }}
                        >
                          {/* Button Hover Shine */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                          
                          <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Ver preços</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <Scissors className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-medium text-muted-foreground">Nenhum serviço cadastrado</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Os serviços aparecerão aqui assim que forem adicionados</p>
          </div>
        )}
      </div>

      <SizeModal
        service={selectedService}
        open={!!selectedService}
        onClose={() => setSelectedService(null)}
        customCategories={customCategories}
      />
    </section>
  );
}
