import { WifiOff } from 'lucide-react';
import { usePetshop } from '@/contexts/PetshopContext';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineBanner() {
  const { petshop, loading } = usePetshop();

  const isOffline = !loading && !petshop;

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed bottom-4 left-1/2 z-50 bg-card border border-destructive/30 shadow-lg rounded-full px-5 py-2.5 text-xs lg:text-sm font-medium flex items-center gap-2 text-destructive"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">
            Conexão indisponível — funcionalidades limitadas
          </span>
          <span className="sm:hidden">Sem conexão</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
