import { useState } from 'react';
import { Scissors, ArrowRight, Clock, Calendar, Sparkles, Package, PawPrint, Shield, Check, Info, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useActiveServices } from '@/hooks/useActiveServices';
import { usePetshop } from '@/contexts/PetshopContext';
import { globalWhatsappNumber } from '@/contexts/PetshopContext';
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
  whatsapp?: string;
}

const SIZE_OPTIONS = [
  { value: 'pequeno', label: 'Pequeno', desc: 'Até 10kg', emoji: '🐕' },
  { value: 'medio', label: 'Médio', desc: '10kg – 25kg', emoji: '🐕‍🦺' },
  { value: 'grande', label: 'Grande', desc: 'Acima de 25kg', emoji: '🦮' },
] as const;

function SizeModal({ service, open, onClose, customCategories, whatsapp }: SizeModalProps) {
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
      description={service.description || "Consulte nossa equipe para mais detalhes sobre os valores e disponibilidade."}
      icon={
        catInfo ? (
          <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-md shrink-0", catInfo.gradient)}>
            <ServiceIcon className="w-6 h-6 text-white" />
          </div>
        ) : undefined
      }
      maxWidth="max-w-md"
      stickyFooter={
        <a
          href={`https://wa.me/55${(whatsapp || globalWhatsappNumber || '11999999999').replace(/\D/g, '')}?text=${encodeURIComponent(`Olá Petcão! Gostaria de saber mais sobre o serviço "${service?.name}". Podem me ajudar?`)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onClose()}
          className={cn(
            "flex items-center justify-center w-full h-12 text-base font-semibold rounded-xl gap-2",
            "bg-[#0066FF] hover:bg-[#0052CC] text-white", // specific blue from the mockup
            "transition-all duration-200",
          )}
        >
          Falar com o Petcão
          <ArrowRight className="w-4 h-4" />
        </a>
      }
    >
      <div className="space-y-4 pt-2">
        {/* Duration */}
        {service.duration_minutes && (
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[#F4F7FA] border border-[#E2E8F0]/50">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground font-medium">Duração estimada</span>
              <span className="block text-sm font-semibold text-foreground">{service.duration_minutes} minutos</span>
            </div>
          </div>
        )}

        {/* Included Items */}
        {(() => {
          const items = (Array.isArray(service.included_items) && service.included_items.length > 0)
            ? service.included_items
            : [
                'Banho completo com produtos premium',
                'Secagem cuidadosa',
                'Escovação da pelagem',
                'Corte de unhas e limpeza de ouvidos',
                'Finalização com perfume pet'
              ];
          
          if (!Array.isArray(items)) return null;

          return (
            <div className="p-4 rounded-2xl border border-border/60 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-[#3B82F6]" />
                <span className="text-sm font-bold text-foreground">
                  O que está incluso?
                </span>
              </div>
              <ul className="flex flex-col">
                {items.map((item, idx) => (
                  <li key={idx} className={cn("flex items-start gap-2.5 text-sm text-muted-foreground py-2", idx !== items.length - 1 && "border-b border-border/40")}>
                    <div className="mt-0.5 shrink-0">
                      <Check className="w-4 h-4 text-[#3B82F6]" />
                    </div>
                    <span className="leading-tight">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* Benefits */}
        <div className="p-4 rounded-2xl border border-border/60 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-sm font-bold text-foreground">Benefícios</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TRUST_ITEMS.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex flex-col items-center justify-center gap-2 p-3 text-center border border-border/60 rounded-xl bg-white">
                  <Icon className="w-5 h-5 text-[#3B82F6]" />
                  <span className="text-[10px] font-medium text-muted-foreground leading-tight px-1">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Observações */}
        <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-border/60">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-[#F97316]" />
            <span className="text-sm font-bold text-foreground">Observações</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O tempo e o valor podem variar conforme porte, tipo de pelagem e condição do pet. Consulte nossa equipe para mais detalhes.
          </p>
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
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Disponível para</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-foreground">Todos os portes</span>
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
                          
                          <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Ver mais</span>
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
        whatsapp={settings.whatsappNumber}
      />
    </section>
  );
}
