import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCommentsForPhoto, addComment, deleteComment, getCommentLikes, toggleCommentLike, type GalleryComment } from '@/services/galleryCommentsService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Send, Trash2, Smile, Heart, MessageSquare, Loader2, Reply, X, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
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

const COMMON_EMOJIS = ['🐶', '🐱', '🐾', '❤️', '😍', '👏', '🙌', '🦴'];

interface Props {
  photoId: string;
  isAuthenticated: boolean;
  isEditing?: boolean;
  isMobile?: boolean;
  onMobileClose?: () => void;
  hideInput?: boolean;
  hideList?: boolean;
}

export function PhotoComments({ 
  photoId, 
  isAuthenticated, 
  isEditing, 
  isMobile, 
  onMobileClose,
  hideInput,
  hideList
}: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<GalleryComment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [likes, setLikes] = useState<Record<string, { count: number; likedByMe: boolean }>>({});
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoaded(false);
    setShowAll(false);
    getCommentsForPhoto(photoId).then(c => {
      setComments(c);
      setLoaded(true);
      if (c.length > 0) {
        getCommentLikes(c.map(cmt => cmt.id)).then(setLikes);
      }
    });
  }, [photoId]);

  const handleSubmit = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Faça login para comentar.');
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > 500) {
      toast.error('Comentário muito longo (máx. 500 caracteres).');
      return;
    }
    setSending(true);
    const result = await addComment(photoId, user.id, user.name, user.avatarUrl || null, trimmed);
    if (result) {
      setComments(prev => [...prev, result]);
      setText('');
      // Scroll to bottom after comment
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    } else {
      toast.error('Erro ao enviar comentário.');
    }
    setSending(false);
  };

  const handleDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    const success = await deleteComment(commentToDelete);
    if (success) {
      setComments(prev => prev.filter(c => c.id !== commentToDelete));
      toast.success('Comentário excluído.');
    } else {
      toast.error('Erro ao excluir comentário.');
    }
    setCommentToDelete(null);
  };

  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated || !user) {
      toast.error('Faça login para curtir.');
      return;
    }
    
    setLikes(prev => {
      const current = prev[commentId] || { count: 0, likedByMe: false };
      return {
        ...prev,
        [commentId]: {
          count: current.likedByMe ? Math.max(0, current.count - 1) : current.count + 1,
          likedByMe: !current.likedByMe
        }
      };
    });

    const result = await toggleCommentLike(commentId, user.id);
    if (!result.success) {
      toast.error('Erro ao curtir comentário.');
    }
  };

  const visible = (isMobile || showAll) ? comments : comments.slice(0, 3);
  const hasMore = comments.length > 3 && !showAll && !isMobile;

  const renderComment = (c: GalleryComment) => {
    const initials = (c.user_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return (
      <div key={c.id} className="flex gap-3 items-start group animate-in fade-in slide-in-from-bottom-2 duration-300">
        {c.user_avatar_url ? (
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-1 ring-1 ring-border/10">
            <OptimizedImage src={c.user_avatar_url} alt={c.user_name || ''} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0 mt-1 ring-1 ring-primary/5">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] md:text-sm leading-snug">
                <span className="font-bold text-foreground mr-1.5">{c.user_name || 'Usuário'}</span>
                <span className="text-foreground/90 whitespace-pre-wrap break-words">{c.comment_text}</span>
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-[11px] text-muted-foreground/60 font-medium">
                  {getTimeAgo(c.created_at)}
                </span>
                {likes[c.id]?.count > 0 && (
                  <span className="text-[11px] text-muted-foreground font-bold">
                    {likes[c.id].count} {likes[c.id].count === 1 ? 'curtida' : 'curtidas'}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 -mr-2 shrink-0">
              <button 
                onClick={() => handleLikeComment(c.id)}
                className={cn(
                  "p-2 transition-all active:scale-75",
                  likes[c.id]?.likedByMe ? "text-red-500" : "text-muted-foreground/30 hover:text-muted-foreground/50"
                )}
              >
                <Heart 
                  className={cn("w-3.5 h-3.5 transition-all", likes[c.id]?.likedByMe ? "fill-red-500" : "")} 
                />
              </button>

              {isEditing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="p-2 text-muted-foreground/30 hover:text-destructive transition-all active:scale-75"
                      title="Excluir comentário"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[400px] rounded-[32px] border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-lg font-bold flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Excluir comentário?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-sm">
                        Esta ação não pode ser desfeita. O comentário será removido permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                      <AlertDialogCancel className="rounded-2xl border-none bg-muted/50 hover:bg-muted font-semibold">Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20"
                        onClick={() => {
                          confirmDeleteComment();
                        }}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isMobile) {
    return (
      <div className={cn("px-4 flex flex-col", !hideList && "pb-3")}>
        {/* Desktop Sidebar View */}
        {!hideList && (
          <>
            {loaded && comments.length > 0 && (
              <div className={cn("space-y-5 mb-4 pr-2 custom-scrollbar")}>
                {visible.map(renderComment)}
                {hasMore && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1.5 mt-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Ver todos os {comments.length} comentários
                  </button>
                )}
              </div>
            )}

            {loaded && comments.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-30">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <p className="text-[13px] text-muted-foreground font-medium px-8 text-center leading-relaxed">
                  Nenhum comentário ainda.<br/>Seja o primeiro a comentar!
                </p>
              </div>
            )}
          </>
        )}

        {!hideInput && (
          <div className={cn("pb-4", !hideList && "border-t border-border/40 -mx-4 pt-4 mt-2")}>

            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                {user && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0 ring-1 ring-primary/5">
                    {user.avatarUrl ? (
                      <OptimizedImage src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      user.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                    )}
                  </div>
                )}
                <div className="flex-1 flex items-center gap-2 bg-muted/30 rounded-2xl pl-3 pr-2 py-2 border border-border/20 focus-within:border-primary/30 transition-all">
                  <input
                    type="text"
                    placeholder="Escreva um comentário..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                    disabled={sending}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={sending || !text.trim()}
                    className="text-primary font-bold text-xs px-2 py-1 hover:brightness-110 active:scale-95 disabled:opacity-0 transition-all"
                  >
                    Publicar
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 text-center">
                <p className="text-xs text-muted-foreground font-medium">
                  Sistema de curtidas e comentários disponível em breve.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ======= MOBILE PREMIUM BOTTOM SHEET VIEW (Instagram Style) =======
  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="shrink-0 flex flex-col items-center pt-2 pb-1 border-b border-border/5">
        <div className="w-9 h-1 rounded-full bg-muted/40 mb-3" />
        <div className="w-full px-5 flex items-center justify-between pb-3">
          <div className="w-8" />
          <h2 className="text-[15px] font-bold text-foreground tracking-tight">Comentários</h2>
          <button 
            onClick={onMobileClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/30 text-foreground/80 hover:text-foreground active:scale-90 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scroll-smooth"
      >
        {loaded && comments.length > 0 ? (
          comments.map(renderComment)
        ) : loaded ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-30">
             <MessageSquare className="w-14 h-14 mb-4" />
             <p className="text-sm font-semibold">Nenhum comentário ainda</p>
          </div>
        ) : (
          <div className="space-y-7">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-muted/50 shrink-0" />
                <div className="flex-1 space-y-2.5 pt-1">
                  <div className="h-3 bg-muted/50 rounded w-1/4" />
                  <div className="h-3 bg-muted/50 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Area (Emoji Bar + Input) */}
      <div className="shrink-0 border-t border-border/5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] bg-card/95 backdrop-blur-xl">
        {/* Emoji Bar */}
        <div className="flex items-center justify-between px-6 py-3.5">
          {COMMON_EMOJIS.map(emoji => (
            <button 
              key={emoji} 
              onClick={() => setText(prev => prev + emoji)}
              className="text-2xl transition-all active:scale-150 hover:scale-125 duration-200"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        {isAuthenticated ? (
          <div className="px-4 pb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-border/10 shadow-sm">
              {user?.avatarUrl ? (
                <OptimizedImage src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={`Adicione um comentário...`}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                className="w-full bg-muted/30 border border-border/20 rounded-full pl-4 pr-20 py-3 text-[14px] focus:bg-muted/50 focus:border-primary/30 transition-all outline-none"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-1.5 text-foreground/40 hover:text-foreground/60 transition-colors">
                      <Smile className="w-5 h-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="end" className="w-[280px] p-3 bg-card/95 backdrop-blur-xl border-border/20 rounded-2xl shadow-2xl mb-2 z-[999999]">
                    <div className="grid grid-cols-6 gap-2">
                      {['🐶', '🐱', '🐾', '🦴', '❤️', '😍', '👏', '🙌', '🔥', '😂', '🐈', '🐕', '🐩', '🦜', '🐹', '🐰', '🥰', '✨'].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => setText(prev => prev + emoji)}
                          className="text-2xl p-2 hover:bg-muted/50 rounded-xl transition-all active:scale-125"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {text.trim() && (
                  <button 
                    onClick={handleSubmit}
                    disabled={sending}
                    className="text-primary font-bold text-[14px] px-2 py-1 transition-all active:scale-90"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publicar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-2">
            <div className="w-full h-12 flex items-center justify-center bg-muted/30 text-muted-foreground text-sm font-semibold rounded-2xl border border-border/20 text-center">
              Sistema de curtidas e comentários em breve
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}sem`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}
