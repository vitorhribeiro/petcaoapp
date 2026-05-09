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
  const [likeAnimating, setLikeAnimating] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const doubleTapRef = useRef<number>(0);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => { setIndex(initialIndex); }, [initialIndex]);
  useEffect(() => { setLoaded(false); setShowComments(false); }, [index]);

  // Load likes
  useEffect(() => {
    if (!open || images.length === 0) return;
    getLikesForPhotos(images.map(i => i.id), user?.id).then(setLikes);
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
  const timeAgo = image.created_at ? formatPhotoDate(image.created_at) : '';

  const [isWritingComment, setIsWritingComment] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const toggleComment = () => {
    setIsWritingComment(!isWritingComment);
    if (!isWritingComment) {
      setTimeout(() => commentInputRef.current?.focus(), 100);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[100vw] md:max-w-[95vw] w-full h-[100dvh] md:h-[85vh] p-0 flex flex-col md:flex-row overflow-hidden border-none bg-black md:bg-transparent shadow-2xl [&>button]:hidden">
        
        {/* ======= LEFT COLUMN: IMAGE VIEWER ======= */}
        <div className="relative w-full md:flex-1 bg-black flex items-center justify-center group overflow-hidden select-none aspect-square md:aspect-auto shrink-0 md:shrink">
          {/* Mobile Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 z-50 md:hidden p-2 bg-black/40 backdrop-blur-md rounded-full text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <img
            src={image.url}
            alt={image.alt || 'Visualização da foto'}
            className="w-full h-full md:w-auto md:h-auto md:max-w-full md:max-h-full object-contain animate-in fade-in zoom-in-95 duration-300"
            draggable={false}
            onClick={handleDoubleTap}
          />

          {/* Double-tap heart animation */}
          {likeAnimating && (
            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
              <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-[heartBounce_0.6s_ease-out_forwards] drop-shadow-2xl" />
            </div>
          )}

          {/* Navigation Controls (Desktop only) */}
          {images.length > 1 && (
            <div className="hidden md:block">
              <Button
                variant="ghost" size="icon" onClick={goPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full z-30 h-12 w-12 border border-white/10"
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
              <Button
                variant="ghost" size="icon" onClick={goNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full z-30 h-12 w-12 border border-white/10"
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            </div>
          )}
        </div>

        {/* ======= RIGHT COLUMN: DETAILS SIDEBAR ======= */}
        <div className="flex-1 md:w-[400px] lg:w-[450px] md:h-full flex flex-col bg-card md:border-l border-border/30 relative z-20 overflow-hidden">
          
          {/* 1. Sidebar Header (Desktop) / Mini Header (Mobile) */}
          <div className="flex items-center gap-3 px-4 py-3 md:py-4 border-b border-border/10 shrink-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] md:text-xs font-bold ring-2 ring-primary/5">
              {initials}
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
              {!isOfficial && (
                <p className="text-[10px] md:text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Dono (a) do {image.pet_name || 'Pet'}
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 text-muted-foreground/40 hover:text-foreground hover:bg-muted/80 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Scrollable Content Area: Legend + Comments */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden order-2 md:order-2">
            
            {/* Action Bar (Pinned below header on mobile, at bottom on desktop) */}
            <div className="px-4 py-3 border-b border-border/5 flex items-center justify-between bg-card shrink-0 order-first md:order-none">
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <button onClick={handleLike} className={cn("transition-all active:scale-125", currentLike.liked ? "text-red-500" : "text-muted-foreground hover:text-red-500")}>
                    <Heart className={cn("w-7 h-7 md:w-6 md:h-6", currentLike.liked && "fill-current")} />
                  </button>
                  {timeAgo && <span className="text-[8px] text-muted-foreground/40 font-bold uppercase">{timeAgo}</span>}
                </div>

                <button 
                  onClick={toggleComment}
                  className={cn("p-1 transition-colors", isWritingComment ? "text-primary" : "text-muted-foreground hover:text-primary")}
                >
                  <MessageCircle className="w-7 h-7 md:w-6 md:h-6" />
                </button>

                <button onClick={handleShare} className="text-muted-foreground hover:text-primary transition-colors p-1">
                  <Share2 className="w-7 h-7 md:w-6 md:h-6" />
                </button>

                {currentLike.count > 0 && (
                  <span className="text-sm font-black text-foreground ml-2">{currentLike.count} curtidas</span>
                )}
              </div>
            </div>

            {/* Legend Area (Appears ONLY ONCE right below action bar) */}
            <div className="px-4 py-4 border-b border-border/5 bg-muted/5 shrink-0">
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-bold mr-2 text-foreground">{displayName}</span>
                {image.caption || <span className="text-muted-foreground/40 italic text-xs">Sem legenda</span>}
              </p>
              {image.pet_name && (
                <p className="text-[11px] text-primary font-bold uppercase tracking-tighter mt-1.5 flex items-center gap-1.5">
                  🐾 {image.pet_name}
                </p>
              )}
            </div>

            {/* Comments List Area */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
              <PhotoComments 
                photoId={image.id} 
                isAuthenticated={isAuthenticated} 
                showInput={isWritingComment}
                inputRef={commentInputRef}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatPhotoDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}
