import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, MessageSquarePlus, Save, Loader2 } from 'lucide-react';
import { useAdmin } from '@/contexts/AdminContext';
import { ResponsiveModal } from '@/components/modals/ResponsiveModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddReviewModal({ open, onOpenChange }: AddReviewModalProps) {
  const { addReview, refreshReviews } = useAdmin();
  const [name, setName] = useState('');
  const [petName, setPetName] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'aprovado' | 'pendente'>('aprovado');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(''); setPetName(''); setRating(5); setTitle(''); setComment(''); setStatus('aprovado');
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Nome do cliente é obrigatório.'); return; }
    if (!comment.trim()) { toast.error('Comentário é obrigatório.'); return; }
    setSaving(true);
    try {
      await addReview({
        name: name.trim(),
        pet_name: petName.trim() || undefined,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
        moderation_status: status,
      } as any);
      await refreshReviews();
      toast.success('Avaliação criada com sucesso!');
      reset();
      onOpenChange(false);
    } catch {
      toast.error('Erro ao criar avaliação.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleClose}
      title="Nova Avaliação"
      description="Adicione uma avaliação manualmente para o petshop."
      icon={<MessageSquarePlus className="w-5 h-5 text-primary" />}
      maxWidth="max-w-md"
      stickyFooter={
        <Button 
          onClick={handleSave} 
          disabled={saving} 
          className="w-full h-12 text-base font-semibold rounded-xl gap-2 shadow-lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Avaliação
            </>
          )}
        </Button>
      }
    >
      <div className="space-y-5 py-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-muted-foreground">Nome do cliente *</Label>
            <Input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Ex: Maria Silva" 
              className="h-11 text-base rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-muted-foreground">Nome do pet</Label>
            <Input 
              value={petName} 
              onChange={e => setPetName(e.target.value)} 
              placeholder="Ex: Thor" 
              className="h-11 text-base rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground">Nota do cliente *</Label>
          <div className="flex gap-2 p-3 bg-muted/30 rounded-xl border border-border/30 justify-center">
            {[1, 2, 3, 4, 5].map(i => (
              <button 
                key={i} 
                type="button" 
                onClick={() => setRating(i)} 
                className="p-1 transition-transform active:scale-90"
              >
                <Star 
                  className={cn(
                    "w-8 h-8 transition-all duration-200",
                    i <= rating ? "fill-amber-400 text-amber-400 scale-110" : "text-muted-foreground/30"
                  )} 
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-muted-foreground">Título da avaliação</Label>
          <Input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="Ex: Excelente atendimento!" 
            className="h-11 text-base rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-muted-foreground">Comentário *</Label>
          <Textarea 
            value={comment} 
            onChange={e => setComment(e.target.value)} 
            placeholder="Escreva o comentário completo do cliente..." 
            className="min-h-[100px] text-base rounded-xl resize-none" 
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-muted-foreground">Status de publicação</Label>
          <Select value={status} onValueChange={v => setStatus(v as any)}>
            <SelectTrigger className="h-11 rounded-xl text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aprovado">Publicar agora</SelectItem>
              <SelectItem value="pendente">Enviar para moderação</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </ResponsiveModal>
  );
}
