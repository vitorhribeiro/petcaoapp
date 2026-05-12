import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Shield, RotateCcw, Eye, Plus, Trash2, CheckCircle2, Lock, Unlock, Settings2, Info, ChevronRight, UserCircle2, AlertTriangle } from 'lucide-react';
import { usePageAccess, PAGE_LABELS, PageKey } from '@/hooks/usePageAccess';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PAGES = Object.keys(PAGE_LABELS) as PageKey[];

export function DevToolsPermissions() {
  const { matrix, toggleAccess, resetToDefaults, loaded, addRole, removeRole } = usePageAccess();
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [simulateRole, setSimulateRole] = useState<string>('none');
  const [newRoleName, setNewRoleName] = useState('');
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

  const roles = Object.keys(matrix);

  // Auto-select admin if the current selected role is removed
  useEffect(() => {
    if (!matrix[selectedRole] && roles.length > 0) {
      setSelectedRole(roles[0]);
    }
  }, [matrix, selectedRole, roles]);

  const handleReset = async () => {
    await resetToDefaults();
    toast.success('Permissões resetadas para o padrão.');
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;
    const success = await addRole(newRoleName);
    if (success) {
      toast.success(`Cargo "${newRoleName}" criado.`);
      setSelectedRole(newRoleName.toLowerCase().trim());
      setNewRoleName('');
      setIsAddingRole(false);
    } else {
      toast.error('Este cargo já existe.');
    }
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    await removeRole(roleToDelete);
    toast.success(`Cargo "${roleToDelete}" removido permanentemente.`);
    setRoleToDelete(null);
  };

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Sincronizando cargos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto">
      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-xl font-bold">Excluir Cargo?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Você está prestes a excluir o cargo <strong className="text-foreground capitalize">"{roleToDelete}"</strong>. 
              Esta ação é permanente e removerá todos os acessos vinculados a este cargo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="rounded-xl border-none bg-muted hover:bg-muted/80 h-11 px-6 font-medium">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteRole}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 h-11 px-8 font-bold shadow-lg shadow-destructive/20"
            >
              Sim, Excluir Cargo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Controle de Acessos</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestão de Cargos</h2>
          <p className="text-xs text-muted-foreground">Crie cargos e defina quais páginas cada um pode visualizar.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} className="h-9 rounded-xl gap-2 border-border/60 hover:bg-muted/50 transition-all text-xs font-semibold">
          <RotateCcw className="w-3.5 h-3.5" /> Resetar Padrões
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT SIDEBAR: ROLES LIST */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border/20 bg-muted/20 flex items-center justify-between">
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lista de Cargos</span>
               <button 
                 onClick={() => setIsAddingRole(!isAddingRole)}
                 className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
               >
                 <Plus className="w-3.5 h-3.5" />
               </button>
            </div>
            <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {roles.map(role => (
                  <motion.div
                    key={role}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                      selectedRole === role 
                        ? "bg-primary/10 border-primary/20 text-primary" 
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                        selectedRole === role ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"
                      )}>
                        <UserCircle2 className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold capitalize">{role}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {role !== 'admin' && role !== 'midia' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoleToDelete(role);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronRight className={cn("w-4 h-4 opacity-0 transition-all", selectedRole === role ? "opacity-100 translate-x-0" : "group-hover:opacity-40 group-hover:translate-x-1")} />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isAddingRole && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2 pt-4 border-t border-border/10 mt-2 space-y-2"
                >
                  <Input 
                    autoFocus
                    placeholder="Nome do cargo..." 
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="h-9 text-xs rounded-lg bg-background"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={handleAddRole} size="sm" className="flex-1 h-8 text-[11px] font-bold rounded-lg">Criar</Button>
                    <Button onClick={() => setIsAddingRole(false)} variant="ghost" size="sm" className="h-8 text-[11px] rounded-lg">Cancelar</Button>
                  </div>
                </motion.div>
              )}
            </div>
          </Card>

          {/* SIMULATION CARD */}
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/10 pb-3 border-b border-border/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-primary" /> Simular Role
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <Select value={simulateRole} onValueChange={setSimulateRole}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-muted/40 border-none">
                  <SelectValue placeholder="Escolher role..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="dev" className="font-bold text-primary">DEV (Acesso Total)</SelectItem>
                  <SelectItem value="cliente" className="text-muted-foreground">CLIENTE (Área Tutor)</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT CONTENT: PERMISSIONS LIST FOR SELECTED ROLE */}
        <div className="lg:col-span-8">
          <Card className="border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden shadow-xl min-h-[500px]">
            <CardHeader className="bg-muted/30 border-b border-border/20 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 capitalize">
                      Permissões: {selectedRole}
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">Configure as páginas visíveis para este cargo.</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                   <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.15em]">Salvamento Ativo</span>
                   </div>
                   <span className="text-[10px] text-muted-foreground/60 font-mono">ID: {selectedRole.toUpperCase()}</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="divide-y divide-border/10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedRole}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {PAGES.map((page, i) => {
                      const allowed = matrix[selectedRole]?.[page] ?? false;
                      return (
                        <div 
                          key={page}
                          className="flex items-center justify-between px-6 py-4 hover:bg-primary/[0.02] transition-colors group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                              allowed ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground/40"
                            )}>
                              {allowed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                {PAGE_LABELS[page]}
                              </span>
                              <p className="text-[10px] text-muted-foreground/60 font-medium">Acesso à página de {PAGE_LABELS[page].toLowerCase()}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                             <span className={cn(
                               "text-[10px] font-bold uppercase tracking-wider transition-colors",
                               allowed ? "text-emerald-500" : "text-muted-foreground/40"
                             )}>
                               {allowed ? "Habilitado" : "Bloqueado"}
                             </span>
                             <Switch
                               checked={allowed}
                               onCheckedChange={() => toggleAccess(selectedRole, page)}
                               className="data-[state=checked]:bg-emerald-500"
                             />
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </CardContent>

            {/* Empty State / Footer */}
            <div className="p-6 bg-muted/10 border-t border-border/10 flex items-center gap-3">
               <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                 <Info className="w-4 h-4" />
               </div>
               <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                 Dica: Você pode testar instantaneamente as permissões deste cargo usando o seletor de "Simular Role" na lateral.
               </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

