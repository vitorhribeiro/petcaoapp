import { Button } from '@/components/ui/button';
import { GoogleIcon } from './GoogleIcon';

interface GoogleButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function GoogleButton({ onClick, loading, disabled }: GoogleButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-[52px] rounded-[14px] text-base gap-3 border-border/60 hover:bg-muted/50 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-white/90"
      onClick={onClick}
      disabled={loading || disabled}
    >
      <GoogleIcon />
      {loading ? 'Conectando...' : 'Continuar com Google'}
    </Button>
  );
}
