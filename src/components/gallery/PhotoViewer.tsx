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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  onEdit?: (image: GalleryImage) => void;
}

export function PhotoViewer({ images, initialIndex, open, onClose, showAdminActions, onDelete, onEdit }: PhotoViewerProps) {
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
  const isAdmin = user?.role === 'admin' || showAdminActions;

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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8 rounded-full">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[32px] border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold">Excluir esta foto?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  Esta ação removerá permanentemente a imagem da galeria. Você tem certeza?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="my-4 aspect-video rounded-2xl overflow-hidden border border-border/20">
                 <img src={image.url} className="w-full h-full object-cover" alt="" />
              </div>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="rounded-2xl border-none bg-muted/50 hover:bg-muted font-semibold">Voltar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20"
                  onClick={() => onDelete(image.id)}
                >
                  Confirmar Exclusão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
                  <DropdownMenuItem onClick={() => onEdit?.(image)} className="cursor-pointer">Editar Foto</DropdownMenuItem>
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
          <div className="md:hidden flex items-center justify-between px-5 py-4 bg-card shrink-0">
             <div className="w-8" />
             <div className="w-8 h-1 rounded-full bg-muted/40" />
             <button 
               onClick={onClose} 
               className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/30 text-foreground active:scale-90 transition-all"
             >
               <X className="w-4 h-4" />
             </button>
          </div>
          <div className="md:hidden bg-card shrink-0">
            {renderProfileHeader("border-b-0 pt-0")}
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
              
              // Removido o fechamento por arraste vertical (dy) a pedido do usuário
              // if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx)) { onClose(); return; }
              
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
          <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col bg-card md:border-l border-border/30 overflow-hidden">
            {/* Desktop Profile header */}
            {renderProfileHeader("hidden md:flex shrink-0 border-b border-border/5")}

            {/* Scrollable Area (Caption + Comments List) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar hidden md:block">
              {/* Caption Section */}
              {(image.caption || image.pet_name) && (
                <div className="px-5 py-5 border-b border-border/5">
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0 mt-0.5">
                      {displayName[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">
                        <span className="font-bold text-foreground mr-2">{displayName}</span>
                        <span className="text-foreground/90 whitespace-pre-wrap break-words">{image.caption || ''}</span>
                      </p>
                      {image.pet_name && (
                        <p className="text-[11px] text-muted-foreground mt-2 font-medium flex items-center gap-1.5">
                          <span className="opacity-50">🐾</span> {image.pet_name}
                        </p>
                      )}
                      {timeAgo && (
                        <p className="text-[10px] text-muted-foreground/50 mt-2 font-medium uppercase tracking-wider">{timeAgo}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Comments List (No Input) */}
              <div className="min-h-[100px]">
                <PhotoComments photoId={image.id} isAuthenticated={isAuthenticated} isEditing={isAdmin} hideInput={true} />
              </div>
            </div>

            {/* ======= BOTTOM FIXED AREA (Desktop: Actions + Input / Mobile: Actions) ======= */}
            <div className="shrink-0 flex flex-col border-t border-border/5 bg-card">
              
              {/* Mobile Only: Caption moved above actions */}
              <div className="md:hidden mt-3 mb-3 px-4">
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

            {/* Interaction Bar (Likes, Share, etc.) */}
            <div className="shrink-0 border-t border-border/5 bg-card px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-5">
                  <button onClick={handleLike} className="group flex items-center gap-1.5 transition-all active:scale-125">
                    <Heart className={cn("w-6 h-6", currentLike.liked ? "fill-red-500 text-red-500" : "text-foreground hover:text-red-400")} />
                    {currentLike.count > 0 && (
                      <span className={cn('text-sm font-bold', currentLike.liked ? 'text-red-500' : 'text-foreground')}>
                        {currentLike.count}
                      </span>
                    )}
                  </button>
                  <button onClick={handleShare} className="active:scale-125 transition-all">
                    <Share2 className="w-6 h-6 text-foreground hover:text-primary" />
                  </button>

                  {/* Mobile Comment Button (Opens Sheet) */}
                  <Sheet open={showComments} onOpenChange={setShowComments}>
                    <SheetTrigger asChild>
                      <button className="md:hidden active:scale-125 transition-all">
                        <MessageCircle className="w-6 h-6 text-foreground" />
                      </button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[85vh] rounded-t-[32px] p-0 border-none flex flex-col z-[99999] bg-card overflow-hidden [&>button]:hidden">
                      <PhotoComments 
                        photoId={image.id} 
                        isAuthenticated={isAuthenticated} 
                        isEditing={isAdmin} 
                        isMobile={true} 
                        onMobileClose={() => setShowComments(false)} 
                      />
                    </SheetContent>
                  </Sheet>
                </div>
                {images.length > 1 && (
                  <span className="text-[10px] font-bold text-muted-foreground/30 tracking-widest uppercase">
                    {index + 1} de {images.length}
                  </span>
                )}
              </div>
            </div>

            {/* Desktop Only: Fixed Input Area */}
            <div className="hidden md:block shrink-0 border-t border-border/5 bg-card">
              <PhotoComments photoId={image.id} isAuthenticated={isAuthenticated} isEditing={isAdmin} hideList={true} />
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
