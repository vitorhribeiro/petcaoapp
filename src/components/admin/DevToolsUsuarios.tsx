import { useState, useEffect, useCallback, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Shield, Crown, Users, Eye, KeyRound, Copy, Check, Loader2, Mail, Search, Filter, MoreVertical, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { staggerItem, staggerContainer, cardAnimProps } from '@/lib/animations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePageAccess } from '@/hooks/usePageAccess';

interface ProfileWithRole {
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  active: boolean;
  role: AppRole;
  is_pro: boolean;
  created_at: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Shield; glow: string }> = {
  dev: { 
    label: 'DEVELOPER', 
    color: 'text-amber-500 dark:text-amber-400', 
    bg: 'bg-amber-500/10 border-amber-500/20', 
    icon: Crown,
    glow: 'shadow-amber-500/20'
  },
  admin: { 
    label: 'ADMINISTRADOR', 
    color: 'text-sky-500 dark:text-sky-400', 
    bg: 'bg-sky-500/10 border-sky-500/20', 
    icon: Shield,
    glow: 'shadow-sky-500/20'
  },
  midia: { 
    label: 'MÍDIA SOCIAL', 
    color: 'text-violet-500 dark:text-violet-400', 
    bg: 'bg-violet-500/10 border-violet-500/20', 
    icon: Users,
    glow: 'shadow-violet-500/20'
  },
};

// ─── User Card ───
const UserCard = memo(function UserCard({
  user,
  onEdit,
  onViewAccount,
  onChangeRole,
  onDelete,
  availableRoles,
}: {
  user: ProfileWithRole;
  onEdit: () => void;
  onViewAccount: () => void;
  onChangeRole: (role: AppRole) => void;
  onDelete: () => void;
  availableRoles: string[];
}) {
  const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.admin;
  const RoleIcon = cfg.icon;
  const isDev = user.role === 'dev';

  return (
    <motion.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className="h-full">
      <Card className="h-full group transition-all duration-300 border-border/50 hover:border-sky-500/30 hover:shadow-lg hover:shadow-sky-500/5 bg-card/50 backdrop-blur-sm overflow-hidden relative">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* Left Section: Info */}
            <div className="flex items-center gap-4 min-w-0">
              <div className={`w-14 h-14 rounded-2xl ${cfg.bg} flex items-center justify-center shrink-0 ring-1 ring-border/20 group-hover:scale-105 transition-transform duration-300 relative`}>
                <RoleIcon className={`w-6 h-6 ${cfg.color}`} />
              </div>
              
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-foreground text-sm truncate leading-none">{user.name}</h3>
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 font-bold tracking-wider border ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </Badge>
                </div>
                
                {user.email && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="w-3 h-3 shrink-0" />
                    <p className="text-[11px] truncate max-w-[140px] sm:max-w-none">{user.email}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 pt-1">
                  <p className="text-[10px] text-muted-foreground/70">
                    Entrou {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Section: Quick Actions / Menu */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-sky-500/10 hover:text-sky-500 transition-colors"
                  onClick={onViewAccount}
                  title="Ver Detalhes"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                
                {!isDev && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg hover:bg-amber-500/10 hover:text-amber-500 transition-colors" 
                      onClick={onEdit}
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors" 
                      onClick={onDelete}
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
              
              {!isDev && (
                <div className="flex items-center gap-2">
                  <Select value={user.role} onValueChange={(v) => onChangeRole(v as AppRole)}>
                    <SelectTrigger className="w-[100px] h-7 text-[10px] font-bold rounded-md border-border/40 bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map(r => (
                        <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

// ─── Main Component ───
export function DevToolsUsuarios() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ProfileWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editUser, setEditUser] = useState<ProfileWithRole | null>(null);
  const [viewUser, setViewUser] = useState<ProfileWithRole | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<ProfileWithRole | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'admin' as AppRole });
  const [creating, setCreating] = useState(false);
  const { matrix } = usePageAccess();
  const availableRoles = Object.keys(matrix).length > 0 ? Object.keys(matrix) : ['admin', 'midia'];

  const [resetLoading, setResetLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Search and filters
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | AppRole>('all');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from('user_roles')
      .select('*')
      .neq('role', 'cliente');

    if (!roles || roles.length === 0) { setUsers([]); setLoading(false); return; }

    const userIds = roles.map(r => r.user_id);
    const [{ data: profiles }, { data: accounts }] = await Promise.all([
      supabase.from('profiles').select('*').in('user_id', userIds),
      supabase.from('user_accounts').select('id, email').in('id', userIds),
    ]);

    if (profiles) {
      const merged: ProfileWithRole[] = profiles.map((p: { user_id: string; name: string; phone: string | null; avatar_url: string | null; active: boolean; created_at: string }) => {
        const userRole = roles.find((r: { user_id: string; role: string }) => r.user_id === p.user_id);
        const account = accounts?.find((a: { id: string; email: string }) => a.id === p.user_id);
        return {
          user_id: p.user_id,
          name: p.name,
          email: account?.email || null,
          phone: p.phone,
          avatar_url: p.avatar_url,
          active: p.active,
          role: (userRole?.role as AppRole) || 'admin',
          is_pro: false, // Not managed here anymore
          created_at: p.created_at,
        };
      });
      setUsers(merged);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const extractErrorMessage = async (error: any, defaultMessage: string = 'Erro desconhecido') => {
    let msg = error?.message || defaultMessage;
    if (error && 'context' in error && error.context instanceof Response) {
      try {
        const errData = await error.context.clone().json();
        if (errData && errData.error) msg = errData.error;
      } catch (e) {
        try {
          const errText = await error.context.clone().text();
          if (errText) msg = errText;
        } catch (e2) {}
      }
    }
    return msg;
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    if (createForm.password.length < 6) {
      toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }

    setCreating(true);
    const { data, error } = await supabase.functions.invoke('seed-dev-user', {
      body: { action: 'create', email: createForm.email, password: createForm.password, name: createForm.name, role: createForm.role },
    });

    if (error || data?.error) {
      const errorMessage = await extractErrorMessage(error, data?.error);
      toast({ title: 'Erro ao criar usuário', description: errorMessage, variant: 'destructive' });
      setCreating(false);
      return;
    }

    toast({ title: 'Usuário criado com sucesso ✓' });
    fetchUsers();
    setShowCreateDialog(false);
    setCreateForm({ name: '', email: '', password: '', role: 'admin' });
    setCreating(false);
  };

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    if (newRole === 'dev') {
      toast({ title: 'Não é permitido definir role como DEV', variant: 'destructive' });
      return;
    }
    await supabase.from('user_roles').update({ role: newRole as string }).eq('user_id', userId);
    toast({ title: `Role alterado para ${newRole.toUpperCase()}` });
    fetchUsers();
  };

  const updateUserName = async (userId: string, name: string) => {
    await supabase.from('profiles').update({ name }).eq('user_id', userId);
    toast({ title: 'Nome atualizado ✓' });
    fetchUsers();
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke('seed-dev-user', {
      body: { action: 'delete', userId: deleteConfirmUser.user_id },
    });

    if (error || data?.error) {
      const errorMessage = await extractErrorMessage(error, data?.error);
      toast({ title: 'Erro ao remover usuário', description: errorMessage, variant: 'destructive' });
      setDeleting(false);
      return;
    }

    toast({ title: 'Usuário removido completamente' });
    setDeleteConfirmUser(null);
    setDeleting(false);
    fetchUsers();
  };

  const handleResetPassword = async (userId: string) => {
    setResetLoading(true);
    setTempPassword(null);
    const { data, error } = await supabase.functions.invoke('reset-user-password', {
      body: { user_id: userId },
    });

    if (error || data?.error) {
      const errorMessage = await extractErrorMessage(error, data?.error);
      toast({ title: 'Erro ao gerar senha temporária', description: errorMessage, variant: 'destructive' });
      setResetLoading(false);
      return;
    }

    setTempPassword(data.temp_password);
    toast({ title: 'Senha temporária gerada ✓' });
    setResetLoading(false);
  };

  const handleCopyPassword = () => {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    toast({ title: 'Senha copiada!' });
    setTimeout(() => setCopied(false), 2000);
  };

  // Dynamic stats logic
  const statsCards = (() => {
    const roleCounts: Record<string, number> = {};
    users.forEach(u => {
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    });

    const sortedEntries = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]);
    
    const cards = [
      { 
        label: 'Total da Equipe', 
        count: users.length, 
        icon: Users, 
        color: 'text-sky-500', 
        bg: 'bg-sky-500/10 border-sky-500/20', 
        shadow: 'shadow-sky-500/5' 
      }
    ];

    // Add Top 1 and Top 2
    sortedEntries.slice(0, 2).forEach(([role, count]) => {
      const cfg = ROLE_CONFIG[role] || { 
        label: role.toUpperCase(), 
        icon: Shield, 
        color: 'text-slate-500', 
        bg: 'bg-slate-500/10 border-slate-500/20',
        glow: 'shadow-slate-500/5'
      };
      cards.push({ 
        label: cfg.label,
        count,
        icon: cfg.icon,
        color: cfg.color,
        bg: cfg.bg,
        shadow: cfg.glow || 'shadow-sm'
      });
    });

    // Add "Others" if more than 2 roles exist
    if (sortedEntries.length > 2) {
      const othersCount = sortedEntries.slice(2).reduce((acc, curr) => acc + curr[1], 0);
      cards.push({
        label: 'Outros Cargos',
        count: othersCount,
        icon: Filter,
        color: 'text-muted-foreground',
        bg: 'bg-muted/50 border-border/60',
        shadow: 'shadow-sm'
      });
    } else if (cards.length < 4) {
      // Filler if we want exactly 4 cards as requested
      // If we only have 1 or 2 roles total, we can show "Outros" as 0 or just show fewer cards.
      // The user requested 4 cards specifically.
      cards.push({
        label: 'Outros Cargos',
        count: 0,
        icon: Filter,
        color: 'text-muted-foreground',
        bg: 'bg-muted/50 border-border/60',
        shadow: 'shadow-sm'
      });
    }

    return cards;
  })();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      (u.email?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-sky-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Equipe</h2>
          </div>
          <p className="text-[13px] text-muted-foreground pl-10">
            Gerencie as contas administrativas e níveis de acesso do sistema
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)} 
          className="gap-2 rounded-xl shadow-lg shadow-sky-500/20 h-11 px-5 bg-sky-600 hover:bg-sky-500 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span className="font-semibold">Novo Usuário</span>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((s, idx) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="h-full"
            >
              <Card className={`h-full border-border/60 overflow-hidden relative group hover:border-border transition-colors duration-300 ${s.shadow}`}>
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-[0.03] transition-transform duration-500 group-hover:scale-110 ${s.bg.split(' ')[0]}`} />
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center shrink-0 border transition-transform duration-300 group-hover:scale-105`}>
                    <Icon className={`w-6 h-6 ${s.color}`} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-2xl font-bold tracking-tight text-foreground">{s.count}</p>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-2 bg-muted/30 border border-border/40 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input 
            placeholder="Buscar por nome ou email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-background border-none shadow-none rounded-xl focus-visible:ring-1 focus-visible:ring-sky-500/50"
          />
        </div>
        <div className="flex items-center gap-2 px-1">
          <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-xl px-2 h-10">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as AppRole | 'all')}
              className="bg-transparent text-xs font-semibold outline-none border-none pr-4 cursor-pointer text-foreground"
            >
              <option value="all">Todos os Cargos</option>
              {availableRoles.map(r => (
                 <option key={r} value={r}>{r.toUpperCase()}</option>
              ))}
            </select>
          </div>
          {search || filterRole !== 'all' ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setSearch(''); setFilterRole('all'); }}
              className="text-[11px] h-10 px-3 hover:bg-background rounded-xl text-muted-foreground"
            >
              Limpar
            </Button>
          ) : null}
        </div>
      </div>

      {/* Users list */}
      {filteredUsers.length === 0 ? (
        <Card className="border-border/60 border-dashed bg-muted/10">
          <CardContent className="p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-4 border border-border/20">
              <Users className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-base font-semibold text-foreground">Nenhum membro encontrado</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
              {search || filterRole !== 'all' 
                ? "Tente ajustar seus filtros de busca para encontrar o que procura."
                : "Comece adicionando novos membros à sua equipe administrativa."}
            </p>
            {(search || filterRole !== 'all') && (
              <Button 
                variant="outline" 
                onClick={() => { setSearch(''); setFilterRole('all'); }}
                className="mt-6 rounded-xl"
              >
                Limpar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-3.5"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          {filteredUsers.map(u => (
            <UserCard
              key={u.user_id}
              user={u}
              onEdit={() => setEditUser(u)}
              onViewAccount={() => { setViewUser(u); setTempPassword(null); setCopied(false); }}
              onChangeRole={(role) => updateUserRole(u.user_id, role)}
              onDelete={() => setDeleteConfirmUser(u)}
              availableRoles={availableRoles}
            />
          ))}
        </motion.div>
      )}

      {/* ─── Create Dialog ─── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl bg-card/95 backdrop-blur-md p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-sky-600 to-indigo-600 p-6 text-white">
            <DialogTitle className="text-xl font-bold">Criar Novo Membro</DialogTitle>
            <DialogDescription className="text-sky-100/80 text-xs mt-1">
              Adicione um novo administrador ou gestor de mídia à equipe.
            </DialogDescription>
          </div>
          
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Nome completo</Label>
              <div className="relative group">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-sky-500 transition-colors" />
                <Input
                  value={createForm.name}
                  onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: João Silva"
                  className="h-11 rounded-xl bg-muted/30 border-border/40 pl-10 focus-visible:ring-sky-500/30 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">E-mail Corporativo</Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-sky-500 transition-colors" />
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="joao@empresa.com"
                  className="h-11 rounded-xl bg-muted/30 border-border/40 pl-10 focus-visible:ring-sky-500/30 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Senha de Acesso</Label>
                <div className="relative group">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-sky-500 transition-colors" />
                  <Input
                    type="password"
                    value={createForm.password}
                    onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    className="h-11 rounded-xl bg-muted/30 border-border/40 pl-10 focus-visible:ring-sky-500/30 transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Cargo / Nível</Label>
                <Select value={createForm.role} onValueChange={(v) => setCreateForm(p => ({ ...p, role: v as AppRole }))}>
                  <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/40 focus:ring-sky-500/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(r => (
                      <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="p-6 bg-muted/30 border-t border-border/40 flex flex-col-reverse sm:flex-row gap-3">
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className="flex-1 h-11 rounded-xl font-semibold">
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={creating} 
              className="flex-1 h-11 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-lg shadow-sky-500/20 gap-2 transition-all active:scale-95"
            >
              {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando</> : 'Criar Conta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ─── */}
      {editUser && (
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent className="sm:max-w-md border-none shadow-2xl p-0 overflow-hidden bg-card/95 backdrop-blur-md">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white">
              <DialogTitle className="text-xl font-bold">Editar Perfil</DialogTitle>
              <DialogDescription className="text-amber-100/80 text-xs mt-1">
                Atualize as informações básicas do membro da equipe.
              </DialogDescription>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Nome de Exibição</Label>
                <div className="relative group">
                  <Pencil className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
                  <Input
                    value={editUser.name}
                    onChange={e => setEditUser({ ...editUser, name: e.target.value })}
                    placeholder="Nome do usuário"
                    className="h-11 rounded-xl bg-muted/30 border-border/40 pl-10 focus-visible:ring-amber-500/30 transition-all"
                  />
                </div>
              </div>
              
              <div className="flex items-start gap-2 bg-muted/40 p-3 rounded-lg border border-border/40">
                <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Apenas o nome pode ser editado diretamente. Para alterar o e-mail ou cargo, considere remover e criar um novo perfil ou contate o administrador master.
                </p>
              </div>
            </div>

            <div className="p-6 bg-muted/30 border-t border-border/40 flex gap-3">
              <Button variant="ghost" onClick={() => setEditUser(null)} className="flex-1 h-11 rounded-xl font-semibold">
                Cancelar
              </Button>
              <Button 
                onClick={() => { updateUserName(editUser.user_id, editUser.name); setEditUser(null); }} 
                className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-sky-500/20 transition-all active:scale-95"
              >
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── View Account Dialog ─── */}
      {viewUser && (
        <Dialog open={!!viewUser} onOpenChange={() => { setViewUser(null); setTempPassword(null); }}>
          <DialogContent className="sm:max-w-md border-none shadow-2xl p-0 overflow-hidden bg-card/95 backdrop-blur-md">
            <div className={`p-8 ${ROLE_CONFIG[viewUser.role]?.bg || 'bg-muted'} border-b border-border/20 relative overflow-hidden`}>
               {/* Decorative background icon */}
               {(() => { 
                 const Icon = ROLE_CONFIG[viewUser.role]?.icon || Shield; 
                 return <Icon className={`absolute -right-8 -bottom-8 w-40 h-40 opacity-[0.05] ${ROLE_CONFIG[viewUser.role]?.color}`} />;
               })()}

              <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                <div className={`w-20 h-20 rounded-3xl ${ROLE_CONFIG[viewUser.role]?.bg} flex items-center justify-center ring-4 ring-background shadow-xl`}>
                  {(() => { 
                    const Icon = ROLE_CONFIG[viewUser.role]?.icon || Shield; 
                    return <Icon className={`w-10 h-10 ${ROLE_CONFIG[viewUser.role]?.color}`} />; 
                  })()}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-foreground">{viewUser.name}</h3>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge variant="outline" className={`font-bold tracking-widest text-[10px] ${ROLE_CONFIG[viewUser.role]?.bg} ${ROLE_CONFIG[viewUser.role]?.color} border-current/20`}>
                      {ROLE_CONFIG[viewUser.role]?.label || viewUser.role}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'E-mail', value: viewUser.email || '—', icon: Mail },
                  { label: 'Status', value: viewUser.active ? 'Ativo' : 'Inativo', icon: Check },
                  { label: 'Membro desde', value: viewUser.created_at ? formatDistanceToNow(new Date(viewUser.created_at), { addSuffix: true, locale: ptBR }) : '—', icon: Users },
                ].map(item => (
                  <div key={item.label} className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</span>
                    <p className="text-sm font-semibold text-foreground truncate">{item.value}</p>
                  </div>
                ))}
                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Identificador Único (ID)</span>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border/40">
                    <code className="text-[10px] font-mono text-muted-foreground flex-1 truncate">{viewUser.user_id}</code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => { navigator.clipboard.writeText(viewUser.user_id); toast({ title: 'ID copiado' }); }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Password Recovery Section */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-2xl border border-amber-500/20" />
                <div className="relative p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <KeyRound className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Gerenciar Acesso</p>
                      <p className="text-[11px] text-muted-foreground">Segurança e recuperação de conta</p>
                    </div>
                  </div>

                  {tempPassword ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2 p-4 rounded-xl bg-white dark:bg-slate-900 border-2 border-amber-500/30 shadow-inner">
                        <code className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400 flex-1 text-center tracking-wider select-all">
                          {tempPassword}
                        </code>
                        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 hover:bg-amber-500/10" onClick={handleCopyPassword}>
                          {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-amber-500" />}
                        </Button>
                      </div>
                      <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                        <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-medium leading-tight">
                          Esta senha é temporária e será invalidada após o primeiro uso. O usuário deverá definir uma nova senha imediatamente.
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-11 rounded-xl border-amber-500/30 hover:bg-amber-500 hover:text-white transition-all duration-300 font-bold text-xs gap-2"
                      onClick={() => handleResetPassword(viewUser.user_id)}
                      disabled={resetLoading}
                    >
                      {resetLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><KeyRound className="w-4 h-4" /> Gerar Senha Temporária</>}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/30 border-t border-border/40">
              <Button variant="ghost" onClick={() => { setViewUser(null); setTempPassword(null); }} className="w-full h-11 rounded-xl font-bold">
                Fechar Visualização
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Delete Confirmation Dialog ─── */}
      <Dialog open={!!deleteConfirmUser} onOpenChange={() => setDeleteConfirmUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir permanentemente o usuário <strong className="text-foreground">{deleteConfirmUser?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20 text-destructive text-xs">
            Esta ação removerá completamente o perfil, cargo e as credenciais de autenticação. O e-mail ficará livre para ser registrado novamente. Esta ação não pode ser desfeita.
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmUser(null)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />} Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
