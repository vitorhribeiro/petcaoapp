import { Heart, Instagram, Facebook, Youtube, Globe, MessageCircle, Music2, MapPin, Phone, Clock, ArrowUpRight, ChevronUp, ShieldCheck, FileText } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import logoPetDefault from '@/assets/logopet.webp';
import otixLogo from '@/assets/otix-logo.webp';
import { useBranding } from '@/contexts/BrandingContext';
import { useConfig } from '@/hooks/useConfig';
import { usePetshop } from '@/contexts/PetshopContext';
import { Skeleton } from '@/components/ui/skeleton';

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  tiktok: Music2,
  facebook: Facebook,
  youtube: Youtube,
  whatsapp: MessageCircle,
  site: Globe,
};

function ContactSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="h-3.5 w-36" />
        </div>
      ))}
    </div>
  );
}

function SocialSkeleton() {
  return (
    <div className="flex gap-2">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="w-11 h-11 rounded-xl" />
      ))}
    </div>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { branding } = useBranding();
  const { socialLinks, shopAddress } = useConfig();
  const { settings, loading: petshopLoading } = usePetshop();
  const logoSrc = branding.logoUrl || logoPetDefault;

  const isLoading = petshopLoading;
  const address = shopAddress.address || '';
  const phone = shopAddress.phone || '';
  const enabledSocials = socialLinks.filter(s => s.enabled && s.url);
  const hasContactInfo = phone || address;

  const openDays = settings.openDaysDefault || [];
  const hoursLabel = openDays.length > 0
    ? `${openDays[0].charAt(0).toUpperCase() + openDays[0].slice(1)} - ${openDays[openDays.length - 1].charAt(0).toUpperCase() + openDays[openDays.length - 1].slice(1)}: ${settings.openTimeDefault.replace(':', 'h')} às ${settings.closeTimeDefault.replace(':', 'h')}`
    : '';

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const navLinks = [
    { href: '#inicio', label: 'Início' },
    { href: '#servicos', label: 'Serviços' },
    { href: '#valores', label: 'Valores' },
    { href: '#agenda', label: 'Agenda' },
    { href: '#fotos', label: 'Galeria' },
    { href: '#avaliacoes', label: 'Avaliações' },
    { href: '#localizacao', label: 'Localização' },
  ];

  return (
    <footer className="relative overflow-hidden bg-[#fafafa] dark:bg-background text-foreground dark:text-white transition-colors duration-500">
      {/* Premium background effects */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/[0.02] dark:bg-primary/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        {/* ── Top section: Brand Hub ── */}
        <div className="pt-20 pb-16">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-8 bg-white/40 dark:bg-white/[0.08] backdrop-blur-md border border-white/60 dark:border-white/[0.12] p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-black/[0.02]">
            <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
              <div className="relative group shrink-0">
                <div className="absolute -inset-2 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-3xl blur opacity-100 transition duration-500" />
                <div className="relative p-3 bg-white dark:bg-surface rounded-2xl border border-border/40 dark:border-white/[0.1] shadow-lg">
                  <OptimizedImage src={logoSrc} alt={branding.shopName} className="h-10 md:h-12 w-auto max-w-[120px] md:max-w-[160px] object-contain" showSkeleton={false} />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-xl md:text-2xl tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">{branding.shopName}</h3>
                <p className="text-xs md:text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                  <span className="truncate">Cuidado premium para seu pet</span>
                </p>
              </div>
            </div>

            {/* Divider for mobile only */}
            <div className="w-full h-px bg-border/40 md:hidden" />

            <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
              <div className="flex flex-col md:items-end">
                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Precisa de ajuda?</span>
                <span className="text-sm font-semibold">{phone || 'Entre em contato'}</span>
              </div>
              <button
                onClick={scrollToTop}
                className="group w-12 h-12 md:w-14 md:h-14 bg-primary text-primary-foreground hover:scale-105 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg shadow-primary/20 shrink-0"
                aria-label="Voltar ao topo"
              >
                <ChevronUp className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-y-1 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Main content grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16 pb-20">
          {/* About Column */}
          <div className="md:col-span-5 space-y-8">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Sobre Nós</h4>
              <p className="text-[16px] text-muted-foreground leading-relaxed font-medium">
                O PetCão nasceu com o propósito de oferecer cuidado, carinho e qualidade para os pets e tranquilidade para seus tutores. Um ambiente acolhedor com serviços pensados para o bem-estar animal.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Nossas Redes</h4>
              {isLoading ? (
                <SocialSkeleton />
              ) : (
                <div className="flex flex-wrap gap-3">
                  {enabledSocials.length > 0 ? (
                    enabledSocials.map(social => {
                      const Icon = SOCIAL_ICONS[social.key] || Globe;
                      return (
                        <a
                          key={social.key}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group w-12 h-12 bg-white dark:bg-white/[0.05] hover:bg-primary text-muted-foreground hover:text-primary-foreground rounded-2xl flex items-center justify-center transition-all duration-300 border border-border/50 dark:border-white/[0.08] hover:border-primary shadow-sm hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1"
                        >
                          <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                        </a>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground/50 italic">Conecte-se conosco em breve.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Links Column */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-8">Navegação</h4>
            <nav className="flex flex-col gap-4">
              {navLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-3 text-[15px] text-muted-foreground hover:text-foreground font-medium transition-all duration-200"
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <span className="w-0 h-[2px] bg-primary group-hover:w-4 transition-all duration-300" />
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Contact Column */}
          <div className="md:col-span-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-8">Informações</h4>
            <div className="space-y-6">
              {isLoading ? (
                <ContactSkeleton />
              ) : (
                <>
                  {phone && (
                    <a href={`tel:${phone.replace(/\D/g, '')}`} className="group flex items-center gap-4 p-4 bg-white/50 dark:bg-white/[0.03] rounded-2xl border border-transparent hover:border-primary/20 transition-all">
                      <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-0.5">Telefone</span>
                        <span className="text-[15px] font-semibold text-foreground">{phone}</span>
                      </div>
                    </a>
                  )}
                  
                  {address && (
                    <div className="flex items-start gap-4 p-4">
                      <div className="w-11 h-11 bg-secondary/10 dark:bg-secondary/20 rounded-xl flex items-center justify-center text-secondary shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-0.5">Endereço</span>
                        <span className="text-[15px] font-medium text-muted-foreground leading-relaxed">{address}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-4 p-4 bg-white/30 dark:bg-white/[0.02] rounded-2xl border border-border/40">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                        <Clock className="w-5 h-5" />
                      </div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Horários</span>
                    </div>
                    
                    <div className="space-y-2 pl-1">
                      {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((dayKey) => {
                        const isOpen = settings.openDaysDefault?.includes(dayKey);
                        const dayName = {
                          seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo'
                        }[dayKey];

                        return (
                          <div key={dayKey} className="flex items-center justify-between text-[13px]">
                            <span className={`font-medium ${isOpen ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                              {dayName}
                            </span>
                            <span className={`font-semibold ${isOpen ? 'text-foreground' : 'text-muted-foreground/30'}`}>
                              {isOpen ? `${settings.openTimeDefault?.replace(':', 'h')} - ${settings.closeTimeDefault?.replace(':', 'h')}` : 'Fechado'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom Copyright ── */}
        <div className="border-t border-border/60 dark:border-white/[0.06] py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center justify-center text-center max-w-sm md:max-w-none md:text-left">
            <p className="text-[13px] font-medium text-muted-foreground/70">
              <Heart className="w-4 h-4 text-red-500 fill-red-500 inline-block mr-1.5 -mt-0.5" />
              © {currentYear} {branding.shopName}. Todos os direitos reservados a Otix Landing.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-6">
            <div className="flex gap-6 md:gap-4 text-[13px] font-medium text-muted-foreground/50">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="hover:text-primary transition-colors flex items-center gap-1.5 group/link">
                    <FileText className="w-3.5 h-3.5 opacity-40 group-hover/link:opacity-100 transition-opacity" />
                    Termos
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden border-primary/10">
                  <DialogHeader className="p-6 pb-4 bg-primary/5 border-b border-primary/10">
                    <DialogTitle className="flex items-center gap-3 text-xl">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <FileText className="w-5 h-5" />
                      </div>
                      Termos de Uso
                    </DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="p-8 pb-10 h-full max-h-[calc(85vh-120px)]">
                    <div className="space-y-6 text-sm leading-relaxed text-muted-foreground pr-4">
                      <section>
                        <h3 className="font-bold text-foreground text-base mb-2">1. Aceitação dos Termos</h3>
                        <p>Ao acessar e utilizar a plataforma do PetCão, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.</p>
                      </section>
                      <section>
                        <h3 className="font-bold text-foreground text-base mb-2">2. Descrição do Serviço</h3>
                        <p>O PetCão oferece uma plataforma para agendamento de serviços estéticos e de bem-estar animal, gestão de pets e comunicação entre o tutor e o estabelecimento. Os serviços estão sujeitos à disponibilidade e confirmação.</p>
                      </section>
                      <section>
                        <h3 className="font-bold text-foreground text-base mb-2">3. Cadastro e Segurança</h3>
                        <p>Para utilizar certas funcionalidades, é necessário criar uma conta. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrem em sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado.</p>
                      </section>
                      <section>
                        <h3 className="font-bold text-foreground text-base mb-2">4. Política de Cancelamento</h3>
                        <p>Agendamentos podem ser cancelados ou remarcados com antecedência mínima de 24 horas. Cancelamentos em cima da hora podem estar sujeitos a taxas conforme política interna do estabelecimento.</p>
                      </section>
                      <section>
                        <h3 className="font-bold text-foreground text-base mb-2">5. Limitação de Responsabilidade</h3>
                        <p>O PetCão envida todos os esforços para garantir a qualidade do serviço, mas não se responsabiliza por danos indiretos ou incidentais decorrentes do uso ou da incapacidade de usar a plataforma.</p>
                      </section>
                      <div className="pt-4 border-t border-border/50 text-[11px] italic">
                        Última atualização: Maio de 2024.
                      </div>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="hover:text-primary transition-colors flex items-center gap-1.5 group/link">
                    <ShieldCheck className="w-3.5 h-3.5 opacity-40 group-hover/link:opacity-100 transition-opacity" />
                    Privacidade
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden border-secondary/10">
                  <DialogHeader className="p-6 pb-4 bg-secondary/5 border-b border-secondary/10">
                    <DialogTitle className="flex items-center gap-3 text-xl">
                      <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      Política de Privacidade
                    </DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="p-8 pb-10 h-full max-h-[calc(85vh-120px)]">
                    <div className="space-y-6 text-sm leading-relaxed text-muted-foreground pr-4">
                      <section>
                        <h3 className="font-bold text-foreground text-base mb-2">1. Coleta de Informações</h3>
                        <p>Coletamos informações que você nos fornece diretamente ao criar uma conta, agendar um serviço ou entrar em contato conosco. Isso inclui nome, telefone, e-mail e dados sobre seus pets.</p>
                      </section>
                      <section>
                        <h3 className="font-bold text-foreground text-base mb-2">2. Uso dos Dados</h3>
                        <p>Utilizamos seus dados para processar agendamentos, enviar notificações sobre seus pets, melhorar nossa plataforma e garantir a segurança do sistema. Nunca vendemos seus dados para terceiros.</p>
                      </section>
                      <section>
                        <h3 className="font-bold text-foreground text-base mb-2">3. Segurança da Informação</h3>
                        <p>Implementamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição. Seus dados de pagamento são processados de forma segura.</p>
                      </section>
                      <section>
                        <h3 className="font-bold text-foreground text-base mb-2">4. Seus Direitos</h3>
                        <p>Você tem o direito de acessar, corrigir ou solicitar a exclusão de seus dados pessoais a qualquer momento através das configurações de perfil ou entrando em contato com nosso suporte.</p>
                      </section>
                      <section>
                        <h3 className="font-bold text-foreground text-base mb-2">5. Cookies</h3>
                        <p>Utilizamos cookies essenciais para manter sua sessão ativa e garantir o funcionamento básico da plataforma. Cookies analíticos podem ser usados para entender como os usuários interagem com o site.</p>
                      </section>
                      <div className="pt-4 border-t border-border/50 text-[11px] italic">
                        Nós respeitamos a LGPD (Lei Geral de Proteção de Dados).
                      </div>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
            <div className="hidden md:block h-4 w-px bg-border/60" />
            <div className="relative group/otix">
              <div className="absolute -inset-1 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-full blur opacity-100 transition duration-500" />
              <a 
                href="https://www.instagram.com/otixlanding" 
                target="_blank" 
                rel="noopener noreferrer"
                className="relative flex items-center gap-3 group px-4 py-2 bg-white dark:bg-white/[0.04] rounded-full border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
              >
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40">Crafted by Otix</span>
                <div className="flex items-center gap-2">
                  <img src={otixLogo} alt="Otix Logo" className="h-6 w-auto transition-all duration-500" />
                  <Instagram className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-[#E4405F] transition-colors" />
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative bottom bar for mobile spacing */}
      <div className="h-20 lg:hidden" />
    </footer>
  );
}
