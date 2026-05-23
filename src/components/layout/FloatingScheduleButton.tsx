import { CalendarPlus } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';

export function FloatingScheduleButton() {
  const isMobile = useIsMobile();

  const handleAgendarClick = () => {
    const calendarEl = document.getElementById('agenda-wizard') || document.getElementById('agenda');
    if (calendarEl) calendarEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!isMobile) return null;

  return (
    <button
      onClick={handleAgendarClick}
      className="fixed bottom-24 right-4 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 hover:bg-primary/90 transition-all duration-300 active:scale-95 animate-in fade-in slide-in-from-bottom-4"
    >
      <CalendarPlus className="w-5 h-5 animate-pulse" />
      <span className="font-semibold text-sm">Agende Agora</span>
    </button>
  );
}
