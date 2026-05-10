import { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, ChevronLeft, ChevronRight, Trash2, Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toggleLike, getLikesForPhotos } from '@/services/galleryLikesService';
import { PhotoComments } from './PhotoComments';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { createPortal } from 'react-dom';
import { getCommentCountsForPhotos } from '@/services/galleryCommentsService';

interface GalleryImage {
  id: string;
  url: string;
  alt?: string | null;
  caption?: string | null;
  owner_name?: string | null;
  pet_name?: string | null;
  submitted_by_name?: string | null;
  category?: string | null;
  created_at?: string;
}

interface PhotoViewerProps {
  images: GalleryImage[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
  showAdminActions?: boolean;
  onDelete?: (id: string) => void;
}

export function PhotoViewer({ images, initialIndex, open, onClose, showAdminActions, onDelete }: PhotoViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [loaded, setLoaded] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const [likes, setLikes] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [likeAnimating, setLikeAnimating] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const doubleTapRef = useRef<number>(0);
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => { setIndex(initialIndex); }, [initialIndex]);
  useEffect(() => { setLoaded(false); setShowComments(false); setIsEditing(false); }, [index]);

  // Load likes and comment counts
  useEffect(() => {
    if (!open || images.length === 0) return;
    getLikesForPhotos(images.map(i => i.id), user?.id).then(setLikes);
    getCommentCountsForPhotos(images.map(i => i.id)).then(setCommentCounts);
  }, [open, images, user?.id]);

  // Preload next
  useEffect(() => {
    if (!open || index >= images.length - 1) return;
    const next = images[index + 1];
    if (next?.url) { const img = new Image(); img.src = next.url; }
  }, [open, index, images]);

  const goNext = useCallback(() => {
    if (index < images.length - 1) setIndex(i => i + 1);
  }, [index, images.length]);

  const goPrev = useCallback(() => {
    if (index > 0) setIndex(i => i - 1);
  }, [index]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, goNext, goPrev, onClose]);

  const image = images[index];
  if (!image) return null;

  const currentLike = likes[image.id] || { count: 0, liked: false };
  const commentCount = commentCounts[image.id] || 0;

  const handleLike = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Faça login para curtir fotos.');
      return;
    }
    setLikes(prev => ({
      ...prev,
      [image.id]: {
        count: prev[image.id]?.liked ? (prev[image.id]?.count || 1) - 1 : (prev[image.id]?.count || 0) + 1,
        liked: !prev[image.id]?.liked,
      }
    }));
    if (!currentLike.liked) {
      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 600);
    }
    try {
      const result = await toggleLike(image.id, user.id);
      setLikes(prev => ({ ...prev, [image.id]: result }));
    } catch {
      setLikes(prev => ({ ...prev, [image.id]: currentLike }));
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - doubleTapRef.current < 300) {
      if (!currentLike.liked) handleLike();
      else { setLikeAnimating(true); setTimeout(() => setLikeAnimating(false), 600); }
    }
    doubleTapRef.current = now;
  };

  const handleShare = async () => {
    const shareData = {
      title: `PetCão 🐾 ${image.pet_name ? image.pet_name : 'Galeria'}`,
      text: 'Olha essa fofura que encontrei no PetCão 🐾',
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado!');
    }
  };

  const displayName = image.submitted_by_name || image.owner_name || 'PetCão';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const isOfficial = displayName === 'PetCão' || !image.submitted_by_name;
  const timeAgo = image.created_at ? getTimeAgo(image.created_at) : '';

  const renderProfileHeader = (className?: string) => (
    <div className={cn("flex items-center gap-3 px-4 py-3.5 border-b border-border bg-card", className)}>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-xs font-bold shrink-0 ring-2 ring-primary/10">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
          {isOfficial && (
            <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              🐾 Oficial
            </span>
          )}
        </div>
        {timeAgo && <p className="text-xs text-muted-foreground">{timeAgo}</p>}
      </div>
      <div className="flex items-center gap-1">
        {showAdminActions && onDelete && (
          <Button variant="ghost" size="icon" onClick={() => onDelete(image.id)} className="text-muted-foreground hover:text-destructive h-8 w-8 rounded-full">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        {isEditing ? (
          <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)} className="h-8 text-xs font-medium">
            Concluir
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8 rounded-full">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleShare} className="cursor-pointer">Compartilhar</DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copiado!');
                }}
                className="cursor-pointer"
              >
                Copiar link
              </DropdownMenuItem>
              {showAdminActions && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsEditing(true)} className="cursor-pointer">Editar post</DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-muted-foreground">Cancelar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );

  return (
    <>
      {open && !showComments && typeof document !== 'undefined' && createPortal(
        <Button
          variant="outline"
          size="icon"
          onClick={onClose}
          className="hidden md:flex fixed top-5 right-5 md:top-6 md:right-6 z-[9999] rounded-full shadow-xl bg-background/80 hover:bg-accent border-border/50 backdrop-blur-xl transition-all hover:scale-110 active:scale-95 text-foreground cursor-pointer pointer-events-auto"
        >
          <X className="w-5 h-5 md:w-6 md:h-6" />
        </Button>,
        document.body
      )}
      <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-[100vw] md:max-w-5xl w-full h-[100dvh] md:h-[85vh] p-0 border-none rounded-none md:rounded-2xl bg-transparent [&>button]:hidden overflow-hidden shadow-none md:shadow-2xl"
      >
        {/* O botão X agora é renderizado na raiz do documento via Portal */}

        <div className="flex flex-col md:flex-row w-full h-full overflow-y-auto md:overflow-hidden">
          
          {/* ======= MOBILE TOP BAR & PROFILE ======= */}
          <div className="md:hidden flex flex-col bg-card w-full shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
               <button onClick={onClose} className="p-1 -ml-1 active:scale-95 transition-transform text-foreground">
                 <ChevronLeft className="w-6 h-6" />
               </button>
               <span className="font-semibold text-sm">Galeria</span>
               <div className="w-6" />
            </div>
            {renderProfileHeader("border-b-0")}
          </div>

          {/* ======= IMAGE AREA ======= */}
          <div
            className="relative flex-1 flex items-center justify-center bg-transparent min-h-[45dvh] md:min-h-0"
            onClick={handleDoubleTap}
            onPointerDown={(e) => { touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() }; }}
            onPointerUp={(e) => {
              if (!touchStartRef.current) return;
              const dx = e.clientX - touchStartRef.current.x;
              const dy = e.clientY - touchStartRef.current.y;
              const dt = Date.now() - touchStartRef.current.time;
              touchStartRef.current = null;
              if (dt > 500) return;
              if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx)) { onClose(); return; }
              if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) {
                  // Se arrastar da esquerda para direita na primeira foto, fecha.
                  if (index === 0) onClose();
                  else goPrev();
                } else {
                  goNext();
                }
              }
            }}
          >
            {/* Desktop arrows */}
            {index > 0 && (
              <button onClick={e => { e.stopPropagation(); goPrev(); }} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-card/90 hover:bg-card shadow-lg border border-border/30 items-center justify-center transition-all hover:scale-105">
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
            )}
            {index < images.length - 1 && (
              <button onClick={e => { e.stopPropagation(); goNext(); }} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-card/90 hover:bg-card shadow-lg border border-border/30 items-center justify-center transition-all hover:scale-105">
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            )}

            {/* Double-tap heart */}
            {likeAnimating && (
              <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                <Heart className="w-20 h-20 text-red-500 fill-red-500 animate-[heartBounce_0.6s_ease-out_forwards] drop-shadow-lg" />
              </div>
            )}

            {!loaded && <Skeleton className="w-full h-full bg-muted absolute inset-0" />}
            <img
              src={image.url}
              alt={image.alt || ''}
              onLoad={() => setLoaded(true)}
              className={cn(
                'w-full h-full object-cover select-none',
                !loaded && 'opacity-0'
              )}
              draggable={false}
            />

            {/* Pagination indicator - pill style */}
            {images.length > 1 && (
              <div className="absolute bottom-4 inset-x-0 z-20 flex justify-center gap-1 md:hidden pointer-events-none">
                {images.length <= 12 ? images.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 rounded-full transition-all duration-300',
                      i === index ? 'bg-primary w-5' : 'bg-foreground/20 w-1.5'
                    )}
                  />
                )) : (
                  <div className="bg-card/80 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                    {index + 1} / {images.length}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ======= DETAILS SIDEBAR ======= */}
          <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col bg-card md:border-l border-border/30">

            {/* Profile header */}
            {renderProfileHeader("hidden md:flex")}

            {/* Caption (desktop scrollable) */}
            <div className="flex-1 overflow-y-auto px-4 py-3 hidden md:block">
              {(image.caption || image.pet_name) && (
                <p className="text-sm text-foreground leading-relaxed">
                  <span className="font-semibold">{displayName}</span>{' '}
                  {image.caption || ''}
                  {image.pet_name && !image.caption && (
                    <span className="text-muted-foreground">🐾 {image.pet_name}</span>
                  )}
                </p>
              )}
              {image.pet_name && image.caption && (
                <p className="text-xs text-muted-foreground mt-1">🐾 {image.pet_name}</p>
              )}

            </div>

            {/* ======= ACTION BAR ======= */}
            <div className="pt-3 pb-2.5 flex flex-col">
              {/* Desktop inline comments */}
              <div className="px-0 md:px-0 pb-1 hidden md:block">
                <PhotoComments photoId={image.id} isAuthenticated={isAuthenticated} isEditing={isEditing} />
              </div>
              
              {/* Mobile caption (moved above icons) */}
              <div className="md:hidden mt-0 mb-3 px-4">
                {(image.caption || image.pet_name) && (
                  <p className="text-sm text-foreground leading-snug">
                    <span className="font-semibold">{displayName}</span>{' '}
                    {image.caption || ''}
                    {image.pet_name && !image.caption && (
                      <span className="text-muted-foreground">🐾 {image.pet_name}</span>
                    )}
                  </p>
                )}
                {image.pet_name && image.caption && (
                  <p className="text-xs text-muted-foreground mt-0.5">🐾 {image.pet_name}</p>
                )}
              </div>

              <div className="px-4 mt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                  <button
                    onClick={handleLike}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95',
                      currentLike.liked
                        ? 'bg-red-50 dark:bg-red-500/10'
                        : 'hover:bg-muted/60'
                    )}
                  >
                    <Heart
                      className={cn(
                        'w-5 h-5 transition-all duration-200',
                        currentLike.liked
                          ? 'text-red-500 fill-red-500 scale-110'
                          : 'text-foreground'
                      )}
                    />
                    {currentLike.count > 0 && (
                      <span className={cn('text-xs font-semibold', currentLike.liked ? 'text-red-500' : 'text-foreground')}>
                        {currentLike.count}
                      </span>
                    )}
                  </button>

                  <Sheet open={showComments} onOpenChange={setShowComments}>
                    <SheetTrigger asChild>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 md:hidden">
                        <MessageCircle className="w-5 h-5 text-foreground" />
                        {commentCount > 0 && (
                          <span className="text-sm font-medium text-foreground">{commentCount}</span>
                        )}
                      </button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 border-none flex flex-col pt-6 z-[99999]">
                      <div className="flex-1 overflow-y-auto w-full">
                        <PhotoComments photoId={image.id} isAuthenticated={isAuthenticated} isEditing={isEditing} />
                      </div>
                    </SheetContent>
                  </Sheet>

                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95"
                  >
                    <Share2 className="w-5 h-5 text-foreground" />
                  </button>
                </div>

                {/* Counter desktop */}
                {images.length > 1 && (
                  <span className="hidden md:inline text-xs text-muted-foreground">
                    {index + 1} de {images.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}
