import { ArrowRight, Heart, Dog, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { getPetshopWhatsAppPhone, openWhatsAppConversation } from '@/lib/whatsapp';
import { usePetshop } from '@/contexts/PetshopContext';
import petTexture from '@/assets/pet-texture.webp';

export function CTASection() {
  const { petshop, settings } = usePetshop();
  const address = petshop?.address || '';
  const petshopWhatsAppPhone = getPetshopWhatsAppPhone({
    phone: petshop?.phone,
    whatsappUrl: settings?.social_links?.links?.whatsapp_url,
  });

  const scrollToAgenda = () => {
    const element = document.querySelector('#agenda');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative py-28 md:py-40 overflow-hidden transition-colors duration-500 bg-primary dark:bg-[#0a192f]">
      {/* ── Background Architecture ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Dynamic Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(10,122,230,0.15)_0%,transparent_70%)]" />
        
        {/* Pattern Integration — Adaptive Opacity */}
        <div 
          className="absolute inset-0 opacity-[0.08] dark:opacity-[0.07] mix-blend-overlay dark:mix-blend-screen"
          style={{
            backgroundImage: `url(${petTexture})`,
            backgroundSize: '280px 280px',
            backgroundRepeat: 'repeat',
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge — Adaptive Style */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-5 py-2 bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-full mb-10 backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-secondary dark:text-secondary" />
            <span className="text-[11px] font-bold text-white/90 dark:text-white/70 uppercase tracking-[0.2em]">Mais de 500 pets atendidos</span>
          </motion.div>

          {/* Heading — High Contrast in both themes */}
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-8 tracking-tight leading-[1.05] drop-shadow-sm"
          >
            Seu pet merece o<br />
            <span className="relative">
              <span className="text-secondary drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]">melhor cuidado</span>
            </span>
          </motion.h2>

          {/* Description — Adaptive Contrast */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-white/80 dark:text-white/50 mb-14 max-w-2xl mx-auto leading-relaxed font-medium"
          >
            Agende agora e deixe seu amigo nas melhores mãos de Cajamar. 
            Experiência técnica e muito carinho para quem faz parte da sua família.
          </motion.p>

          {/* Action Area — Adaptive Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto h-16 px-12 bg-secondary hover:bg-secondary/90 text-white text-lg font-bold rounded-2xl shadow-[0_10px_30px_-10px_rgba(245,158,11,0.5)] hover:shadow-[0_15px_35px_-5px_rgba(245,158,11,0.6)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 group"
              onClick={scrollToAgenda}
            >
              Agendar Agora
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-16 px-12 bg-white/10 dark:bg-white/5 backdrop-blur-md border-white/20 dark:border-white/10 text-white hover:bg-white/20 dark:hover:bg-white/10 hover:border-white/30 dark:hover:border-white/20 text-lg font-bold rounded-2xl transition-all duration-300"
              onClick={() => openWhatsAppConversation({ 
                phone: petshopWhatsAppPhone, 
                message: 'Olá! Gostaria de tirar uma dúvida sobre os serviços do PetCão.' 
              })}
            >
              Falar no WhatsApp
            </Button>
          </motion.div>

          {/* Trust Footer — Adaptive Visibility */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-16 pt-8 border-t border-white/10 dark:border-white/5 flex flex-wrap justify-center gap-8 md:gap-12 opacity-60 dark:opacity-40 hover:opacity-100 transition-opacity duration-500"
          >
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-white" />
              <span className="text-xs font-bold uppercase tracking-widest text-white">Carinho Total</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-xs font-bold uppercase tracking-widest text-white">Profissionalismo</span>
            </div>
            <div className="flex items-center gap-2">
              <Dog className="w-4 h-4 text-white" />
              <span className="text-xs font-bold uppercase tracking-widest text-white">Equipe Senior</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
