import { MapPin, Navigation, Clock, Phone, Settings, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useConfig } from '@/hooks/useConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useHomeContent } from '@/hooks/useHomeContent';
import { usePetshop } from '@/contexts/PetshopContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cardVariants } from '@/lib/animations';

export function LocationSection() {
  const { shopAddress, locationSettings } = useConfig();
  const { settings } = usePetshop();
  const { isDev, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { homeContent } = useHomeContent();
  const address = shopAddress.address || '';
  const phone = shopAddress.phone || '';
  const showAdmin = isDev() || isAdmin();

  const lat = locationSettings.latitude;
  const lng = locationSettings.longitude;
  const zoom = locationSettings.zoom || 15;
  const hasCoords = lat && lng;

  const openDays = settings.openDaysDefault || [];
  const hoursLabel = openDays.length > 0
    ? `${openDays[0].charAt(0).toUpperCase() + openDays[0].slice(1)} - ${openDays[openDays.length - 1].charAt(0).toUpperCase() + openDays[openDays.length - 1].slice(1)}`
    : 'Horário não configurado';
  
  const timeRange = `${settings.openTimeDefault.replace(':', 'h')} às ${settings.closeTimeDefault.replace(':', 'h')}`;

  const closedDays = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
    .filter(d => !openDays.includes(d))
    .map(d => d.charAt(0).toUpperCase() + d.slice(1));

  const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${lat},${lng}` : '#';
  const embedUrl = hasCoords
    ? `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3659.8!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f${zoom}!3m3!1m2!1s0x0%3A0x0!2z!5e0!3m2!1spt-BR!2sbr!4v1234567890`
    : '';

  return (
    <section id="localizacao" className="py-24 md:py-32 scroll-mt-20 relative overflow-hidden">
      {/* ── Background Elements ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[400px] h-[400px] rounded-full bg-primary/[0.02] blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* ── Header ── */}
        <motion.div
          className="text-center mb-16 md:mb-24"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/[0.08] dark:bg-primary/[0.12] border border-primary/15 rounded-full text-primary text-[11px] font-black tracking-[0.2em] uppercase mb-8">
            <MapPin className="w-3.5 h-3.5" />
            Nossa Localização
          </span>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground leading-[1] tracking-tighter max-w-3xl mx-auto mb-6">
            Venha nos{' '}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Visitar
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground/70 max-w-2xl mx-auto leading-relaxed">
            Estamos localizados no coração de Cajamar, prontos para receber você e seu pet com todo carinho.
          </p>

          {showAdmin && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => navigate('/admin/configuracoes#endereco')} 
                    className="absolute top-0 right-0 p-3 text-muted-foreground hover:text-primary transition-all rounded-2xl hover:bg-primary/10 border border-transparent hover:border-primary/20"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Configurar endereço</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 max-w-6xl mx-auto items-stretch">
          {/* ── Info Panel (2/5) ── */}
          <motion.div 
            className="lg:col-span-2 flex flex-col gap-6"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Address Card */}
            <div className="flex-1 p-8 rounded-[2rem] bg-white/40 dark:bg-card/40 backdrop-blur-md border border-border/40 shadow-xl shadow-black/[0.02] flex flex-col justify-center group hover:border-primary/30 transition-all duration-500">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Endereço</h3>
              <p className="text-muted-foreground leading-relaxed">
                {address || 'Avenida Tenente Marques, Cajamar - SP'}
              </p>
            </div>

            {/* Hours Card */}
            <div className="flex-1 p-8 rounded-[2rem] bg-white/40 dark:bg-card/40 backdrop-blur-md border border-border/40 shadow-xl shadow-black/[0.02] flex flex-col justify-center group hover:border-primary/30 transition-all duration-500">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Funcionamento</h3>
              <p className="text-muted-foreground font-medium">{hoursLabel}</p>
              <p className="text-primary font-bold text-lg">{timeRange}</p>
              {closedDays.length > 0 && (
                <p className="text-xs text-muted-foreground/50 mt-2 italic">
                  {closedDays.join(', ')}: Fechado
                </p>
              )}
            </div>

            {/* CTA Button */}
            <Button
              size="lg"
              className="h-16 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest gap-3 shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-500"
              onClick={() => hasCoords && window.open(mapsUrl, '_blank')}
              disabled={!hasCoords}
            >
              <Navigation className="w-5 h-5" />
              Traçar Rota
              <ExternalLink className="w-4 h-4 opacity-40" />
            </Button>
          </motion.div>

          {/* ── Map Panel (3/5) ── */}
          <motion.div 
            className="lg:col-span-3 relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/10 border-[6px] border-white/50 dark:border-white/5 min-h-[400px]"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              {hasCoords ? (
                <iframe 
                  src={embedUrl} 
                  className="w-full h-full grayscale-[0.2] contrast-[1.1]" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade" 
                />
              ) : (
                <div className="text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-muted-foreground/10 flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-muted-foreground font-medium">Localização não configurada no painel.</p>
                </div>
              )}
            </div>
            
            {/* Map Overlay Button (Mobile) */}
            <div className="absolute bottom-6 left-6 right-6 lg:hidden">
              <Button
                className="w-full bg-background/80 backdrop-blur-md text-foreground border border-border/50 rounded-xl"
                onClick={() => hasCoords && window.open(mapsUrl, '_blank')}
              >
                Abrir no Google Maps
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
