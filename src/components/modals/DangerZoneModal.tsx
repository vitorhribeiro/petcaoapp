import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Trash2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PETSHOP_ID } from '@/lib/constants';
import { toast } from 'sonner';

interface DangerZoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'delete_all_clients' | 'reset_all';
  onSuccess?: () => void;
}

const ACTION_CONFIG = {
  delete_all_clients: {
    title: 'Apagar todos os clientes',
    description: 'Esta ação irá excluir permanentemente TODOS os clientes (role "cliente"), incluindo seus agendamentos, pets, avaliações, fotos e dados associados. Usuários ADMIN, MÍDIA e DEV NÃO serão afetados.',
    confirmWord: 'EXCLUIR CLIENTES',
    icon: Trash2,
    buttonText: 'Apagar todos os clientes',
  },
  reset_all: {
    title: 'Começar do Zero',
    description: 'Esta ação irá APAGAR TUDO: todos os usuários (exceto DEV), agendamentos, pets, avaliações, fotos, despesas e logs. Somente a conta DEV e configurações do petshop serão mantidas.',
    confirmWord: 'COMEÇAR DO ZERO',
    icon: RotateCcw,
    buttonText: 'Resetar tudo',
  },
};

export function DangerZoneModal({ open, onOpenChange, action, onSuccess }: DangerZoneModalProps) {
  const config = ACTION_CONFIG[action];
  const Icon = config.icon;

  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = reason.trim().length >= 3 && password && confirmText === config.confirmWord;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('danger-zone-actions', {
        body: { action, reason: reason.trim(), dev_password: password, petshop_id: PETSHOP_ID },
      });

      if (error) {
        toast.error(error.message || 'Erro ao executar ação.');
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(data?.message || 'Ação concluída com sucesso!');
        setReason('');
        setPassword('');
        setConfirmText('');
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> {config.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
            <strong>⚠️ ATENÇÃO:</strong> {config.description}
          </div>
          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Descreva o motivo..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Senha da conta DEV *</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Digite sua senha"
            />
          </div>
          <div className="space-y-2">
            <Label>
              Digite <span className="font-bold text-destructive">{config.confirmWord}</span> para confirmar
            </Label>
            <Input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={config.confirmWord}
              className="font-mono"
            />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="gap-2"
          >
            <Icon className="w-4 h-4" />
            {loading ? 'Processando...' : config.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
