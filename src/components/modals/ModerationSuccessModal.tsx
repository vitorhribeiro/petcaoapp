import { Button } from '@/components/ui/button';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveModal } from '@/components/modals/ResponsiveModal';

interface ModerationSuccessModalProps {
  open: boolean;
  onClose: () => void;
  type?: 'foto' | 'avaliação';
}

export function ModerationSuccessModal({ open, onClose, type = 'foto' }: ModerationSuccessModalProps) {
  return (
    <ResponsiveModal 
      open={open} 
      onOpenChange={v => { if (!v) onClose(); }}
      title="Enviado com sucesso"
      hideHeader
      stickyFooter={
        <Button onClick={onClose} className="w-full rounded-xl h-12 text-base font-semibold gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4" />
          Ok, entendi
        </Button>
      }
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center px-4 py-6"
          >
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mb-6 shadow-inner">
              <ShieldCheck className="w-10 h-10 text-emerald-500" />
            </div>

            <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
              Conteúdo em análise
            </h3>

            <p className="text-base text-muted-foreground mb-2 leading-relaxed">
              Sua {type} será revisada pela nossa equipe antes de aparecer na galeria.
            </p>

            <div className="bg-muted/30 rounded-2xl p-4 border border-border/30 w-full mt-2">
              <p className="text-sm text-muted-foreground font-medium">
                Assim que aprovado, o conteúdo ficará visível para todos os clientes.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ResponsiveModal>
  );
}

