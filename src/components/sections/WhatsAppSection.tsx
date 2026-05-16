import { MessageCircle, Phone, ExternalLink, Clock, Sparkles } from 'lucide-react';
import petTextureGray from '@/assets/pet-texture-gray.webp';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { getPetshopWhatsAppPhone, openWhatsAppConversation, buildWhatsAppUrl } from '@/lib/whatsapp';
import { usePetshop } from '@/contexts/PetshopContext';
import { useHeroGalleryImages } from '@/hooks/useHeroGalleryImages';
import { sectionAnim } from '@/lib/animations';

export function WhatsAppSection() {
  const { petshop, settings } = usePetshop();
  const { urls: galleryUrls } = useHeroGalleryImages(3);
  const phone = petshop?.phone || '';
  const hoursLabel = petshop?.hours || '';
  const petshopWhatsAppPhone = getPetshopWhatsAppPhone({
    phone: petshop?.phone,
    whatsappUrl: settings?.social_links?.links?.whatsapp_url,
  });

  const whatsappUrl = buildWhatsAppUrl(
    petshopWhatsAppPhone,
    'Olá! Gostaria de agendar um horário para meu pet.'
  ) || '#';

  return (
    <section className="py-24 md:py-40 relative overflow-hidden">
      {/* Clean Background */}
      <div className="absolute inset-0 bg-background" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-success text-[10px] font-bold uppercase tracking-widest mb-6">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
            </span>
            Atendimento Prioritário
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4 text-foreground tracking-tight">
            Agende pelo <span className="text-success">WhatsApp</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Nossa equipe está pronta para te atender. Mande uma mensagem agora e garanta a vaga do seu melhor amigo!
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <motion.div
            className="relative rounded-[2rem] bg-card/60 backdrop-blur-2xl border border-white/[0.08] dark:border-white/[0.05] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)]"
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid md:grid-cols-12 gap-0">
              {/* Left side - CTA */}
              <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center relative overflow-hidden">
                {/* Decorative glow */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-success/10 blur-[60px] rounded-full" />
                
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-success to-emerald-600 flex items-center justify-center mb-6 shadow-xl shadow-success/20 transition-transform duration-500">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-xl md:text-3xl font-bold text-foreground mb-3">
                    Fale com nossos especialistas
                  </h3>
                  <p className="text-base text-muted-foreground mb-8 max-w-lg leading-relaxed">
                    Tire dúvidas sobre serviços, pacotes ou agende um banho relaxante em poucos segundos.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                    <Button
                      asChild
                      size="lg"
                      className="h-12 px-8 bg-success hover:bg-success/90 text-white rounded-xl text-base font-bold shadow-[0_15px_30px_-10px_rgba(34,197,94,0.3)] hover:shadow-[0_15px_30px_-10px_rgba(34,197,94,0.5)] transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5" />
                        Abrir WhatsApp
                        <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                      </a>
                    </Button>
                    <div className="flex items-center gap-3 px-2 py-1">
                      <div className="flex -space-x-2.5">
                        {(galleryUrls.length > 0 ? galleryUrls : [
                          "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=100&h=100&fit=crop",
                          "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=100&h=100&fit=crop",
                          "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=100&h=100&fit=crop"
                        ]).map((url, i) => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-card bg-muted flex items-center justify-center overflow-hidden">
                            <img 
                              src={url} 
                              alt="Pet da galeria" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        ))}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">+2.4k atendidos</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Info cards */}
              <div className="md:col-span-5 relative p-8 md:p-10 flex flex-col justify-center gap-6 bg-white/[0.02] dark:bg-black/[0.05] border-t md:border-t-0 md:border-l border-white/10 overflow-hidden">
                
                <div className="space-y-6 relative z-10">
                  <div className="group flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center shrink-0 group-hover:bg-success/20 transition-colors duration-300">
                      <Sparkles className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-base">Resposta Imediata</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">Nossa equipe está online agora para te responder em minutos.</p>
                    </div>
                  </div>

                  <div className="group flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors duration-300">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-base">Atendimento Humano</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">Fale diretamente com quem cuida do seu pet, sem robôs.</p>
                    </div>
                  </div>

                  {hoursLabel && (
                    <div className="group flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center shrink-0 group-hover:bg-secondary/20 transition-colors duration-300">
                        <Clock className="w-6 h-6 text-secondary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-base">Sempre Disponíveis</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{hoursLabel}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
