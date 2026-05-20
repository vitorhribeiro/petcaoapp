import { useState, useEffect, useMemo } from 'react';
import { uploadImageToStorage } from '@/lib/storageUtils';
import { validateImageFile } from '@/lib/imageUtils';
import { useNavigate } from 'react-router-dom';
import { useAuth, Pet, Appointment } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAdmin } from '@/contexts/AdminContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useActiveServices } from '@/hooks/useActiveServices';
import { useBranding } from '@/contexts/BrandingContext';
import { getPetshopWhatsAppPhone, openWhatsAppConversation } from '@/lib/whatsapp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ResponsiveModal } from '@/components/modals/ResponsiveModal';
import { TermsModal } from '@/components/modals/TermsModal';
import { PrivacyModal } from '@/components/modals/PrivacyModal';
import logoPetDefault from '@/assets/logopet.webp';
import heroDog from '@/assets/hero-dog.webp';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { toast } from 'sonner';
import { staggerContainer, staggerItem, cardHover, cardTap } from '@/lib/animations';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Edit2, Check, Plus, Dog, Package, Calendar, Clock,
  AlertCircle, CheckCircle2, XCircle, RefreshCw, X, LogOut,
  Home, Star, MessageCircle, ArrowLeft, Crown, Trash2,
  Mail, Phone, Shield, ChevronRight, Bell, CalendarDays, Camera,
  Search, Scissors, Image, ArrowRight, Menu, AlertTriangle, Droplets,
} from 'lucide-react';
import { usePetshop } from '@/contexts/PetshopContext';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { ProfilePageSkeleton } from '@/components/skeletons/ProfilePageSkeleton';
import { Header } from '@/components/layout/Header';
import { useTestModes } from '@/contexts/TestModesContext';
import { GalleryUploadModal } from '@/components/gallery/GalleryUploadModal';
import { PhotoViewer } from '@/components/gallery/PhotoViewer';

const CANCEL_REASONS = [
  'Não vou conseguir comparecer',
  'Pet indisposto',
  'Mudança de planos',
  'Atendimento em outro local',
];

function ProfilePage() {
  const { isAuthenticated, user, appointments, appointmentsLoading, loading: authLoading, logout,
    updateUser, updateUserAvatar, addPet, updatePet, removePet, cancelAppointment,
    refreshPets,
  } = useAuth();
  const { customerPackages, galleryImages = [], addPhoto } = useAdmin();
  const navigate = useNavigate();
  const { clientModeActive } = useTestModes();
  const { branding } = useBranding();
  const { petshop, settings } = usePetshop();
  const { services, loading: servicesLoading } = useActiveServices();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [isAddingPet, setIsAddingPet] = useState(false);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [editPetModalOpen, setEditPetModalOpen] = useState(false);
  const [petForm, setPetForm] = useState<Partial<Pet>>({ name: '', size: 'medio', breed: '' });
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOther, setCancelOther] = useState('');
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  // Novos estados para a galeria e abas
  const [activeTab, setActiveTab] = useState<'pets' | 'agendamentos' | 'dados' | 'galeria'>('pets');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(-1);

  useEffect(() => {
    if (user) refreshPets();
  }, []);

  // Pet care alerts: check days since last bath/appointment per pet
  const petCareAlerts = useMemo(() => {
    if (!user?.pets) return [];
    const now = Date.now();
    return user.pets.map(pet => {
      const petAppointments = appointments
        .filter(a => a.petName === pet.name && a.status === 'realizado')
        .sort((a, b) => new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime());
      const lastDate = petAppointments[0]?.date;
      if (!lastDate) return { pet, daysSince: null, lastService: null };
      const diff = Math.floor((now - new Date(lastDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
      return { pet, daysSince: diff, lastService: petAppointments[0]?.service };
    }).filter(a => a.daysSince === null || a.daysSince >= 21);
  }, [user?.pets, appointments]);

  const myPhotos = useMemo(() => {
    if (!user || !galleryImages) return [];
    return galleryImages.filter(img => img.submitted_by_user_id === user.id);
  }, [galleryImages, user?.id]);

  const isPageLoading = authLoading || appointmentsLoading || servicesLoading;

  if (!isAuthenticated && !authLoading) {
    navigate('/auth/login', { replace: true });
    return null;
  }

  if (isPageLoading) {
    return <ProfilePageSkeleton />;
  }

  const activeCustomerPkg = customerPackages?.find(p => p.customer_id === user?.id && p.status === 'ATIVO');

  const upcomingAppointments = appointments.filter(a => a.status === 'pendente' || a.status === 'confirmado');
  const pastAppointments = appointments.filter(a => a.status === 'realizado' || a.status === 'cancelado' || a.status === 'remarcado');

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  };

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const todayLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pendente': return { icon: AlertCircle, label: 'Pendente', emoji: '🟡', className: 'bg-warning/10 text-warning border-warning/20' };
      case 'confirmado': return { icon: CheckCircle2, label: 'Confirmado', emoji: '🟢', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
      case 'realizado': return { icon: CheckCircle2, label: 'Concluído', emoji: '✅', className: 'bg-primary/10 text-primary border-primary/20' };
      case 'cancelado': return { icon: XCircle, label: 'Cancelado', emoji: '🔴', className: 'bg-destructive/10 text-destructive border-destructive/20' };
      case 'remarcado': return { icon: RefreshCw, label: 'Remarcado', emoji: '🔵', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
      default: return { icon: AlertCircle, label: status, emoji: '⚪', className: '' };
    }
  };

  const handleProfileSave = () => {
    updateUser({ name: profileForm.name, phone: profileForm.phone });
    setIsEditingProfile(false);
    toast.success('Perfil atualizado!');
  };

  const handleQuickSchedule = () => {
    const petName = user?.pets?.[0]?.name;
    const petText = petName ? `o meu pet ${petName}` : 'meu pet';
    const msg = `Olá! Sou ${user?.name || 'cliente do PetCão'} e gostaria de agendar um serviço para ${petText}.`;
    openPetshopWhatsApp(msg);
  };

  const petshopWhatsAppPhone = getPetshopWhatsAppPhone({
    phone: petshop?.phone,
    whatsappUrl: settings?.social_links?.links?.whatsapp_url,
  });

  const openPetshopWhatsApp = (message: string) => {
    if (!openWhatsAppConversation({ phone: petshopWhatsAppPhone, message })) {
      toast.error('Não há WhatsApp cadastrado para o petshop.');
      return false;
    }

    return true;
  };

  const handleConfirmWA = (apt: Appointment) => {
    const msg = `Olá! Gostaria de confirmar o agendamento do pet ${apt.petName} para ${apt.date} às ${apt.time}, serviço ${apt.service}.`;
    openPetshopWhatsApp(msg);
  };

  const handleAlter = (apt: Appointment) => {
    const msg = `Olá! Gostaria de remarcar o agendamento do pet ${apt.petName} que está para ${apt.date} às ${apt.time}, serviço ${apt.service}.`;
    openPetshopWhatsApp(msg);
  };

  const handleCancelClick = (apt: Appointment) => { setCancelTarget(apt); setCancelReason(''); setCancelOther(''); setCancelModalOpen(true); };

  const handleCancelConfirm = () => {
    if (!cancelTarget) return;
    const finalReason = cancelReason === 'outro' ? cancelOther : cancelReason;
    if (!finalReason) { toast.error('Selecione um motivo'); return; }
    cancelAppointment(cancelTarget.id, finalReason);
    const msg = `Olá! Gostaria de cancelar o agendamento do pet ${cancelTarget.petName} marcado para ${cancelTarget.date} às ${cancelTarget.time}.`;
    openPetshopWhatsApp(msg);
    setCancelModalOpen(false);
    toast.success('Cancelamento solicitado');
  };

  const handleDoubt = (apt: Appointment) => {
    const msg = `Olá! Gostaria de tirar uma dúvida sobre os serviços do PetCão.`;
    openPetshopWhatsApp(msg);
  };

  const handleRemovePet = (petId: string) => {
    if (user && user.pets.length <= 1) { toast.error('Você precisa ter pelo menos 1 pet'); return; }
    removePet(petId);
    toast.success('Pet removido');
  };

  const handleAddPet = () => {
    if (!petForm.name || !petForm.size || !petForm.breed) return;
    addPet({ name: petForm.name, size: petForm.size as Pet['size'], breed: petForm.breed, photo_url: petForm.photo_url });
    setIsAddingPet(false);
    setPetForm({ name: '', size: 'medio', breed: '' });
    toast.success('Pet adicionado!');
  };

  const handleEditPetSave = (petId: string) => {
    updatePet(petId, { name: petForm.name, size: petForm.size as Pet['size'], breed: petForm.breed!, photo_url: petForm.photo_url });
    setEditingPetId(null);
    toast.success('Pet atualizado!');
  };

  const startEditPet = (pet: Pet) => { setEditingPetId(pet.id); setPetForm({ name: pet.name, size: pet.size, breed: pet.breed, photo_url: pet.photo_url }); setEditPetModalOpen(true); };
  const getSizeLabel = (size: string) => { switch (size) { case 'pequeno': return 'Pequeno'; case 'medio': case 'Médio': return 'Médio'; case 'grande': return 'Grande'; default: return size; } };

  const quickShortcuts = [
    { label: 'Meus Pets', icon: Dog, color: 'text-secondary', bg: 'bg-secondary/10', action: () => document.getElementById('section-pets')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Agendar', icon: Calendar, color: 'text-primary', bg: 'bg-primary/10', action: () => { navigate('/'); setTimeout(() => document.getElementById('agenda')?.scrollIntoView({ behavior: 'smooth' }), 400); } },
    { label: 'Serviços', icon: Scissors, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', action: () => { navigate('/'); setTimeout(() => document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' }), 400); } },
    { label: 'Galeria', icon: Image, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10', action: () => { navigate('/'); setTimeout(() => document.getElementById('fotos')?.scrollIntoView({ behavior: 'smooth' }), 400); } },
  ];

  // Recommended services (top 4)
  const recommendedServices = services.slice(0, 4);

  const handleUploadSuccess = async (
    photoUrl: string,
    caption: string,
    category?: string,
    extra?: { petName?: string; ownerName?: string }
  ) => {
    if (!user) return;
    try {
      await addPhoto({
        url: photoUrl,
        alt: caption || 'Foto enviada pelo cliente',
        caption,
        category: category || undefined,
        moderation_status: 'pendente',
        submitted_by_name: user.name,
        submitted_by_user_id: user.id,
        source: 'CLIENTE',
        owner_name: extra?.ownerName || user.name,
        pet_name: extra?.petName,
      });
      setUploadOpen(false);
      toast.success('Sua foto foi enviada para moderação e em breve aparecerá aqui e na galeria! 📸');
    } catch (error) {
      console.error('handleUploadSuccess error:', error);
      toast.error('Não foi possível enviar a foto. Tente novamente.');
    }
  };

  const q = searchQuery.toLowerCase().trim();
  const searchResults = q ? {
    pets: (user?.pets || []).filter(p =>
      p.name.toLowerCase().includes(q) || p.breed.toLowerCase().includes(q) || getSizeLabel(p.size).toLowerCase().includes(q)
    ),
    services: services.filter(s =>
      s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)
    ),
  } : null;

  const containerAnim = staggerContainer;
  const itemAnim = staggerItem;

  return (
    <div className="min-h-screen bg-background">
      {/* ═══ HEADER ═══ */}
      {clientModeActive ? (
        <Header />
      ) : (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/60 shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-semibold text-foreground">Área do Cliente</span>
              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <Menu className="w-5 h-5 text-muted-foreground" />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg py-1.5 w-44 z-50">
                      <button onClick={() => { setProfileForm({ name: user?.name || '', phone: user?.phone || '' }); setIsEditingProfile(true); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center gap-2"><Edit2 className="w-3.5 h-3.5" /> Editar perfil</button>
                      <button onClick={() => { setTermsOpen(true); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Termos</button>
                      <button onClick={() => { setPrivacyOpen(true); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Privacidade</button>
                      <div className="border-t border-border my-1" />
                      <button onClick={() => { logout(); navigate('/'); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center gap-2 text-destructive"><LogOut className="w-3.5 h-3.5" /> Sair</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      <motion.main
        className="pt-16 pb-24 lg:pb-8"
        variants={containerAnim}
        initial="hidden"
        animate="visible"
      >
        {/* Banner de Boas-vindas Premium */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1A73E8]/5 via-[#4285F4]/5 to-transparent border-b border-border/40 py-8 px-4 mb-6">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center md:justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
              <div 
                className="relative group cursor-pointer w-20 h-20 rounded-full border-4 border-background bg-card flex items-center justify-center overflow-hidden shadow-lg hover:scale-105 transition-transform duration-300"
                onClick={() => document.getElementById('profile-avatar-upload')?.click()}
              >
                {user?.avatarUrl ? (
                  <OptimizedImage src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" showSkeleton={false} />
                ) : (
                  <User className="w-10 h-10 text-primary" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                  Olá, <span className="bg-gradient-to-r from-[#1A73E8] via-[#4285F4] to-[#FBBC04] bg-clip-text text-transparent">{user?.name?.split(' ')[0]}</span>! 👋
                </h1>
                <p className="text-sm text-muted-foreground mt-1 capitalize">{todayLabel}</p>
              </div>
            </div>
            
            {/* Cards de Métricas Rápidas */}
            <div className="flex flex-col gap-3.5 w-full md:w-auto items-center md:items-end">
              <div className="flex gap-2 sm:gap-3 w-full justify-between sm:justify-start overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                {/* Card 1: Pets */}
                <div 
                  className="flex-1 md:flex-none min-w-[90px] sm:min-w-[120px] md:w-32 h-24 sm:h-28 bg-card border border-border/60 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between items-start shadow-sm cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-300 group"
                  onClick={() => setActiveTab('pets')}
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform duration-300">
                    <Dog className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div>
                    <span className="text-lg sm:text-2xl font-black text-foreground block leading-none">{user?.pets?.length || 0}</span>
                    <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-1 sm:mt-1.5">Pets</p>
                  </div>
                </div>

                {/* Card 2: Próx. Banho */}
                <div 
                  className="flex-1 md:flex-none min-w-[105px] sm:min-w-[130px] md:w-36 h-24 sm:h-28 bg-card border border-border/60 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between items-start shadow-sm cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-300 group"
                  onClick={() => setActiveTab('agendamentos')}
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform duration-300">
                    <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="w-full">
                    <span className="text-[12px] sm:text-[14px] font-black text-foreground block truncate leading-none">
                      {upcomingAppointments.length > 0 ? formatDateShort(upcomingAppointments[0].date) : 'Nenhum'}
                    </span>
                    <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-1 sm:mt-2.5">Próx. Banho</p>
                  </div>
                </div>

                {/* Card 3: Pacote */}
                <div 
                  className={`flex-1 md:flex-none min-w-[90px] sm:min-w-[120px] md:w-32 h-24 sm:h-28 border rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between items-start shadow-sm cursor-pointer transition-all duration-300 group ${
                    activeCustomerPkg 
                      ? 'bg-gradient-to-br from-amber-500/15 via-yellow-500/5 to-card border-amber-500/40 dark:border-amber-500/30 hover:scale-[1.02] shadow-[0_0_15px_rgba(245,158,11,0.06)]' 
                      : 'bg-card border-border/65 hover:border-amber-500/35 hover:shadow-sm'
                  }`}
                  onClick={() => setActiveTab('dados')}
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${
                    activeCustomerPkg 
                      ? 'bg-amber-500 text-white shadow-sm' 
                      : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    <Crown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeCustomerPkg ? 'animate-pulse' : ''}`} />
                  </div>
                  <div className="w-full">
                    <span className={`text-[12px] sm:text-[14px] font-black block truncate leading-none ${
                      activeCustomerPkg ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                    }`}>
                      {activeCustomerPkg ? activeCustomerPkg.package_name || 'Ativo' : 'Nenhum'}
                    </span>
                    <p className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mt-1 sm:mt-2.5 ${
                      activeCustomerPkg ? 'text-amber-700/80 dark:text-amber-400/80' : 'text-muted-foreground'
                    }`}>Pacote</p>
                  </div>
                </div>
              </div>
              
              {/* Botão de Agendar Agora */}
              <Button 
                onClick={handleQuickSchedule}
                className="w-full md:w-auto h-10 px-6 bg-gradient-to-r from-[#1A73E8] to-[#4285F4] hover:from-[#155cb0] hover:to-[#3367d6] text-white font-bold rounded-2xl shadow-sm hover:shadow transition-all duration-300 gap-1.5 text-xs uppercase tracking-wider"
              >
                <CalendarDays className="w-3.5 h-3.5" /> Agendar Agora
              </Button>
            </div>
          </div>
        </div>

        {/* Input Oculto de Upload do Avatar */}
        <input
          id="profile-avatar-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const validation = validateImageFile(file);
            if (!validation.valid) { toast.error(validation.error || 'Arquivo inválido'); e.target.value = ''; return; }
            try {
              toast.loading('Enviando foto de perfil...');
              const { url } = await uploadImageToStorage(file, 'avatars-users', `${user.id}/${Date.now()}`, { quality: 0.85, maxWidth: 400, maxHeight: 400 });
              updateUserAvatar(url);
              toast.dismiss();
              toast.success('Foto de perfil atualizada!');
            } catch {
              toast.dismiss();
              toast.error('Erro ao enviar foto. Tente novamente.');
            }
            e.target.value = '';
          }}
        />

        {/* Navegação por Abas Dashboard */}
        <div className="px-4 max-w-4xl mx-auto mb-8">
          <div className="grid grid-cols-4 p-1 bg-muted/65 dark:bg-muted/30 backdrop-blur rounded-2xl border border-border/40 gap-1">
            {[
              { id: 'pets', label: 'Pets', mobileLabel: 'Pets', icon: Dog },
              { id: 'agendamentos', label: 'Histórico de Agendamento', mobileLabel: 'Histórico', icon: CalendarDays },
              { id: 'dados', label: 'Dados', mobileLabel: 'Dados', icon: User },
              { id: 'galeria', label: 'Galeria', mobileLabel: 'Galeria', icon: Image },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-background text-primary shadow-sm border border-border/40'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden text-[9px] font-bold tracking-tight">
                    {tab.mobileLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conteúdo das Abas com Animação */}
        <div className="px-4 max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'pets' && (
              <motion.div
                key="pets"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Cabeçalho da Aba */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Meus Aumigos 🐾</h2>
                    <p className="text-xs text-muted-foreground">Gerencie seus pets cadastrados</p>
                  </div>
                  <Button size="sm" className="rounded-xl" onClick={() => { setPetForm({ name: '', size: 'medio', breed: '' }); setIsAddingPet(true); }}>
                    <Plus className="w-4 h-4 mr-1.5" /> Adicionar Pet
                  </Button>
                </div>

                {/* Grid de Pets */}
                {user?.pets && user.pets.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {user.pets.map((pet) => (
                      <div
                        key={pet.id}
                        className="bg-card/70 backdrop-blur border border-border/50 rounded-2xl p-4 flex items-center gap-4 relative group hover:shadow-md transition-shadow duration-300"
                      >
                        {/* Foto do Pet com Botão de Upload */}
                        <div 
                          className="relative w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center overflow-hidden border border-border/50 shrink-0 group/photo cursor-pointer"
                          onClick={() => {
                            setEditingPetId(pet.id);
                            setPetForm({ name: pet.name, size: pet.size, breed: pet.breed, photo_url: pet.photo_url });
                            setEditPetModalOpen(true);
                          }}
                        >
                          {pet.photo_url ? (
                            <OptimizedImage src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" showSkeleton={false} />
                          ) : (
                            <Dog className="w-7 h-7 text-secondary" />
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                        </div>

                        {/* Dados do Pet */}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-foreground text-base truncate">{pet.name}</h4>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{pet.breed || 'Sem raça definida'}</p>
                          <div className="flex gap-1.5 mt-2">
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/50 border-border/40 font-medium">
                              Porte {getSizeLabel(pet.size)}
                            </Badge>
                          </div>
                        </div>

                        {/* Ações */}
                        <button
                          onClick={() => startEditPet(pet)}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Card Adicionar Pet Pontilhado */}
                    <button
                      onClick={() => { setPetForm({ name: '', size: 'medio', breed: '' }); setIsAddingPet(true); }}
                      className="bg-card/30 hover:bg-card/50 border-2 border-dashed border-border/60 hover:border-primary/40 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 min-h-[100px] transition-all group"
                    >
                      <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Adicionar novo aumigo</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-card border border-border/40 rounded-2xl p-8 text-center">
                    <Dog className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-foreground">Você ainda não tem nenhum pet cadastrado</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">Adicione o perfil do seu pet para fazer agendamentos rápidos.</p>
                    <Button size="sm" onClick={() => { setPetForm({ name: '', size: 'medio', breed: '' }); setIsAddingPet(true); }}>
                      <Plus className="w-4 h-4 mr-1.5" /> Adicionar Pet
                    </Button>
                  </div>
                )}

                {/* Alertas de Cuidados de Saúde dos Pets */}
                {petCareAlerts.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {petCareAlerts.map(alert => (
                      <div key={alert.pet.id} className="bg-amber-500/5 dark:bg-amber-500/[0.02] border border-amber-500/20 dark:border-amber-500/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                            <Droplets className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              {alert.pet.name} {alert.daysSince !== null ? `está há ${alert.daysSince} dias sem banho` : 'ainda não tomou banho'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">Que tal agendar um banho ou tosa?</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 text-xs rounded-xl border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                          onClick={() => { navigate('/'); setTimeout(() => document.getElementById('agenda')?.scrollIntoView({ behavior: 'smooth' }), 400); }}
                        >
                          Agendar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'agendamentos' && (
              <motion.div
                key="agendamentos"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-foreground">Histórico de Agendamento 📅</h2>
                  <p className="text-xs text-muted-foreground">Acompanhe seus horários marcados e histórico completo de serviços</p>
                </div>

                {/* Próximos Agendamentos */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Próximos Horários
                  </h3>
                  {upcomingAppointments.length === 0 ? (
                    <div className="bg-card/40 border border-border/40 rounded-2xl p-6 text-center">
                      <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum agendamento ativo</p>
                      <Button size="sm" variant="outline" className="mt-3 rounded-xl" onClick={() => { navigate('/'); setTimeout(() => document.getElementById('agenda')?.scrollIntoView({ behavior: 'smooth' }), 400); }}>
                        Agendar Horário
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingAppointments.map(apt => {
                        const sc = getStatusConfig(apt.status);
                        return (
                          <div key={apt.id} className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <CalendarDays className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${sc.className}`}>
                                    {sc.emoji} {sc.label}
                                  </span>
                                  {apt.payment_status === 'paid' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                      Pago 💳
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-bold text-foreground text-sm mt-1">{apt.service}</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">🐾 Pet: <span className="font-semibold text-foreground">{apt.petName}</span></p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(apt.date)}</span>
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {apt.time}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Ações Rápidas */}
                            <div className="flex gap-2 border-t md:border-t-0 border-border/40 pt-3 md:pt-0 shrink-0">
                              {apt.status === 'pendente' && (
                                <Button variant="outline" size="sm" className="text-xs h-9 rounded-xl text-emerald-600 border-emerald-400 hover:bg-emerald-50" onClick={() => handleConfirmWA(apt)}>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirmar
                                </Button>
                              )}
                              <Button variant="outline" size="sm" className="text-xs h-9 rounded-xl" onClick={() => handleAlter(apt)}>
                                <Edit2 className="w-3.5 h-3.5 mr-1" /> Alterar
                              </Button>
                              <Button variant="outline" size="sm" className="text-xs h-9 rounded-xl text-destructive border-destructive/20 hover:bg-destructive/5" onClick={() => handleCancelClick(apt)}>
                                <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Histórico de Agendamentos */}
                {pastAppointments.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> Histórico Completo
                    </h3>
                    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/40">
                      {pastAppointments.map(apt => {
                        const sc = getStatusConfig(apt.status);
                        return (
                          <div key={apt.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm border shrink-0 ${sc.className}`}>{sc.emoji}</span>
                              <div>
                                <p className="text-sm font-bold text-foreground">{apt.service}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{apt.petName} • {formatDateShort(apt.date)} às {apt.time}</p>
                              </div>
                            </div>
                            {apt.status === 'realizado' && (
                              <Button variant="ghost" size="sm" className="rounded-lg h-9 w-9 p-0" onClick={() => handleDoubt(apt)}>
                                <MessageCircle className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'dados' && (
              <motion.div
                key="dados"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-foreground">Meus Dados 👤</h2>
                  <p className="text-xs text-muted-foreground">Gerencie seus dados cadastrais e preferências</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informações Cadastrais */}
                  <div className="bg-card/70 border border-border/50 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" /> Informações do Perfil
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground block">Nome Completo</span>
                        <span className="font-semibold text-foreground block mt-0.5">{user?.name}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Telefone</span>
                        <span className="font-semibold text-foreground block mt-0.5">{user?.phone}</span>
                      </div>
                      {user?.email && (
                        <div>
                          <span className="text-xs text-muted-foreground block">E-mail</span>
                          <span className="font-semibold text-foreground block mt-0.5">{user?.email}</span>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-2 rounded-xl" onClick={() => { setProfileForm({ name: user?.name || '', phone: user?.phone || '' }); setIsEditingProfile(true); }}>
                      <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Editar Cadastro
                    </Button>
                  </div>

                  {/* Preferências de Notificações */}
                  <NotificationPreferences userId={user?.id} />
                </div>

                {/* Termos e Links Legais */}
                <div className="bg-card/30 border border-border/40 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between text-xs text-muted-foreground">
                  <div className="flex gap-4">
                    <button onClick={() => setTermsOpen(true)} className="hover:text-foreground hover:underline font-medium">Termos de Uso</button>
                    <button onClick={() => setPrivacyOpen(true)} className="hover:text-foreground hover:underline font-medium">Política de Privacidade</button>
                  </div>
                  <button onClick={() => { logout(); navigate('/'); }} className="text-destructive font-bold hover:underline flex items-center gap-1">
                    <LogOut className="w-3.5 h-3.5" /> Encerrar Sessão
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'galeria' && (
              <motion.div
                key="galeria"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Título da aba galeria */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Galeria do Cliente 🖼️</h2>
                    <p className="text-xs text-muted-foreground">Suas fotos enviadas e lembranças especiais</p>
                  </div>
                  <Button size="sm" className="rounded-xl gap-1.5" onClick={() => setUploadOpen(true)}>
                    <Camera className="w-4 h-4" /> Enviar Nova Foto
                  </Button>
                </div>

                {/* Lista de Fotos do Cliente */}
                {myPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {myPhotos.map((image, idx) => (
                      <button
                        key={image.id}
                        onClick={() => setViewerIndex(idx)}
                        className="aspect-square bg-muted rounded-2xl overflow-hidden group relative border border-border/40 shadow-sm hover:border-primary/30 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                      >
                        <OptimizedImage
                          src={image.url}
                          alt={image.alt || 'Foto do pet'}
                          aspectRatio="square"
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                        />
                        {/* Indicador de Status de Moderação */}
                        <div className="absolute top-2 left-2 z-10">
                          {image.moderation_status === 'pendente' ? (
                            <Badge className="bg-amber-500/90 text-white border-none text-[9px] px-1.5 py-0.5 backdrop-blur-sm">
                              Em Análise
                            </Badge>
                          ) : image.moderation_status === 'rejeitado' ? (
                            <Badge className="bg-destructive/90 text-white border-none text-[9px] px-1.5 py-0.5 backdrop-blur-sm">
                              Recusada
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/90 text-white border-none text-[9px] px-1.5 py-0.5 backdrop-blur-sm">
                              Publicada
                            </Badge>
                          )}
                        </div>

                        {image.pet_name && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-3">
                            <p className="text-white text-xs font-bold truncate">🐾 {image.pet_name}</p>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-card border border-border/40 rounded-2xl p-8 text-center">
                    <Image className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-foreground">Sua galeria está vazia</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">Envie fotos fofas do seu pet tomando banho, de tosa ou se divertindo!</p>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setUploadOpen(true)}>
                      <Camera className="w-4 h-4 mr-1.5" /> Enviar Primeira Foto
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══ WHATSAPP CONTACT Fixo ═══ */}
        <div className="px-4 py-3 max-w-4xl mx-auto mt-6">
          <button
            onClick={() => openPetshopWhatsApp('Olá! Gostaria de tirar uma dúvida sobre os serviços do PetCão.')}
            className="w-full bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between gap-3 transition-all duration-300 hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">Falar com o petshop</p>
                <p className="text-xs text-muted-foreground">Tire dúvidas ou agende serviços especiais pelo WhatsApp</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </button>
        </div>
      </motion.main>

      {/* EDIT PROFILE MODAL */}
      <ResponsiveModal
        open={isEditingProfile}
        onOpenChange={setIsEditingProfile}
        title="Editar Perfil"
        maxWidth="max-w-sm"
        stickyFooter={
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleProfileSave}><Check className="w-4 h-4 mr-1" /> Salvar</Button>
            <Button variant="outline" className="flex-1" onClick={() => setIsEditingProfile(false)}>Cancelar</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2"><Label>Nome</Label><Input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="h-12 rounded-xl text-base" /></div>
          <div className="space-y-2"><Label>Telefone</Label><Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="h-12 rounded-xl text-base" /></div>
        </div>
      </ResponsiveModal>

      {/* Add Pet Modal */}
      <ResponsiveModal
        open={isAddingPet}
        onOpenChange={setIsAddingPet}
        title="Adicionar Novo Pet"
        maxWidth="max-w-sm"
        stickyFooter={
          <Button className="w-full h-12 rounded-xl text-base font-semibold" onClick={handleAddPet} disabled={!petForm.name || !petForm.breed}><Plus className="w-4 h-4 mr-1" /> Adicionar Pet</Button>
        }
      >
        <div className="space-y-4">
          {/* Pet Photo Upload Container */}
          <div className="flex flex-col items-center gap-2 mb-2">
            <div 
              className="relative group cursor-pointer w-20 h-20 rounded-full border-2 border-primary/20 bg-secondary/10 flex items-center justify-center overflow-hidden shadow-sm"
              onClick={() => document.getElementById('add-pet-photo-upload')?.click()}
            >
              {petForm.photo_url ? (
                <img src={petForm.photo_url} className="w-full h-full object-cover" />
              ) : (
                <Dog className="w-9 h-9 text-secondary" />
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </div>
            <input 
              id="add-pet-photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const validation = validateImageFile(file);
                if (!validation.valid) { toast.error(validation.error || 'Arquivo inválido'); return; }
                try {
                  toast.loading('Enviando foto do pet...');
                  const { url } = await uploadImageToStorage(file, 'avatars-users', `pets/new-${Date.now()}`, { quality: 0.8, maxWidth: 350, maxHeight: 350 });
                  setPetForm(p => ({ ...p, photo_url: url }));
                  toast.dismiss();
                  toast.success('Foto do pet carregada!');
                } catch {
                  toast.dismiss();
                  toast.error('Erro ao enviar foto.');
                }
              }}
            />
            <span className="text-xs text-muted-foreground font-medium">Foto do pet</span>
          </div>

          <div className="space-y-2"><Label>Nome do Pet</Label><Input value={petForm.name} onChange={(e) => setPetForm({ ...petForm, name: e.target.value })} placeholder="Ex: Rex" className="h-12 rounded-xl text-base" /></div>
          <div className="space-y-2"><Label>Porte</Label><Select value={petForm.size} onValueChange={(v) => setPetForm({ ...petForm, size: v })}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pequeno">Pequeno</SelectItem><SelectItem value="medio">Médio</SelectItem><SelectItem value="grande">Grande</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Raça</Label><Input value={petForm.breed} onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })} placeholder="Ex: SRD, Labrador..." className="h-12 rounded-xl text-base" /></div>
        </div>
      </ResponsiveModal>

      {/* Edit Pet Modal */}
      <ResponsiveModal
        open={editPetModalOpen}
        onOpenChange={(v) => { setEditPetModalOpen(v); if (!v) setEditingPetId(null); }}
        title="Editar Pet"
        maxWidth="max-w-sm"
        stickyFooter={
          <div className="flex flex-col gap-2">
            <Button className="w-full h-12 rounded-xl text-base font-semibold" onClick={() => { if (editingPetId) { handleEditPetSave(editingPetId); setEditPetModalOpen(false); } }}><Check className="w-4 h-4 mr-1" /> Salvar</Button>
            <Button variant="outline" className="w-full h-10 rounded-xl text-sm text-destructive hover:text-destructive" onClick={() => { if (editingPetId) { handleRemovePet(editingPetId); setEditPetModalOpen(false); } }}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover pet
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Pet Photo Upload Container */}
          <div className="flex flex-col items-center gap-2 mb-2">
            <div 
              className="relative group cursor-pointer w-20 h-20 rounded-full border-2 border-primary/20 bg-secondary/10 flex items-center justify-center overflow-hidden shadow-sm"
              onClick={() => document.getElementById('edit-pet-photo-upload')?.click()}
            >
              {petForm.photo_url ? (
                <img src={petForm.photo_url} className="w-full h-full object-cover" />
              ) : (
                <Dog className="w-9 h-9 text-secondary" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </div>
            <input 
              id="edit-pet-photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const validation = validateImageFile(file);
                if (!validation.valid) { toast.error(validation.error || 'Arquivo inválido'); return; }
                try {
                  toast.loading('Enviando foto do pet...');
                  const { url } = await uploadImageToStorage(file, 'avatars-users', `pets/${editingPetId || 'new'}-${Date.now()}`, { quality: 0.8, maxWidth: 350, maxHeight: 350 });
                  setPetForm(p => ({ ...p, photo_url: url }));
                  toast.dismiss();
                  toast.success('Foto do pet carregada!');
                } catch {
                  toast.dismiss();
                  toast.error('Erro ao enviar foto.');
                }
              }}
            />
            <span className="text-xs text-muted-foreground font-medium">Foto do pet</span>
          </div>

          <div className="space-y-2"><Label>Nome do Pet</Label><Input value={petForm.name} onChange={(e) => setPetForm({ ...petForm, name: e.target.value })} className="h-12 rounded-xl text-base" /></div>
          <div className="space-y-2"><Label>Porte</Label><Select value={petForm.size} onValueChange={(v) => setPetForm({ ...petForm, size: v })}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pequeno">Pequeno</SelectItem><SelectItem value="medio">Médio</SelectItem><SelectItem value="grande">Grande</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Raça</Label><Input value={petForm.breed} onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })} className="h-12 rounded-xl text-base" /></div>
        </div>
      </ResponsiveModal>

      {/* Gallery Modals */}
      <GalleryUploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSubmit={handleUploadSuccess}
        isAdmin={false}
      />

      <PhotoViewer
        images={myPhotos}
        initialIndex={viewerIndex}
        open={viewerIndex >= 0}
        onClose={() => setViewerIndex(-1)}
        showAdminActions={false}
      />

      {/* Cancel Modal */}
      <ResponsiveModal open={cancelModalOpen} onOpenChange={setCancelModalOpen} title="Cancelar Agendamento" maxWidth="max-w-sm">
        <div className="space-y-4">
          {cancelTarget && (
            <div className="p-3 bg-muted/50 rounded-xl text-sm space-y-0.5">
              <p><span className="font-medium">Serviço:</span> {cancelTarget.service}</p>
              <p><span className="font-medium">Pet:</span> {cancelTarget.petName}</p>
              <p><span className="font-medium">Data:</span> {cancelTarget.date} às {cancelTarget.time}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Qual o motivo do cancelamento?</Label>
            <RadioGroup value={cancelReason} onValueChange={setCancelReason}>
              {CANCEL_REASONS.map(reason => (
                <div key={reason} className="flex items-center gap-2"><RadioGroupItem value={reason} id={reason} /><Label htmlFor={reason} className="text-sm cursor-pointer">{reason}</Label></div>
              ))}
              <div className="flex items-center gap-2"><RadioGroupItem value="outro" id="outro" /><Label htmlFor="outro" className="text-sm cursor-pointer">Outro</Label></div>
            </RadioGroup>
            {cancelReason === 'outro' && <Input placeholder="Descreva o motivo..." value={cancelOther} onChange={(e) => setCancelOther(e.target.value)} className="mt-2 h-12 rounded-xl text-base" />}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setCancelModalOpen(false)}>Voltar</Button>
            <Button variant="destructive" className="flex-1" onClick={handleCancelConfirm} disabled={!cancelReason || (cancelReason === 'outro' && !cancelOther)}>Confirmar</Button>
          </div>
        </div>
      </ResponsiveModal>

      <TermsModal open={termsOpen} onOpenChange={setTermsOpen} />
      <PrivacyModal open={privacyOpen} onOpenChange={setPrivacyOpen} />
    </div>
  );
}

/* ─── Notification Preferences Component ─── */
function NotificationPreferences({ userId }: { userId?: string }) {
  const [prefs, setPrefs] = useState({
    notifications_enabled: true,
    notify_agendamentos: true,
    notify_fotos_avaliacoes: true,
    notify_pacotes: true,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('notifications_enabled')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs(p => ({ ...p, notifications_enabled: data.notifications_enabled ?? true }));
        }
        setLoaded(true);
      });
  }, [userId]);

  const updatePref = async (key: string, value: boolean) => {
    setPrefs(p => ({ ...p, [key]: value }));
    if (!userId) return;
    if (key === 'notifications_enabled') {
      await supabase.from('profiles').update({ notifications_enabled: value } as any).eq('user_id', userId);
    }
    toast.success(value ? 'Preferência ativada' : 'Preferência desativada');
  };

  const items = [
    { key: 'notifications_enabled', label: 'Receber notificações', desc: 'Ativa ou desativa todas', icon: Bell },
    { key: 'notify_agendamentos', label: 'Agendamentos', desc: 'Confirmações e alterações', icon: CalendarDays },
    { key: 'notify_fotos_avaliacoes', label: 'Fotos e avaliações', desc: 'Aprovações de conteúdo', icon: Camera },
    { key: 'notify_pacotes', label: 'Pacotes', desc: 'Ativação e vencimento', icon: Package },
  ];

  if (!loaded) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <Bell className="w-4 h-4 text-primary" /> Notificações
      </h3>
      <div className="space-y-1">
        {items.map(item => {
          const Icon = item.icon;
          const isMain = item.key === 'notifications_enabled';
          const disabled = !isMain && !prefs.notifications_enabled;
          return (
            <div
              key={item.key}
              className={`flex items-center justify-between py-3 px-1 ${!isMain ? 'border-t border-border/50' : ''} ${disabled ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              <Switch
                checked={(prefs as any)[item.key]}
                onCheckedChange={v => updatePref(item.key, v)}
                disabled={disabled}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SafeProfilePage() {
  return (
    <ErrorBoundary>
      <ProfilePage />
    </ErrorBoundary>
  );
}
