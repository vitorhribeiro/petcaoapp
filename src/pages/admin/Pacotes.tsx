import { useState, useMemo } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { usePetshop } from '@/contexts/PetshopContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package, Plus, XCircle, Search, Phone, Calendar as CalendarIcon,
  RefreshCw, Eye, CalendarPlus, CheckCircle2, Sparkles, Users, PauseCircle,
  Edit2
} from 'lucide-react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ResponsiveModal } from '@/components/modals/ResponsiveModal';
import * as packagesService from '@/services/packagesService';
const emptyPet = { name: '', size: '', breed: '' };

export default function Pacotes() {
  const { settings, updateSettings } = usePetshop();
  const {
    adminPackages, createCustomerPackage, toggleAdminPackageStatus, updateAdminPackage,
    addPreAgendamento, clientProfiles, packageTypes, refreshPackageTypes,
    addPackageType, updatePackageType, deletePackageType
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<'subscriptions' | 'settings'>('subscriptions');

  // Plan Management State
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    type: 'banho',
    interval_days: 7,
    description: '',
    active: true
  });
  const [planPrices, setPlanPrices] = useState({ pequeno: 0, medio: 0, grande: 0 });
  const [planSizes, setPlanSizes] = useState<string[]>(['pequeno', 'medio', 'grande']);
  const [planFeatures, setPlanFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');

  // ... (existing states below)

  // Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneLookupDone, setPhoneLookupDone] = useState(false);
  const [foundTutor, setFoundTutor] = useState<any>(null);
  const [ownerName, setOwnerName] = useState('');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [isAddingNewPet, setIsAddingNewPet] = useState(false);
  const [newPets, setNewPets] = useState<{ name: string; size: string; breed: string }[]>([{ ...emptyPet }]);
  const [packageType, setPackageType] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [observation, setObservation] = useState('');

  // Detail/edit modal
  const [detailPkg, setDetailPkg] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editObs, setEditObs] = useState('');
  const [editStartDate, setEditStartDate] = useState('');

  // Schedule next day modal
  const [schedulePackage, setSchedulePackage] = useState<any>(null);
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [schedService, setSchedService] = useState('Banho do Pacote');

  // Filter
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ATIVO' | 'DESATIVADO'>('todos');

  const filtered = useMemo(() => {
    if (statusFilter === 'todos') return adminPackages;
    return adminPackages.filter(p => p.status === statusFilter);
  }, [adminPackages, statusFilter]);

  const activeCount = adminPackages.filter(p => p.status === 'ATIVO').length;
  const inactiveCount = adminPackages.filter(p => p.status === 'DESATIVADO').length;

  // Phone lookup
  const handlePhoneLookup = () => {
    const tutor = clientProfiles.find(p => p.phone?.replace(/\D/g, '') === phone.replace(/\D/g, ''));
    if (tutor) {
      setFoundTutor(tutor);
      setOwnerName(tutor.name);
      setSelectedPetId((tutor as any).pets?.[0]?.id || '');
      setIsAddingNewPet(false);
      setNewPets([{ ...emptyPet }]);
    } else {
      setFoundTutor(null);
      setOwnerName('');
      setSelectedPetId('');
      setNewPets([{ ...emptyPet }]);
    }
    setPhoneLookupDone(true);
  };

  const resetModal = () => {
    setPhone('');
    setPhoneLookupDone(false);
    setFoundTutor(null);
    setOwnerName('');
    setSelectedPetId('');
    setIsAddingNewPet(false);
    setNewPets([{ ...emptyPet }]);
    setPackageType('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setObservation('');
  };

  const handleActivate = async () => {
    if (!phone || !packageType) {
      toast.error('Preencha telefone e tipo de pacote');
      return;
    }
    if (!foundTutor) {
      toast.error('Por favor, cadastre o cliente antes de criar um pacote.');
      return;
    }
    try {
      await createCustomerPackage({
        customer_id: foundTutor.user_id,
        package_id: packageType,
        pet_id: selectedPetId || undefined,
        start_date: startDate || new Date().toISOString().split('T')[0],
        observation,
      });
      toast.success('Pacote ativado com sucesso!');
      setAddOpen(false);
      resetModal();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao ativar pacote. Verifique os dados.');
    }
  };

  const getNextDate = (pkg: any) => {
    try {
      const start = new Date(pkg.start_date);
      const days = pkg.interval_days || 7;
      const today = new Date();
      let next = new Date(start);
      while (next < today) next = addDays(next, days);
      return format(next, 'dd/MM/yyyy');
    } catch { return '—'; }
  };

  const getNextDateISO = (pkg: any) => {
    try {
      const start = new Date(pkg.start_date);
      const days = pkg.interval_days || 7;
      const today = new Date();
      let next = new Date(start);
      while (next < today) next = addDays(next, days);
      return next.toISOString().split('T')[0];
    } catch { return new Date().toISOString().split('T')[0]; }
  };

  const openScheduleModal = (pkg: any) => {
    setSchedulePackage(pkg);
    setSchedDate(getNextDateISO(pkg));
    setSchedTime('');
    setSchedService('Banho do Pacote');
  };

  const handleScheduleConfirm = () => {
    if (!schedulePackage || !schedDate || !schedTime) {
      toast.error('Preencha data e horário');
      return;
    }
    addPreAgendamento({
      customer_id: schedulePackage.customer_id,
      service_name: schedService || 'Banho do Pacote',
      date: schedDate,
      time: schedTime,
      price: 0,
      origin: 'pacote',
      pets: [{ pet_id: schedulePackage.pet_id, pet_name: 'Pet do Pacote' }]
    });
    toast.success('Agendamento do pacote criado!');
    setSchedulePackage(null);
  };

  const openPlanEdit = (p?: any) => {
    if (p) {
      setEditingPlanId(p.id);
      setPlanForm({
        name: p.name,
        type: p.type || 'banho',
        interval_days: p.interval_days,
        description: p.description || '',
        active: p.active !== false
      });
      const prices = settings.package_prices?.[p.id] || { pequeno: 0, medio: 0, grande: 0 };
      setPlanPrices(prices);
      setPlanSizes(settings.package_sizes?.[p.id] || ['pequeno', 'medio', 'grande']);
      setPlanFeatures(settings.package_features?.[p.id] || []);
    } else {
      setEditingPlanId(null);
      setPlanForm({ name: '', type: 'banho', interval_days: 7, description: '', active: true });
      setPlanPrices({ pequeno: 0, medio: 0, grande: 0 });
      setPlanSizes(['pequeno', 'medio', 'grande']);
      setPlanFeatures([]);
    }
    setPlanModalOpen(true);
  };

  const handleSavePlan = async () => {
    try {
      let packageId = editingPlanId;
      
      const properType = planForm.interval_days === 7 ? 'SEMANAL' : planForm.interval_days === 15 ? 'QUINZENAL' : 'MENSAL';
      const payload = { ...planForm, type: properType };

      if (editingPlanId) {
        await updatePackageType(editingPlanId, payload);
      } else {
        const created = await packagesService.createPackage(payload);
        if (created) {
          packageId = created.id;
          await refreshPackageTypes();
        }
      }

      if (packageId) {
        const newPrices = { ...(settings.package_prices || {}), [packageId]: planPrices };
        const newFeatures = { ...(settings.package_features || {}), [packageId]: planFeatures };
        const newSizes = { ...(settings.package_sizes || {}), [packageId]: planSizes };
        await updateSettings({ package_prices: newPrices, package_features: newFeatures, package_sizes: newSizes });
      }

      toast.success(editingPlanId ? 'Plano atualizado!' : 'Plano criado!');
      setPlanModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar plano');
    }
  };

  const togglePlanDestaque = async (id: string) => {
    const current = settings.package_destaque_ids || [];
    const next = current.includes(id) ? current.filter(i => i !== id) : [...current, id];
    await updateSettings({ package_destaque_ids: next });
    toast.success(current.includes(id) ? 'Removido dos destaques' : 'Adicionado aos destaques');
  };

  const openDetail = (pkg: any) => {
    setDetailPkg(pkg);
    setEditMode(false);
    setEditObs(pkg.observation);
    setEditStartDate(pkg.start_date);
  };

  // ─── Stats ───
  const stats = [
    { label: 'Total', value: adminPackages.length, icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Ativos', value: activeCount, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: activeCount > 0 },
    { label: 'Desativados', value: inactiveCount, icon: PauseCircle, color: 'text-muted-foreground', bg: 'bg-muted' },
    { label: 'Clientes', value: new Set(adminPackages.map(p => p.customer_id)).size, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  // ─── Filter Chips ───
  const filterOptions = [
    { label: 'Todos', value: 'todos' as const },
    { label: 'Ativos', value: 'ATIVO' as const },
    { label: 'Desativados', value: 'DESATIVADO' as const },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* ── Premium Header ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shadow-lg shadow-primary/5">
              <Package className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Gestão de Pacotes</h1>
              <p className="text-sm text-muted-foreground">Assinaturas recorrentes e configurações de planos</p>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-auto">
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="subscriptions" className="rounded-lg px-4 text-xs font-semibold">Assinaturas</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-lg px-4 text-xs font-semibold">Planos & Config.</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'subscriptions' ? (
          <motion.div
            key="subscriptions"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={cn(
                    "border-border/30 bg-card/80 backdrop-blur-sm rounded-2xl transition-all h-full",
                    s.glow && "ring-1 ring-emerald-500/20 border-emerald-500/20"
                  )}>
                    <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-1.5">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                        <s.icon className={cn("w-5 h-5", s.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xl font-bold text-foreground tabular-nums">{s.value}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">{s.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap gap-1.5">
                {filterOptions.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setStatusFilter(o.value)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-all duration-200',
                      statusFilter === o.value
                        ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                        : 'bg-muted/50 backdrop-blur-sm text-muted-foreground border-border/30 hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2 shadow-lg shadow-primary/20 rounded-xl whitespace-nowrap">
                <Plus className="w-4 h-4" /> Ativar Pacote
              </Button>
            </div>

            {/* ── Package Cards ── */}
            <div className="space-y-3">
              {filtered.map((pkg, i) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                >
                  <Card className="border-border/40 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden group">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col gap-4">
                        {/* Top row: info */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Package className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-foreground truncate">
                                  {pkg.customer_name || 'Cliente'} ({pkg.pet_name || 'Pet'})
                                </p>
                                <p className="text-[10px] text-muted-foreground">{pkg.package_name || 'Plano não identificado'}</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] font-bold ml-auto sm:ml-0',
                                  pkg.status === 'ATIVO'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-muted text-muted-foreground border-border/30'
                                )}
                              >
                                {pkg.status === 'ATIVO' ? 'Ativo' : 'Desativado'}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" /> Início: {format(new Date(pkg.start_date), 'dd/MM/yyyy')}
                              </span>
                              {pkg.status === 'ATIVO' && (
                                <span className="flex items-center gap-1 text-primary font-medium">
                                  <RefreshCw className="w-3 h-3" /> Próxima: {getNextDate(pkg)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap border-t border-border/20 pt-3">
                          {pkg.status === 'ATIVO' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl gap-1.5 text-xs h-8"
                              onClick={() => openScheduleModal(pkg)}
                            >
                              <CalendarPlus className="w-3.5 h-3.5" /> Agendar
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs h-8" onClick={() => openDetail(pkg)}>
                            <Eye className="w-3.5 h-3.5" /> Detalhes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "rounded-xl gap-1.5 text-xs h-8 ml-auto",
                              pkg.status === 'ATIVO' ? 'text-destructive hover:text-destructive' : 'text-emerald-600 hover:text-emerald-700'
                            )}
                            onClick={() => toggleAdminPackageStatus(pkg.id)}
                          >
                            {pkg.status === 'ATIVO' ? (
                              <><PauseCircle className="w-3.5 h-3.5" /> Pausar</>
                            ) : (
                              <><RefreshCw className="w-3.5 h-3.5" /> Reativar</>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-16 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                    <Sparkles className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Nenhuma assinatura encontrada</p>
                  <p className="text-xs text-muted-foreground/60">Clique em "Ativar Pacote" para começar.</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Planos Disponíveis</h2>
                <p className="text-sm text-muted-foreground">Configure os planos que aparecerão no site</p>
              </div>
              <Button onClick={() => openPlanEdit()} size="sm" className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" /> Criar Plano
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {packageTypes.map(p => (
                <Card key={p.id} className="border-border/40 overflow-hidden group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base">{p.name}</h3>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{p.interval_days === 7 ? 'Semanal' : p.interval_days === 15 ? 'Quinzenal' : 'Mensal'}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{p.description || 'Sem descrição'}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openPlanEdit(p)} className="h-8 w-8 p-0">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-border/10 pt-4">
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn(
                            "h-8 gap-1.5 text-xs rounded-lg px-2",
                            settings.package_destaque_ids?.includes(p.id) ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground"
                          )}
                          onClick={() => togglePlanDestaque(p.id)}
                        >
                          <Sparkles className={cn("w-3.5 h-3.5", settings.package_destaque_ids?.includes(p.id) && "fill-current")} />
                          {settings.package_destaque_ids?.includes(p.id) ? 'Destaque' : 'Destacar'}
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">Preço Min.</p>
                        <p className="font-black text-primary">R$ {settings.package_prices?.[p.id]?.pequeno || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Package Dialog (Subscription) ── */}
      <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetModal(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ativar Pacote para Cliente</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Telefone do Cliente *</Label>
              <div className="flex gap-2">
                <Input
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setPhoneLookupDone(false); setFoundTutor(null); }}
                  placeholder="Ex: 11999998888"
                  className="h-9 text-sm flex-1"
                  onKeyDown={e => e.key === 'Enter' && handlePhoneLookup()}
                />
                <Button type="button" size="sm" className="h-9" onClick={handlePhoneLookup} disabled={!phone.replace(/\D/g, '')}>
                  <Search className="w-4 h-4 mr-1" /> Buscar
                </Button>
              </div>
            </div>

            {phoneLookupDone && foundTutor && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Cliente encontrado: {foundTutor.name}
                </div>
                
                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Selecione o Plano</Label>
                    <Select value={packageType} onValueChange={setPackageType}>
                      <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {packageTypes.filter(pt => pt.active !== false).map(pt => (
                          <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Selecione o Pet</Label>
                    <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                      <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {foundTutor.pets?.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Observações (Opcional)</Label>
                    <Input 
                      value={observation} 
                      onChange={e => setObservation(e.target.value)}
                      placeholder="Ex: Alérgico a perfume"
                      className="h-10 text-sm rounded-xl"
                    />
                  </div>
                </div>

                <Button onClick={handleActivate} className="w-full rounded-xl h-11 shadow-lg shadow-primary/20">
                  Ativar Pacote
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Plan Configuration Modal ── */}
      <ResponsiveModal
        open={planModalOpen}
        onOpenChange={setPlanModalOpen}
        title={editingPlanId ? "Editar Plano" : "Novo Plano"}
        description="Configure os detalhes e preços do plano recorrente"
        icon={<Package className="w-5 h-5 text-primary" />}
      >
        <div className="space-y-5 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do Plano</Label>
              <Input value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} placeholder="Ex: Pacote Quinzenal" className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Intervalo (Dias)</Label>
              <Select value={String(planForm.interval_days)} onValueChange={v => setPlanForm({ ...planForm, interval_days: Number(v) })}>
                <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Semanal (7 dias)</SelectItem>
                  <SelectItem value="15">Quinzenal (15 dias)</SelectItem>
                  <SelectItem value="30">Mensal (30 dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Input value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} placeholder="Ex: Banho completo com tosa higiênica" className="h-10 rounded-xl" />
          </div>

          {/* Portes */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Portes Atendidos</h4>
            <div className="flex gap-6">
              {['pequeno', 'medio', 'grande'].map(size => (
                <label key={size} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={planSizes.includes(size)} 
                    onChange={e => {
                      if (e.target.checked) setPlanSizes([...planSizes, size]);
                      else setPlanSizes(planSizes.filter(s => s !== size));
                    }} 
                    className="rounded border-primary/30 text-primary focus:ring-primary w-4 h-4"
                  />
                  <span className="capitalize">{size === 'medio' ? 'Médio' : size}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Prices */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Preços por Porte</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase">Pequeno</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input 
                    type="number" 
                    value={planPrices.pequeno} 
                    onChange={e => setPlanPrices({ ...planPrices, pequeno: Number(e.target.value) })}
                    className="h-10 pl-8 rounded-xl" 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase">Médio</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input 
                    type="number" 
                    value={planPrices.medio} 
                    onChange={e => setPlanPrices({ ...planPrices, medio: Number(e.target.value) })}
                    className="h-10 pl-8 rounded-xl" 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase">Grande</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input 
                    type="number" 
                    value={planPrices.grande} 
                    onChange={e => setPlanPrices({ ...planPrices, grande: Number(e.target.value) })}
                    className="h-10 pl-8 rounded-xl" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Benefícios (Checklist)</h4>
            <div className="flex gap-2">
              <Input 
                value={newFeature} 
                onChange={e => setNewFeature(e.target.value)} 
                placeholder="Adicionar benefício..." 
                className="h-10 rounded-xl"
                onKeyDown={e => e.key === 'Enter' && newFeature && (setPlanFeatures([...planFeatures, newFeature]), setNewFeature(''))}
              />
              <Button size="icon" variant="secondary" className="rounded-xl shrink-0" onClick={() => { if (newFeature) { setPlanFeatures([...planFeatures, newFeature]); setNewFeature(''); } }}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {planFeatures.map((f, i) => (
                <Badge key={i} variant="secondary" className="gap-1 px-2 py-1 rounded-lg bg-primary/5 text-primary border-primary/10">
                  {f}
                  <button onClick={() => setPlanFeatures(planFeatures.filter((_, idx) => idx !== i))}><XCircle className="w-3 h-3 hover:text-destructive" /></button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {editingPlanId && (
              <Button 
                variant="outline" 
                className="flex-1 text-destructive hover:text-destructive rounded-xl border-destructive/20"
                onClick={async () => {
                  if (confirm('Excluir este plano definitivamente?')) {
                    await deletePackageType(editingPlanId);
                    setPlanModalOpen(false);
                    toast.success('Plano excluído');
                  }
                }}
              >
                Excluir
              </Button>
            )}
            <Button onClick={handleSavePlan} className="flex-[2] rounded-xl shadow-lg shadow-primary/20">
              Salvar Plano
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      {/* ── Detail Modal (Subscription) ── */}
      <Dialog open={!!detailPkg} onOpenChange={() => setDetailPkg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes da Assinatura</DialogTitle></DialogHeader>
          {detailPkg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-semibold">{detailPkg.customer_name}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-muted-foreground">Telefone</p>
                  <p className="font-semibold">{detailPkg.customer_phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Plano</p>
                  <p className="font-semibold">{detailPkg.package_name}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-muted-foreground">Pet</p>
                  <p className="font-semibold">{detailPkg.pet_name} ({detailPkg.pet_breed})</p>
                </div>
              </div>
              
              <div className="space-y-1.5 pt-2">
                <p className="text-sm text-muted-foreground">Observações</p>
                <p className="text-sm bg-muted/30 p-3 rounded-xl italic">"{detailPkg.observation || 'Nenhuma observação'}"</p>
              </div>

              <div className="pt-4">
                <Button variant="outline" className="w-full rounded-xl" onClick={() => setDetailPkg(null)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Schedule Modal (Subscription) ── */}
      <Dialog open={!!schedulePackage} onOpenChange={() => setSchedulePackage(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agendar do Pacote</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Serviço</Label>
              <Input value={schedService} onChange={e => setSchedService(e.target.value)} placeholder="Ex: Banho do Pacote" />
            </div>
            <Button onClick={handleScheduleConfirm} className="w-full rounded-xl shadow-lg shadow-primary/20">Confirmar Agendamento</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
