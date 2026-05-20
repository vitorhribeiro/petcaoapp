import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Settings, Plus, Loader2, Sparkles } from 'lucide-react';
import { useAdmin } from '@/contexts/AdminContext';
import { useAuth } from '@/contexts/AuthContext';
import { useConfig } from '@/hooks/useConfig';
import { useNavigate } from 'react-router-dom';
import { useHomeContent } from '@/hooks/useHomeContent';
import { getGalleryCategories, GalleryCategoryRow } from '@/services/galleryCategoriesService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { GallerySkeleton } from '@/components/skeletons/SectionSkeletons';
import { PhotoViewer } from '@/components/gallery/PhotoViewer';
import { GalleryUploadModal } from '@/components/gallery/GalleryUploadModal';
import { ModerationSuccessModal } from '@/components/modals/ModerationSuccessModal';
import { ResponsiveModal } from '@/components/modals/ResponsiveModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2 } from 'lucide-react';
import React from 'react';

const ITEMS_PER_PAGE = 12;

export function GallerySection() {
  const { galleryImages, addPhoto, updatePhoto, galleryLoading } = useAdmin();
  const { isDev, isAdmin, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { homeContent } = useHomeContent();
  const { displayLimits } = useConfig();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewerIndex, setViewerIndex] = useState(-1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);
  const [categories, setCategories] = useState<GalleryCategoryRow[]>([]);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editPhotoTarget, setEditPhotoTarget] = useState<any | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const showAdmin = isDev() || isAdmin();

  useEffect(() => { getGalleryCategories(true).then(setCategories); }, []);
  useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [selectedCategory]);

  const approvedImages = useMemo(
    () => galleryImages.filter(img => img.moderation_status === 'aprovado'),
    [galleryImages]
  );

  // Stable deterministic shuffle
  const shuffledImages = useMemo(() => {
    const arr = [...approvedImages];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (i * 7 + arr.length * 13) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [approvedImages]);

  const filteredImages = useMemo(() => {
    if (selectedCategory === 'all') return shuffledImages;
    const cat = categories.find(c => c.slug === selectedCategory);
    const maxPhotos = cat?.max_photos || 10;
    return approvedImages.filter(img => img.category === selectedCategory).slice(0, maxPhotos);
  }, [approvedImages, shuffledImages, selectedCategory, categories]);

  const displayedImages = filteredImages.slice(0, visibleCount);
  const hasMore = visibleCount < filteredImages.length;

  // Infinite scroll with IntersectionObserver
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    // Small delay to show loading indicator
    setTimeout(() => {
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
      setLoadingMore(false);
    }, 200);
  }, [hasMore, loadingMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const categoryTabs = [
    { slug: 'all', name: 'Todos' },
    ...categories.map(c => ({ slug: c.slug, name: c.name })),
  ];

  const canUpload = (() => {
    if (!user) return false;
    const today = new Date().toISOString().split('T')[0];
    const todayUploads = galleryImages.filter(
      img => img.submitted_by_user_id === user.id && img.created_at?.split('T')[0] === today
    ).length;
    return todayUploads < (displayLimits?.userUploadPhotoDailyLimit || 1);
  })();

  const handleUploadSuccess = async (
    photoUrl: string,
    caption: string,
    category?: string,
    extra?: { petName?: string; ownerName?: string; submissionType?: string }
  ) => {
    if (!user) return;
    try {
      const isOfficialUpload = showAdmin && extra?.submissionType === 'oficial';
      await addPhoto({
        url: photoUrl,
        alt: caption || 'Foto enviada pelo cliente',
        caption,
        category: category || undefined,
        moderation_status: isOfficialUpload ? 'aprovado' : 'pendente',
        submitted_by_name: user.name,
        submitted_by_user_id: user.id,
        source: isOfficialUpload ? 'PETSHOP' : 'CLIENTE',
        owner_name: extra?.ownerName || user.name,
        pet_name: extra?.petName,
      });
      setUploadOpen(false);
      if (isOfficialUpload) {
        toast.success('Foto publicada na galeria com sucesso.');
      } else {
        setModerationOpen(true);
      }
    } catch (error) {
      console.error('handleUploadSuccess error:', error);
      toast.error('Não foi possível enviar a foto. Tente novamente.');
    }
  };

  if (galleryLoading && approvedImages.length === 0) return <GallerySkeleton />;

  return (
    <section id="fotos" className="py-24 scroll-mt-20 relative overflow-hidden bg-glow">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[100px] bg-gradient-to-r from-primary/10 via-primary-light/5 to-transparent rounded-full blur-[80px] pointer-events-none -z-10" />

          <span className="relative inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.2em] bg-gradient-to-r from-primary/12 to-primary/8 backdrop-blur-md border border-primary/20 text-primary shadow-sm shadow-primary/5 mb-4 overflow-hidden animate-pulse-glow">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Galeria
          </span>

          <h2 className="text-3xl md:text-5xl font-black mb-4 text-foreground tracking-tight leading-none">
            Galeria de <span className="bg-gradient-to-r from-primary via-blue-600 to-secondary bg-clip-text text-transparent">Fotos</span>
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground/90 max-w-xl mx-auto leading-relaxed">
            Conheça nosso espaço e veja alguns dos pets que já passaram por aqui
          </p>

          {showAdmin && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => navigate('/admin/moderacao')} className="absolute top-0 right-0 p-2.5 text-muted-foreground hover:text-primary transition-all rounded-xl hover:bg-muted border border-transparent hover:border-border/60">
                    <Settings className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Atalho para moderação (Admin)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Tab switcher design */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 bg-muted/65 dark:bg-muted/30 backdrop-blur-md rounded-2xl border border-border/40 gap-1 max-w-full overflow-x-auto scrollbar-hide">
            {categoryTabs.map(cat => {
              const isActive = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/45'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {isAuthenticated && (
          <div className="flex justify-center mb-8">
            <Button 
              variant="outline" 
              className="gap-2 h-11 px-5 border-primary/20 hover:border-primary/50 rounded-xl text-xs font-semibold shadow-sm transition-all duration-300 hover:shadow-primary/5 hover:-translate-y-0.5 active:translate-y-0" 
              onClick={() => {
                if (!canUpload) { toast.error('Você já atingiu o limite diário de envio de fotos.'); return; }
                setUploadOpen(true);
              }}
            >
              <Plus className="w-4 h-4 text-primary" /> Enviar foto
            </Button>
          </div>
        )}

        {/* Gallery grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {displayedImages.map((image, idx) => (
            <LazyGalleryCard key={image.id} image={image} onClick={() => setViewerIndex(idx)} />
          ))}
        </div>

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="flex items-center justify-center py-8">
            {loadingMore && <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />}
          </div>
        )}

        {displayedImages.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm font-medium bg-card/40 border border-border/40 rounded-3xl max-w-lg mx-auto">Nenhuma foto encontrada nesta categoria.</div>
        )}

        <PhotoViewer
          images={displayedImages}
          initialIndex={viewerIndex}
          open={viewerIndex >= 0}
          onClose={() => setViewerIndex(-1)}
          showAdminActions={showAdmin}
          onEdit={(img) => {
            setEditPhotoTarget(img);
            setViewerIndex(-1);
          }}
        />

        {/* ── Edit Photo Modal ── */}
        <ResponsiveModal 
          open={!!editPhotoTarget} 
          onOpenChange={(v) => !v && setEditPhotoTarget(null)} 
          title="Editar Foto"
          stickyFooter={
            <Button 
              className="w-full h-12 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg" 
              onClick={async () => {
                if (!editPhotoTarget) return;
                try {
                  await updatePhoto(editPhotoTarget.id, editPhotoTarget);
                  toast.success('Foto atualizada!');
                  setEditPhotoTarget(null);
                } catch (error) {
                  toast.error('Erro ao salvar.');
                }
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          }
        >
          {editPhotoTarget && (
            <div className="space-y-4 pt-2">
              <div className="aspect-video relative rounded-xl overflow-hidden bg-muted border border-border/20">
                <img src={editPhotoTarget.url} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Pet</Label>
                    <Input 
                      value={editPhotoTarget.pet_name || ''} 
                      onChange={(e) => setEditPhotoTarget({...editPhotoTarget, pet_name: e.target.value})}
                      className="h-11 text-base rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Dono</Label>
                    <Input 
                      value={editPhotoTarget.owner_name || ''} 
                      onChange={(e) => setEditPhotoTarget({...editPhotoTarget, owner_name: e.target.value})}
                      className="h-11 text-base rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Título / Alt Text</Label>
                  <Input 
                    value={editPhotoTarget.alt || ''} 
                    onChange={(e) => setEditPhotoTarget({...editPhotoTarget, alt: e.target.value})}
                    className="h-11 text-base rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Legenda</Label>
                  <Textarea 
                    value={editPhotoTarget.caption || ''} 
                    onChange={(e) => setEditPhotoTarget({...editPhotoTarget, caption: e.target.value})}
                    className="min-h-[80px] text-base rounded-xl resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Categoria</Label>
                  <Select 
                    value={editPhotoTarget.category || ''} 
                    onValueChange={(v) => setEditPhotoTarget({...editPhotoTarget, category: v})}
                  >
                    <SelectTrigger className="h-11 rounded-xl text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ambiente">🏠 Ambientes</SelectItem>
                      <SelectItem value="antes-depois">✨ Antes e Depois</SelectItem>
                      <SelectItem value="pets">🐶 Pets</SelectItem>
                      <SelectItem value="outro">📌 Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </ResponsiveModal>

        <GalleryUploadModal
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onSubmit={handleUploadSuccess}
          isAdmin={showAdmin}
        />

        <ModerationSuccessModal
          open={moderationOpen}
          onClose={() => setModerationOpen(false)}
          type="foto"
        />
      </div>
    </section>
  );
}

/* Memoized gallery card */
const LazyGalleryCard = React.memo(function LazyGalleryCard({ image, onClick }: { image: any; onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className="aspect-square bg-muted rounded-2xl overflow-hidden group relative border border-border/40 shadow-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.03] transition-all duration-500 hover:-translate-y-1"
    >
      <div className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-105">
        <OptimizedImage
          src={image.url}
          alt={image.alt || ''}
          aspectRatio="square"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
        {image.pet_name && (
          <p className="text-white text-xs font-bold truncate tracking-wide">
            🐾 {image.pet_name}
          </p>
        )}
      </div>
    </button>
  );
});
