import { useState, useMemo, useCallback } from 'react';
import { Clock, Lock, Dog, CalendarDays, CheckCircle2, ChevronRight, ChevronLeft, MapPin, Scissors, Plus, AlertCircle, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useConfig } from '@/hooks/useConfig';
import { useActiveServices } from '@/hooks/useActiveServices';
import { ServiceRow } from '@/services/servicesService';
import * as appointmentsService from '@/services/appointmentsService';
import { openWhatsAppConversation, getPetshopWhatsAppPhone, buildWhatsAppUrl } from '@/lib/whatsapp';
import { usePetshop } from '@/contexts/PetshopContext';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { TimeSlotModal } from '@/components/modals/TimeSlotModal';

interface CalendarSectionProps {
  onOpenLogin: () => void;
}

const STEP_LABELS = ['Data e Horário', 'Pets', 'Serviços'];
const ONLINE_SCHEDULING_ENABLED = false; // Defina como true para ativar o fluxo real de agendamento online

function getServicePriceBySize(service: ServiceRow, size: string): number | null {
  const s = (size || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (s.startsWith('peq') || s === 'p') return service.price_pequeno;
  if (s.startsWith('med') || s === 'm') return service.price_medio;
  if (s.startsWith('gra') || s === 'g') return service.price_grande;
  return service.price_medio; // fallback
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CalendarSection({ onOpenLogin }: CalendarSectionProps) {
  const { isAuthenticated, user, addPet, refreshAppointments: refreshClientAppointments } = useAuth();
  const { appointments: adminAppointments, refreshAppointments: refreshAdminAppointments } = useAdmin();
  const { weeklySchedule, dateOverrides, openingHours, isOpenOnDate, shopAddress, appointmentInterval } = useConfig();
  const { petshop: petshopData, settings } = usePetshop();
  const { grouped, services: allServices, loading: servicesLoading } = useActiveServices();

  const [step, setStepRaw] = useState(0);
  const setStep = (s: number) => {
    setStepRaw(s);
    setTimeout(() => {
      document.getElementById('agenda-wizard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  // Services per pet: { petId: serviceId[] }
  const [petServices, setPetServices] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPets, setGuestPets] = useState<Array<{ id: string; name: string; size: string; breed?: string }>>([]);

  const isSchedulingActive = ONLINE_SCHEDULING_ENABLED;

  // Add pet mini form
  const [showAddPet, setShowAddPet] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [newPetSize, setNewPetSize] = useState('medio');
  const [newPetBreed, setNewPetBreed] = useState('');
  const [addingPet, setAddingPet] = useState(false);

  const formatFullDate = (date: Date) =>
    date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const formatShortDate = (date: Date) =>
    date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  const togglePet = (petId: string) => {
    setSelectedPetIds(prev =>
      prev.includes(petId) ? prev.filter(id => id !== petId) : [...prev, petId]
    );
  };

  const toggleServiceForPet = (petId: string, serviceId: string) => {
    setPetServices(prev => {
      const current = prev[petId] || [];
      const updated = current.includes(serviceId)
        ? current.filter(id => id !== serviceId)
        : [...current, serviceId];
      return { ...prev, [petId]: updated };
    });
  };

  const activePets = isAuthenticated ? (user?.pets ?? []) : guestPets;
  const selectedPets = activePets.filter(p => selectedPetIds.includes(p.id));
  const petsLabel = selectedPets.map(p => p.name).join(', ');

  // Price calculation per pet
  const petPriceDetails = useMemo(() => {
    return selectedPets.map(pet => {
      const serviceIds = petServices[pet.id] || [];
      const items = serviceIds.map(sid => {
        const svc = allServices.find(s => s.id === sid);
        if (!svc) return null;
        const price = getServicePriceBySize(svc, pet.size);
        return { service: svc, price };
      }).filter(Boolean) as { service: ServiceRow; price: number | null }[];
      const hasInvalidPrice = items.some(i => i.price == null);
      const subtotal = items.reduce((sum, i) => sum + (i.price || 0), 0);
      return { pet, items, subtotal, hasInvalidPrice };
    });
  }, [selectedPets, petServices, allServices]);

  const totalPrice = petPriceDetails.reduce((sum, p) => sum + p.subtotal, 0);
  const hasAnyInvalidPrice = petPriceDetails.some(p => p.hasInvalidPrice);

  // Default interval for time slots
  const defaultDuration = 60;

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const [openH, openM] = openingHours.openTime.split(':').map(Number);
    const [closeH, closeM] = openingHours.closeTime.split(':').map(Number);
    let totalMin = openH * 60 + openM;
    const closeTotal = closeH * 60 + closeM;
    while (totalMin + appointmentInterval <= closeTotal) {
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      totalMin += appointmentInterval;
    }
    return slots;
  }, [openingHours, appointmentInterval]);

  // Filter past times for today
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return timeSlots;
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    if (!isToday) return timeSlots;
    const currentMin = now.getHours() * 60 + now.getMinutes();
    return timeSlots.filter(t => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m > currentMin;
    });
  }, [timeSlots, selectedDate]);

  const capacityPerSlot = 1;

  const getSlotCount = (date: string, time: string) => {
    return adminAppointments.filter(
      a => a.date === date && a.time === time && (a.status === 'pendente' || a.status === 'confirmado')
    ).length;
  };

  const isSlotAvailable = (date: string, time: string) => {
    return getSlotCount(date, time) < capacityPerSlot;
  };

  const disabledDayMatcher = (date: Date) => {
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    return !isOpenOnDate(date);
  };

  const hasOverride = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return dateOverrides.some(o => o.date === dateStr);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    if (!isOpenOnDate(date)) {
      toast.error('Fechado neste dia');
      return;
    }
    setSelectedDate(date);
    setSelectedTime(null);
    setTimeModalOpen(true);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleAddPet = async () => {
    if (!newPetName.trim()) return;
    setAddingPet(true);
    try {
      await addPet({ name: newPetName.trim(), size: newPetSize, breed: newPetBreed.trim() });
      setNewPetName('');
      setNewPetBreed('');
      setNewPetSize('medio');
      setShowAddPet(false);
      toast.success('Pet adicionado!');
    } catch {
      toast.error('Erro ao adicionar pet');
    }
    setAddingPet(false);
  };

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime || selectedPets.length === 0 || hasAnyInvalidPrice) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const formattedDate = selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const petshopWhatsAppPhone = getPetshopWhatsAppPhone({
      phone: petshopData?.phone,
      whatsappUrl: settings?.social_links?.links?.whatsapp_url,
    });

    const allServiceNames = petPriceDetails.flatMap(p => p.items.map(i => i.service.name));
    const mainServiceName = allServiceNames.length > 0 ? allServiceNames.join(', ') : 'Serviço não especificado';

    let appointmentId = '';
    if (user) {
      try {
        const apt = await appointmentsService.createAppointment({
          customer_id: user.id,
          service_name: mainServiceName,
          date: dateStr,
          time: selectedTime,
          price: totalPrice,
          origin: 'whatsapp',
          notes: petPriceDetails.map(p => `${p.pet.name}: ${p.items.map(i => i.service.name).join(', ') || 'sem serviço'} (${formatBRL(p.subtotal)})`).join(' | '),
          pets: selectedPets.map(p => ({ pet_id: p.id, pet_name: p.name, pet_size: p.size, pet_breed: p.breed })),
        });
        if (!apt || !apt.id) {
          console.error('createAppointment returned null');
          toast.error('Erro ao criar agendamento. Tente novamente.');
          return;
        }
        appointmentId = apt.id;
        console.log('Appointment created:', apt.id, apt.status);

        await Promise.all([
          refreshClientAppointments(),
          refreshAdminAppointments(),
        ]);
      } catch (err) {
        console.error('Error creating appointment:', err);
        toast.error('Erro ao criar agendamento. Tente novamente.');
        return;
      }
    }

    toast.success('Agendamento criado como PENDENTE. Abrindo WhatsApp…', { duration: 5000 });

    let whatsappMsg = `Olá! Gostaria de CONFIRMAR meu agendamento no PetCão ✅\n\n`;
    whatsappMsg += `📅 Data: ${formattedDate}\n`;
    whatsappMsg += `⏰ Horário: ${selectedTime}\n\n`;
    const tutorName = user?.name || guestName || 'Convidado';
    if (tutorName) whatsappMsg += `👤 Tutor: ${tutorName}\n`;
    whatsappMsg += `🐾 Pets: ${petsLabel}\n\n`;
    whatsappMsg += `Serviços:\n`;
    petPriceDetails.forEach(p => {
      const svcNames = p.items.map(i => i.service.name).join(', ') || 'A definir';
      whatsappMsg += `- ${p.pet.name}: ${svcNames} (${formatBRL(p.subtotal)})\n`;
    });
    whatsappMsg += `\n💰 Total: ${formatBRL(totalPrice)}\n`;
    whatsappMsg += `\nPode confirmar por favor? 🙂`;
    if (appointmentId) whatsappMsg += `\n(ID: ${appointmentId})`;

    if (!openWhatsAppConversation({ phone: petshopWhatsAppPhone, message: whatsappMsg })) {
      toast.error('Não há WhatsApp cadastrado para o petshop.');
      return;
    }

    setSubmitted(true);
  };

  const resetFlow = () => {
    setStep(0);
    setSelectedDate(undefined);
    setSelectedTime(null);
    setSelectedPetIds([]);
    setPetServices({});
    setSubmitted(false);
    setIsGuest(false);
    setGuestName('');
    setGuestPets([]);
  };

  const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
  const address = shopAddress.address || petshopData?.address || '';

  // Can continue from each step?
  const canContinueStep0 = !!selectedDate && !!selectedTime;
  const canContinueStep1 = isAuthenticated 
    ? selectedPetIds.length > 0 
    : guestName.trim().length > 0 && selectedPetIds.length > 0;
  const hasAnyService = Object.values(petServices).some(arr => arr.length > 0);

  // ---- Stepper ----
  const Stepper = () => (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => {
              if (i === 0) setStep(0);
              else if (i === 1 && canContinueStep0) setStep(1);
              else if (i === 2 && canContinueStep0 && canContinueStep1) setStep(2);
            }}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${step === i
              ? 'bg-primary text-primary-foreground shadow-md'
              : step > i
                ? 'bg-primary/15 text-primary'
                : 'bg-muted text-muted-foreground'
              }`}
          >
            <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold ${step > i ? 'bg-primary text-primary-foreground' : step === i ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
              }`}>
              {step > i ? <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </button>
          {i < STEP_LABELS.length - 1 && <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );

  // ---- Success state ----
  if (submitted) {
    return (
      <section id="agenda" className="py-20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Pedido Enviado! ✅</h2>
            <p className="text-muted-foreground">
              Seu agendamento está como <span className="font-semibold text-primary">🟡 Pendente de confirmação</span>.
              Aguarde a confirmação do PetCão no WhatsApp.
            </p>
            <div className="bg-muted/50 rounded-2xl p-4 text-left text-sm space-y-2">
              <p><span className="font-medium text-foreground">Data:</span> <span className="text-muted-foreground">{selectedDate && formatFullDate(selectedDate)}</span></p>
              <p><span className="font-medium text-foreground">Horário:</span> <span className="text-muted-foreground">{selectedTime}</span></p>
              {petPriceDetails.map(({ pet, items, subtotal }) => (
                <p key={pet.id}>
                  <span className="font-medium text-foreground">🐾 {pet.name}:</span>{' '}
                  <span className="text-muted-foreground">{items.length > 0 ? items.map(i => i.service.name).join(', ') : 'A definir'}</span>
                  {items.length > 0 && <span className="text-primary font-semibold ml-1">({formatBRL(subtotal)})</span>}
                </p>
              ))}
              <div className="pt-2 border-t border-border flex justify-between">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-bold text-primary">{formatBRL(totalPrice)}</span>
              </div>
            </div>
            <Button variant="outline" onClick={resetFlow}>Fazer novo agendamento</Button>
          </div>
        </div>
      </section>
    );
  }

  if (!ONLINE_SCHEDULING_ENABLED) {
    return (
      <section id="agenda" className="py-12 md:py-16 scroll-mt-20 relative overflow-hidden bg-glow">
        <style>{`
          @keyframes shimmer {
            100% {
              transform: translateX(100%);
            }
          }
          .animate-shimmer {
            position: relative;
            overflow: hidden;
          }
          .animate-shimmer::after {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            transform: translateX(-100%);
            background-image: linear-gradient(
              90deg,
              rgba(255, 255, 255, 0) 0%,
              rgba(255, 255, 255, 0.15) 20%,
              rgba(255, 255, 255, 0.35) 60%,
              rgba(255, 255, 255, 0) 100%
            );
            animation: shimmer 2.5s infinite;
            content: '';
          }
          @keyframes flow {
            from {
              stroke-dashoffset: 2000;
            }
            to {
              stroke-dashoffset: 0;
            }
          }
          .animate-flow-1 {
            stroke-dasharray: 120 700;
            animation: flow 30s linear infinite;
          }
          .animate-flow-2 {
            stroke-dasharray: 180 900;
            animation: flow 38s linear infinite;
          }
          .animate-flow-3 {
            stroke-dasharray: 100 600;
            animation: flow 25s linear infinite;
          }
        `}</style>

        {/* Background Grid Pattern & Ambient Glows */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-3xl pointer-events-none" />

        {/* Animated Background Curved Lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40 dark:opacity-60">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Curve 1 */}
            <path
              d="M-300 150C200 650 600 -150 1000 500C1300 750 1500 100 1800 300"
              stroke="hsl(var(--primary))"
              strokeWidth="0.8"
              opacity="0.04"
              className="dark:opacity-[0.06]"
            />
            <path
              d="M-300 150C200 650 600 -150 1000 500C1300 750 1500 100 1800 300"
              stroke="url(#gradient-line-1)"
              strokeWidth="1.5"
              className="animate-flow-1"
              opacity="0.25"
            />

            {/* Curve 2 */}
            <path
              d="M-300 750C350 100 750 900 1150 250C1350 50 1550 700 1800 450"
              stroke="hsl(var(--secondary))"
              strokeWidth="0.8"
              opacity="0.03"
              className="dark:opacity-[0.05]"
            />
            <path
              d="M-300 750C350 100 750 900 1150 250C1350 50 1550 700 1800 450"
              stroke="url(#gradient-line-2)"
              strokeWidth="1.5"
              className="animate-flow-2"
              opacity="0.2"
            />

            {/* Curve 3 */}
            <path
              d="M-300 400C100 150 450 700 800 300C1100 100 1350 750 1800 250"
              stroke="hsl(var(--primary))"
              strokeWidth="0.8"
              opacity="0.04"
              className="dark:opacity-[0.06]"
            />
            <path
              d="M-300 400C100 150 450 700 800 300C1100 100 1350 750 1800 250"
              stroke="url(#gradient-line-1)"
              strokeWidth="1.5"
              className="animate-flow-3"
              opacity="0.25"
            />

            <defs>
              <linearGradient id="gradient-line-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--primary-light, var(--primary)))" />
              </linearGradient>
              <linearGradient id="gradient-line-2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--secondary))" />
                <stop offset="100%" stopColor="hsl(var(--secondary-light, var(--secondary)))" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-14 relative">
            {/* Header Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[100px] bg-gradient-to-r from-primary/15 via-secondary/10 to-transparent rounded-full blur-[80px] pointer-events-none -z-10" />

            <span className="relative inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.2em] bg-gradient-to-r from-amber-500/12 to-yellow-500/8 backdrop-blur-md border border-amber-500/20 text-amber-600 dark:text-amber-400 shadow-sm shadow-amber-500/5 mb-4 overflow-hidden">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              Em breve
            </span>

            <h2 className="text-3xl md:text-5xl font-black mb-4 text-foreground tracking-tight leading-none">
              Agendamento <span className="bg-gradient-to-r from-primary via-primary-light to-secondary bg-clip-text text-transparent">Inteligente</span>
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground/90 max-w-xl mx-auto leading-relaxed">
              Monte o plano perfeito para seu pet, selecione data e período, e receba um resumo completo pronto para enviar direto ao nosso WhatsApp!
            </p>
          </div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Column: Premium Teaser Card */}
            <div className="lg:col-span-5 flex flex-col justify-between p-8 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-xl border border-border/80 dark:border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.03)] relative overflow-hidden group hover:border-primary/30 transition-all duration-500 hover:shadow-primary/5">
              <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-primary/10 to-secondary/5 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-750" />
              
              <div className="space-y-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  Em Desenvolvimento
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-foreground leading-tight tracking-tight">
                    Agendamento Automático
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Estamos lapidando os últimos detalhes do nosso sistema de agendamento online. Em breve você poderá gerenciar tudo sozinho! Enquanto isso, garanta seu horário falando direto com a gente.
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border/40 space-y-4">
                {isAuthenticated ? (
                  <>
                    <p className="text-xs text-muted-foreground/80 font-medium">
                      Tudo pronto! Fale com nossa equipe agora mesmo:
                    </p>
                    
                    <Button
                      asChild
                      size="lg"
                      className="w-full bg-gradient-to-r from-success to-emerald-500 hover:from-success/95 hover:to-emerald-600 text-white gap-2 h-12 rounded-2xl text-xs font-semibold shadow-lg shadow-success/15 animate-shimmer transition-transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <a
                        href={buildWhatsAppUrl(
                          getPetshopWhatsAppPhone({
                            phone: petshopData?.phone,
                            whatsappUrl: settings?.social_links?.links?.whatsapp_url,
                          }),
                          `Olá! Sou o(a) ${user?.name || 'cliente'} do Petcão e gostaria de agendar um serviço especial para meu pet!`
                        ) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="w-5 h-5 fill-white" />
                        Agendar via WhatsApp
                      </a>
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-amber-500/[0.04] dark:bg-amber-500/[0.02] border border-amber-500/15 rounded-2xl flex items-start gap-3">
                      <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Acesso Restrito</p>
                        <p className="text-[10px] text-muted-foreground/80 leading-relaxed">Faça login para liberar o botão de agendamento via WhatsApp.</p>
                      </div>
                    </div>
                    
                    <Button
                      onClick={onOpenLogin}
                      size="lg"
                      className="w-full bg-gradient-to-r from-primary to-primary/95 text-primary-foreground gap-2 h-12 rounded-2xl text-xs font-semibold shadow-lg shadow-primary/10 transition-transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Lock className="w-4 h-4" />
                      Entrar e Agendar
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Key Features Showcase */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Step 1 */}
              <div className="p-6 bg-card/30 backdrop-blur-md border border-border/40 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.01)] hover:border-primary/30 hover:bg-card/50 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                <div className="absolute top-4 right-6 text-5xl font-black text-foreground/[0.03] dark:text-white/[0.02] select-none group-hover:text-primary/5 transition-colors duration-300">
                  01
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-1">1. Escolha o Horário</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Selecione o melhor dia e período do dia para o atendimento ideal do seu pet.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-6 bg-card/30 backdrop-blur-md border border-border/40 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.01)] hover:border-primary/30 hover:bg-card/50 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                <div className="absolute top-4 right-6 text-5xl font-black text-foreground/[0.03] dark:text-white/[0.02] select-none group-hover:text-primary/5 transition-colors duration-300">
                  02
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Dog className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-1">2. Selecione o Pet</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Escolha ou cadastre seus pets para personalizar o atendimento conforme o porte.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-6 bg-card/30 backdrop-blur-md border border-border/40 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.01)] hover:border-primary/30 hover:bg-card/50 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                <div className="absolute top-4 right-6 text-5xl font-black text-foreground/[0.03] dark:text-white/[0.02] select-none group-hover:text-primary/5 transition-colors duration-300">
                  03
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-1">3. Defina os Serviços</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Combine banhos, tosas e opcionais e veja os valores exatos calculados em tempo real.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-6 bg-card/30 backdrop-blur-md border border-border/40 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.01)] hover:border-primary/30 hover:bg-card/50 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                <div className="absolute top-4 right-6 text-5xl font-black text-foreground/[0.03] dark:text-white/[0.02] select-none group-hover:text-primary/5 transition-colors duration-300">
                  04
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-1">4. Envie e Agende</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      O resumo é enviado direto para o WhatsApp. Confirmamos tudo para você em instantes!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="agenda" className="py-24 scroll-mt-20 relative overflow-hidden">
      <style>{`
        @keyframes flow {
          from {
            stroke-dashoffset: 2000;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .animate-flow-1 {
          stroke-dasharray: 120 700;
          animation: flow 30s linear infinite;
        }
        .animate-flow-2 {
          stroke-dasharray: 180 900;
          animation: flow 38s linear infinite;
        }
        .animate-flow-3 {
          stroke-dasharray: 100 600;
          animation: flow 25s linear infinite;
        }
      `}</style>
      
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/[0.03] blur-3xl pointer-events-none" />

      {/* Animated Background Curved Lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40 dark:opacity-60">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Curve 1 */}
          <path
            d="M-300 150C200 650 600 -150 1000 500C1300 750 1500 100 1800 300"
            stroke="hsl(var(--primary))"
            strokeWidth="0.8"
            opacity="0.04"
            className="dark:opacity-[0.06]"
          />
          <path
            d="M-300 150C200 650 600 -150 1000 500C1300 750 1500 100 1800 300"
            stroke="url(#gradient-line-1)"
            strokeWidth="1.5"
            className="animate-flow-1"
            opacity="0.25"
          />

          {/* Curve 2 */}
          <path
            d="M-300 750C350 100 750 900 1150 250C1350 50 1550 700 1800 450"
            stroke="hsl(var(--secondary))"
            strokeWidth="0.8"
            opacity="0.03"
            className="dark:opacity-[0.05]"
          />
          <path
            d="M-300 750C350 100 750 900 1150 250C1350 50 1550 700 1800 450"
            stroke="url(#gradient-line-2)"
            strokeWidth="1.5"
            className="animate-flow-2"
            opacity="0.2"
          />

          {/* Curve 3 */}
          <path
            d="M-300 400C100 150 450 700 800 300C1100 100 1350 750 1800 250"
            stroke="hsl(var(--primary))"
            strokeWidth="0.8"
            opacity="0.04"
            className="dark:opacity-[0.06]"
          />
          <path
            d="M-300 400C100 150 450 700 800 300C1100 100 1350 750 1800 250"
            stroke="url(#gradient-line-1)"
            strokeWidth="1.5"
            className="animate-flow-3"
            opacity="0.25"
          />

          <defs>
            <linearGradient id="gradient-line-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--primary-light, var(--primary)))" />
            </linearGradient>
            <linearGradient id="gradient-line-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--secondary))" />
              <stop offset="100%" stopColor="hsl(var(--secondary-light, var(--secondary)))" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-3 bg-primary/10 px-3 py-1 rounded-full">Agendamento online</span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">Agende seu Horário</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {isSchedulingActive
              ? "Escolha a data, o pet e os serviços. Você será direcionado para o WhatsApp com tudo preenchido para confirmar em segundos!"
              : "Escolha a data, seus pets e os serviços desejados"
            }
          </p>
        </div>



        {!isSchedulingActive ? (
          <div className="relative group/agenda max-w-lg mx-auto">
            <div className="absolute inset-0 z-40 backdrop-blur-[4px] bg-background/5 flex items-center justify-center rounded-3xl">
              <div className="max-w-xs w-full mx-6 p-6 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl text-center space-y-4 animate-in fade-in zoom-in duration-500">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-1 text-primary">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-foreground">Agendamento em Breve</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Nosso sistema de agendamento online está sendo preparado para você. Por enquanto, agende seu horário diretamente pelo nosso WhatsApp.
                  </p>
                </div>
                <Button
                  asChild
                  className="w-full bg-success hover:bg-success/90 text-white gap-2 h-10 rounded-xl text-sm shadow-lg shadow-success/20"
                >
                  <a
                    href={buildWhatsAppUrl(
                      getPetshopWhatsAppPhone({
                        phone: petshopData?.phone,
                        whatsappUrl: settings?.social_links?.links?.whatsapp_url,
                      }),
                      "Olá! Gostaria de agendar um serviço para meu pet."
                    ) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Agendar via WhatsApp
                  </a>
                </Button>
              </div>
            </div>

            <div className="opacity-20 pointer-events-none filter grayscale-[0.5]">
              <div className="max-w-full mx-auto">
                <div className="relative flex items-center justify-center min-h-[280px] md:min-h-[320px] rounded-3xl overflow-hidden border border-border/60 shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.08)] ring-1 ring-border/30 bg-card">
                  {/* Blurred calendar background */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
                    <div className="blur-[2px] opacity-50 dark:opacity-30 scale-105 md:scale-110">
                      <Calendar
                        mode="single"
                        locale={ptBR}
                        disabled={() => true}
                        className="pointer-events-none"
                        classNames={{
                          months: "flex flex-col",
                          month: "space-y-3 md:space-y-4",
                          caption: "flex justify-center pt-1 relative items-center",
                          caption_label: "text-base md:text-lg font-semibold text-muted-foreground",
                          nav: "hidden",
                          table: "w-full border-collapse",
                          head_row: "flex",
                          head_cell: "text-muted-foreground rounded-md w-9 md:w-12 font-normal text-xs md:text-sm",
                          row: "flex w-full mt-1.5 md:mt-2",
                          cell: "text-center text-xs md:text-sm p-0 relative h-9 w-9 md:h-12 md:w-12",
                          day: "h-9 w-9 md:h-12 md:w-12 p-0 font-normal text-muted-foreground/60",
                        }}
                      />
                    </div>
                  </div>

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-card/40 via-card/70 to-card/40 pointer-events-none" />

                  {/* Login card */}
                  <div className="relative z-10 bg-card/90 backdrop-blur-md border border-border/60 rounded-2xl p-5 sm:p-7 shadow-[0_12px_48px_-12px_hsl(var(--primary)/0.15)] ring-1 ring-border/40 text-center max-w-[280px] w-full mx-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1.5">Faça login para agendar</h3>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                      Entre para ver horários disponíveis e confirmar pelo WhatsApp.
                    </p>
                    <div className="space-y-2">
                      <Button className="w-full" onClick={onOpenLogin}>
                        Entrar / Criar conta
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full text-xs">
                        Voltar para o site
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {!isAuthenticated && !isGuest ? (
              <div className="max-w-md mx-auto bg-card border border-border/60 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] text-center space-y-6 animate-in fade-in zoom-in-95 duration-300 relative z-10">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground">Como deseja agendar?</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Você pode criar uma conta para salvar o perfil dos seus pets ou agendar rapidamente como convidado.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button className="flex-1 rounded-xl h-11 font-semibold" onClick={onOpenLogin}>
                    Entrar / Criar Conta
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl h-11 font-semibold" onClick={() => setIsGuest(true)}>
                    Agendar como Convidado
                  </Button>
                </div>
              </div>
            ) : (
              <div id="agenda-wizard" className="max-w-4xl mx-auto bg-card rounded-3xl border border-border/60 p-6 md:p-10 shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.08)] ring-1 ring-border/30">
                <Stepper />

                {/* ===================== STEP 0: Date & Time ===================== */}
                {step === 0 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-primary" />
                      Selecione a data e horário
                    </h3>

                    <div className="bg-background rounded-2xl border border-border p-4 flex justify-center">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        disabled={disabledDayMatcher}
                        locale={ptBR}
                        className="pointer-events-auto"
                        modifiers={{
                          override: (date: Date) => hasOverride(date),
                          today: new Date(),
                        }}
                        modifiersClassNames={{
                          override: 'ring-2 ring-warning ring-offset-1',
                        }}
                        classNames={{
                          months: "flex flex-col",
                          month: "space-y-4",
                          caption: "flex justify-center pt-1 relative items-center",
                          caption_label: "text-base font-semibold",
                          nav: "space-x-1 flex items-center",
                          nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-muted rounded-md inline-flex items-center justify-center",
                          nav_button_previous: "absolute left-1",
                          nav_button_next: "absolute right-1",
                          table: "w-full border-collapse",
                          head_row: "flex",
                          head_cell: "text-muted-foreground rounded-md w-10 font-medium text-sm",
                          row: "flex w-full mt-2",
                          cell: "h-10 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                          day: "h-10 w-10 p-0 font-normal rounded-lg hover:bg-primary/10 transition-colors aria-selected:opacity-100",
                          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                          day_today: "bg-accent text-accent-foreground font-semibold",
                          day_outside: "text-muted-foreground opacity-50",
                          day_disabled: "text-muted-foreground opacity-30 line-through",
                          day_hidden: "invisible",
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary inline-block" /> Selecionado</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-accent inline-block" /> Hoje</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted inline-block line-through" /> Fechado</span>
                    </div>

                    {/* Selected time summary */}
                    {selectedDate && selectedTime && (
                      <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Horário selecionado</p>
                            <p className="text-lg font-bold text-primary">{selectedTime}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setTimeModalOpen(true)}>Trocar</Button>
                      </div>
                    )}

                    {/* TimeSlot Modal */}
                    <TimeSlotModal
                      open={timeModalOpen}
                      onOpenChange={setTimeModalOpen}
                      selectedDate={selectedDate}
                      availableSlots={availableTimeSlots}
                      selectedSlot={selectedTime}
                      onSelectSlot={handleTimeSelect}
                      onContinue={() => { setTimeModalOpen(false); setStep(1); }}
                      isSlotAvailable={isSlotAvailable}
                      dateStr={dateStr}
                    />

                    {/* Continue button */}
                    <div className="flex justify-end">
                      <Button
                        disabled={!canContinueStep0}
                        onClick={() => setStep(1)}
                        className="px-8"
                      >
                        Continuar <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ===================== STEP 1: Pet Selection ===================== */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Dog className="w-5 h-5 text-primary" />
                        Informações do(s) pet(s)
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                      </Button>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-3 text-sm text-muted-foreground flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">{selectedDate && formatShortDate(selectedDate)}</span>
                      <span>• {selectedTime}</span>
                    </div>

                    {isAuthenticated ? (
                      <div className="space-y-6">
                        <div className="bg-background rounded-2xl border border-border p-6">
                          {user && user.pets.length > 0 ? (
                            <div className="flex flex-wrap gap-3">
                              {user.pets.map(pet => {
                                const isSelected = selectedPetIds.includes(pet.id);
                                return (
                                  <button
                                    key={pet.id}
                                    onClick={() => togglePet(pet.id)}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-all text-sm ${isSelected
                                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                      : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                                      }`}
                                  >
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                                      }`}>
                                      {isSelected && (
                                        <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 10 10" fill="currentColor">
                                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      )}
                                    </div>
                                    🐾 {pet.name}
                                    <span className="text-xs text-muted-foreground">({pet.size})</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhum pet cadastrado. Adicione um abaixo.</p>
                          )}

                          {selectedPetIds.length === 0 && user && user.pets.length > 0 && (
                            <p className="text-xs text-destructive mt-3">Selecione pelo menos um pet para continuar</p>
                          )}
                        </div>

                        {/* Add pet mini form */}
                        <div>
                          {!showAddPet ? (
                            <Button variant="outline" size="sm" onClick={() => setShowAddPet(true)}>
                              <Plus className="w-4 h-4 mr-1" /> Adicionar pet
                            </Button>
                          ) : (
                            <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
                              <h4 className="text-sm font-semibold text-foreground">Novo Pet</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Input
                                  placeholder="Nome do pet"
                                  value={newPetName}
                                  onChange={e => setNewPetName(e.target.value)}
                                />
                                <Select value={newPetSize} onValueChange={setNewPetSize}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pequeno">Pequeno</SelectItem>
                                    <SelectItem value="medio">Médio</SelectItem>
                                    <SelectItem value="grande">Grande</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  placeholder="Raça (opcional)"
                                  value={newPetBreed}
                                  onChange={e => setNewPetBreed(e.target.value)}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleAddPet} disabled={addingPet || !newPetName.trim()}>
                                  {addingPet ? 'Salvando...' : 'Salvar'}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setShowAddPet(false)}>Cancelar</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-background rounded-2xl border border-border p-6 space-y-6">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-foreground">Seu Nome (Tutor)</label>
                          <Input 
                            placeholder="Digite seu nome completo" 
                            value={guestName} 
                            onChange={e => setGuestName(e.target.value)} 
                            className="rounded-xl h-11"
                          />
                        </div>
                        
                        <div className="border-t border-border/60 pt-6 space-y-4">
                          <h4 className="text-sm font-semibold text-foreground">Informações do Pet</h4>
                          {guestPets.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {guestPets.map(pet => (
                                <div key={pet.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                                  🐾 {pet.name} ({pet.size})
                                  <button 
                                    onClick={() => {
                                      setGuestPets(prev => prev.filter(p => p.id !== pet.id));
                                      setSelectedPetIds(prev => prev.filter(id => id !== pet.id));
                                    }}
                                    className="text-xs hover:text-destructive transition-colors ml-1 font-bold"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {guestPets.length === 0 || showAddPet ? (
                            <div className="bg-muted/30 rounded-2xl border border-border p-4 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Input
                                  placeholder="Nome do pet"
                                  value={newPetName}
                                  onChange={e => setNewPetName(e.target.value)}
                                  className="rounded-xl"
                                />
                                <Select value={newPetSize} onValueChange={setNewPetSize}>
                                  <SelectTrigger className="rounded-xl">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pequeno">Pequeno</SelectItem>
                                    <SelectItem value="medio">Médio</SelectItem>
                                    <SelectItem value="grande">Grande</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  placeholder="Raça (opcional)"
                                  value={newPetBreed}
                                  onChange={e => setNewPetBreed(e.target.value)}
                                  className="rounded-xl"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    if (!newPetName.trim()) return;
                                    const newId = `guest-pet-${Date.now()}`;
                                    const newPet = { id: newId, name: newPetName.trim(), size: newPetSize, breed: newPetBreed.trim() };
                                    setGuestPets(prev => [...prev, newPet]);
                                    setSelectedPetIds(prev => [...prev, newId]);
                                    setNewPetName('');
                                    setNewPetBreed('');
                                    setNewPetSize('medio');
                                    setShowAddPet(false);
                                  }} 
                                  disabled={!newPetName.trim()}
                                  className="rounded-lg"
                                >
                                  Salvar Pet
                                </Button>
                                {guestPets.length > 0 && (
                                  <Button variant="ghost" size="sm" onClick={() => setShowAddPet(false)} className="rounded-lg">
                                    Cancelar
                                  </Button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => setShowAddPet(true)} className="rounded-xl">
                              <Plus className="w-4 h-4 mr-1" /> Adicionar outro pet
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Continue */}
                    <div className="flex justify-end">
                      <Button
                        disabled={!canContinueStep1}
                        onClick={() => setStep(2)}
                        className="px-8"
                      >
                        Continuar <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ===================== STEP 2: Services + Summary ===================== */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Scissors className="w-5 h-5 text-primary" />
                        Selecione os serviços
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                      </Button>
                    </div>

                    {servicesLoading ? (
                      <div className="text-center py-8 text-muted-foreground">Carregando serviços...</div>
                    ) : (
                      <div className="space-y-6">
                        {selectedPets.map(pet => {
                          const detail = petPriceDetails.find(d => d.pet.id === pet.id);
                          return (
                            <div key={pet.id} className="bg-background rounded-2xl border border-border p-5">
                              <h4 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                                🐾 {pet.name} <span className="text-xs text-muted-foreground font-normal">({pet.size})</span>
                              </h4>
                              {grouped.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Nenhum serviço disponível.</p>
                              ) : (
                                <div className="space-y-4">
                                  {grouped.map(group => (
                                    <div key={group.category}>
                                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{group.category}</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {group.services.map(service => {
                                          const isSelected = (petServices[pet.id] || []).includes(service.id);
                                          const price = getServicePriceBySize(service, pet.size);
                                          return (
                                            <button
                                              key={service.id}
                                              onClick={() => toggleServiceForPet(pet.id, service.id)}
                                              className={`text-left p-3 rounded-xl border-2 transition-all text-sm ${isSelected
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border bg-background hover:border-primary/50'
                                                }`}
                                            >
                                              <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                                                    }`}>
                                                    {isSelected && (
                                                      <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 10 10">
                                                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                      </svg>
                                                    )}
                                                  </div>
                                                  <span className="font-medium text-foreground">{service.name}</span>
                                                </div>
                                                <span className={`text-xs font-semibold flex-shrink-0 ${price != null ? 'text-primary' : 'text-destructive'}`}>
                                                  {price != null ? formatBRL(price) : 'S/ preço'}
                                                </span>
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Pet subtotal */}
                              {detail && detail.items.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Subtotal {pet.name}</span>
                                  <span className="text-sm font-bold text-foreground">{formatBRL(detail.subtotal)}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Invalid price warning */}
                    {hasAnyInvalidPrice && (
                      <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        Preço não configurado para algum porte selecionado. Remova o serviço ou entre em contato.
                      </div>
                    )}

                    {/* Summary */}
                    <div className="bg-muted/30 rounded-2xl border border-border p-6 space-y-3">
                      <h4 className="text-base font-semibold text-foreground">Resumo do Agendamento</h4>
                      <div className="flex items-start gap-3">
                        <CalendarDays className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Data</p>
                          <p className="text-sm text-muted-foreground">{selectedDate && formatFullDate(selectedDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Horário</p>
                          <p className="text-sm text-muted-foreground">{selectedTime}</p>
                        </div>
                      </div>
                      {petPriceDetails.map(({ pet, items, subtotal }) => (
                        <div key={pet.id} className="flex items-start gap-3">
                          <Dog className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">🐾 {pet.name} <span className="text-xs text-muted-foreground">({pet.size})</span></p>
                            <p className="text-sm text-muted-foreground">
                              {items.length > 0 ? items.map(i => i.service.name).join(', ') : 'Nenhum serviço selecionado'}
                            </p>
                            {items.length > 0 && (
                              <p className="text-xs font-semibold text-primary mt-0.5">Subtotal: {formatBRL(subtotal)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {address && (
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Local</p>
                            <p className="text-sm text-muted-foreground">{address}</p>
                          </div>
                        </div>
                      )}
                      {/* Total */}
                      <div className="pt-3 border-t border-border flex justify-between items-center">
                        <span className="text-base font-bold text-foreground">Total</span>
                        <span className="text-lg font-bold text-primary">{formatBRL(totalPrice)}</span>
                      </div>
                    </div>

                    {/* Confirm button */}
                    <div className="flex flex-col items-center gap-3">
                      <Button
                        size="lg"
                        className="w-full sm:w-auto px-12"
                        onClick={handleSchedule}
                        disabled={hasAnyInvalidPrice || !hasAnyService}
                      >
                        ✅ Confirmar via WhatsApp
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Um agendamento PENDENTE será criado e você será redirecionado ao WhatsApp
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
