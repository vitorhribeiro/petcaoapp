import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCommentsForPhoto, addComment, deleteComment, getCommentLikes, toggleCommentLike, type GalleryComment } from '@/services/galleryCommentsService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Send, Trash2, Smile, Heart } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const COMMON_EMOJIS = ['🐶', '🐱', '❤️', '😍', '😂', '👏', '🙌', '🔥', '🐾', '🥰'];

interface Props {
  photoId: string;
  isAuthenticated: boolean;
  isEditing?: boolean;
}

export function PhotoComments({ photoId, isAuthenticated, isEditing }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<GalleryComment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [likes, setLikes] = useState<Record<string, { count: number; likedByMe: boolean }>>({});

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
    } else {
      toast.error('Erro ao enviar comentário.');
    }
    setSending(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const success = await deleteComment(commentId);
    if (success) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success('Comentário excluído.');
    } else {
      toast.error('Erro ao excluir comentário.');
    }
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

  const visible = showAll ? comments : comments.slice(0, 3);
  const hasMore = comments.length > 3 && !showAll;

  return (
    <div className="px-4 pb-3">
      {/* Comments list */}
      {loaded && comments.length > 0 && (
        <div className={cn("space-y-2.5 mb-3", showAll && "max-h-[200px] overflow-y-auto pr-1")}>
          {visible.map(c => (
            <div key={c.id} className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0 mt-0.5">
                {c.user_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug">
                  <span className="font-semibold">{c.user_name}</span>{' '}
                  <span className="text-muted-foreground">{c.comment_text}</span>
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-[11px] text-muted-foreground/60">
                    {getTimeAgo(c.created_at)}
                  </p>
                  <button 
                    onClick={() => handleLikeComment(c.id)}
                    className={cn(
                      "flex items-center gap-1 text-[11px] font-semibold transition-colors",
                      likes[c.id]?.likedByMe ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Heart 
                      className={cn("w-3 h-3 transition-all", likes[c.id]?.likedByMe ? "fill-red-500" : "")} 
                    />
                    {likes[c.id]?.count > 0 && <span>{likes[c.id].count}</span>}
                  </button>
                </div>
              </div>
              {isEditing && (
                <button
                  onClick={() => handleDeleteComment(c.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  title="Excluir comentário"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs text-primary font-medium hover:underline"
            >
              Ver todos os {comments.length} comentários
            </button>
          )}
        </div>
      )}

      {loaded && comments.length === 0 && (
        <p className="text-xs text-muted-foreground/50 mb-3">Nenhum comentário ainda</p>
      )}

      {/* Divider above input */}
      <div className="border-t border-border -mx-4 pt-3 mb-1 mt-1" />

      {/* Comment input */}
      <div className="flex items-center gap-2">
        {isAuthenticated && user && (
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
            {user.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 flex items-center gap-1.5 bg-muted/50 rounded-full pl-2 pr-3 py-1.5 border border-border/30">
          {isAuthenticated && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={sending}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 hover:bg-muted rounded-full"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-auto p-2 bg-card border-border/30 rounded-xl shadow-lg mb-2">
                <div className="grid grid-cols-5 gap-1">
                  {COMMON_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setText(prev => prev + emoji)}
                      className="text-xl p-2 hover:bg-muted rounded-lg transition-colors flex items-center justify-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <input
            type="text"
            placeholder={isAuthenticated ? 'Escreva um comentário...' : 'Faça login para comentar'}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            disabled={!isAuthenticated || sending}
            maxLength={500}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none disabled:opacity-50"
          />
          {text.trim() && (
            <button
              onClick={handleSubmit}
              disabled={sending}
              className={cn(
                'p-1 rounded-full text-primary transition-all',
                sending ? 'opacity-50' : 'hover:bg-primary/10 active:scale-90'
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}sem`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}
