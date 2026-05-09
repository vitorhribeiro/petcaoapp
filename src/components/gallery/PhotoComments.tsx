import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCommentsForPhoto, addComment, type GalleryComment } from '@/services/galleryCommentsService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Send, Smile, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { deleteComment } from '@/services/galleryCommentsService';

interface Props {
  photoId: string;
  isAuthenticated: boolean;
  showInput?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export function PhotoComments({ photoId, isAuthenticated, showInput = true, inputRef }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<GalleryComment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setShowAll(false);
    getCommentsForPhoto(photoId).then(c => {
      setComments(c);
      setLoaded(true);
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

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Excluir este comentário?')) return;
    const success = await deleteComment(commentId);
    if (success) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success('Comentário excluído.');
    } else {
      toast.error('Erro ao excluir comentário.');
    }
  };

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const EMOJIS = ['❤️', '😍', '🐾', '🐶', '🐱', '✨', '🔥', '🙌', '👏', '😂', '🥰', '🐩', '🦴', '🏠', '🌟'];

  const addEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const visible = showAll ? comments : comments.slice(0, 5);
  const hasMore = comments.length > 5 && !showAll;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Comments list - Scrollable area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {loaded && comments.length > 0 && (
          <div className="space-y-4 mb-4">
            {visible.map(c => (
              <div key={c.id} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0 mt-0.5">
                  {c.user_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-bold mr-1.5">{c.user_name}</span>
                      <span className="text-muted-foreground whitespace-pre-wrap break-words">{c.comment_text}</span>
                    </p>
                    {(user?.id === c.user_id) && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1 text-muted-foreground/30 hover:text-destructive transition-colors shrink-0"
                        title="Excluir comentário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[8px] text-muted-foreground/40 mt-1 uppercase font-medium tracking-wider">
                    {formatPhotoDate(c.created_at)}
                  </p>
                </div>
              </div>
            ))}
            {hasMore && (
              <button
                onClick={() => setShowAll(true)}
                className="text-xs text-primary font-bold hover:underline py-1"
              >
                Ver todos os {comments.length} comentários
              </button>
            )}
          </div>
        )}

        {loaded && comments.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 mt-10">
            <MessageCircle className="w-10 h-10 mb-2" />
            <p className="text-sm font-medium">Nenhum comentário ainda</p>
            <p className="text-xs">Seja o primeiro a elogiar esse pet!</p>
          </div>
        )}
      </div>

      {/* Fixed Comment Input at the bottom */}
      <div className="px-4 py-4 border-t border-border/10 bg-card/80 backdrop-blur-md relative">
        {/* Emoji Picker Popover */}
        {showEmojiPicker && (
          <div className="absolute bottom-full left-4 mb-2 p-3 bg-card border border-border/50 rounded-2xl shadow-2xl z-50 grid grid-cols-5 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => addEmoji(e)}
                className="w-10 h-10 flex items-center justify-center text-xl hover:bg-muted rounded-xl transition-colors active:scale-90"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-muted/30 hover:bg-muted/50 focus-within:bg-muted/50 rounded-2xl px-4 py-2.5 border border-border/20 focus-within:border-primary/30 transition-all group">
            <button 
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={cn(
                "text-muted-foreground/40 hover:text-primary transition-colors p-0.5",
                showEmojiPicker && "text-primary"
              )}
              title="Adicionar emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
            <input
              type="text"
              placeholder={isAuthenticated ? 'Escreva um comentário...' : 'Faça login para comentar'}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              disabled={!isAuthenticated || sending}
              maxLength={500}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none disabled:opacity-50"
            />
            {text.trim() && (
              <button
                onClick={handleSubmit}
                disabled={sending}
                className={cn(
                  'font-bold text-sm text-primary transition-all px-2',
                  sending ? 'opacity-50' : 'hover:scale-105 active:scale-95'
                )}
              >
                {sending ? '...' : 'Publicar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
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
