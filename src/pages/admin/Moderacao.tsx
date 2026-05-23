import React, { useState } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { useConfig } from '@/hooks/useConfig';
import * as galleryService from '@/services/galleryService';
import { getGalleryCategories, createGalleryCategory, updateGalleryCategory, deleteGalleryCategory, GalleryCategoryRow } from '@/services/galleryCategoriesService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollableTabs, premiumTabClass, premiumTabListClass } from '@/components/ui/scrollable-tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GalleryUploadModal } from '@/components/gallery/GalleryUploadModal';
import { PhotoViewer } from '@/components/gallery/PhotoViewer';
import { AddReviewModal } from '@/components/modals/AddReviewModal';
import { ResponsiveModal } from '@/components/modals/ResponsiveModal';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2, XCircle, Image, Star, Plus, ChevronLeft, ChevronRight,
  Shield, Clock, Camera, MessageSquare, Sparkles, ImageOff, MessageCircleOff,
  Trash2, Images, MessageSquareText, FileCheck, History, LayoutDashboard,
  Info, Edit2, Store, Eye
} from 'lucide-react';
import * as reviewsService from '@/services/reviewsService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
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

type ModerationStatus = 'pendente' | 'aprovado' | 'rejeitado';

const STATUS_LABELS: Record<ModerationStatus, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

const STATUS_COLORS: Record<ModerationStatus, string> = {
  pendente: 'bg-background/95 text-amber-600 border-amber-200 dark:border-amber-900 shadow-sm',
  aprovado: 'bg-background/95 text-emerald-600 border-emerald-200 dark:border-emerald-900 shadow-sm',
  rejeitado: 'bg-background/95 text-destructive border-destructive/20 shadow-sm',
};

const STATUS_ICONS: Record<ModerationStatus, any> = {
  pendente: Clock,
  aprovado: CheckCircle2,
  rejeitado: XCircle,
};

// ─── Shared Sub-Components ───
const FilterChips = ({ value, onChange, options }: { value: string; onChange: (v: any) => void; options: { label: string; value: string }[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(o => (
      <button
        key={o.value}
        onClick={() => onChange(o.value)}
        className={cn(
          'px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-all duration-200',
          value === o.value
            ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
            : 'bg-muted/50 backdrop-blur-sm text-muted-foreground border-border/30 hover:border-primary/40 hover:text-foreground'
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Pagination = ({ page, total, onPrev, onNext }: { page: number; total: number; onPrev: () => void; onNext: () => void }) => (
  total > 1 ? (
    <div className="flex items-center justify-center gap-3 mt-6">
      <Button variant="outline" size="sm" onClick={onPrev} disabled={page === 0} className="rounded-full w-9 h-9 p-0">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm text-muted-foreground font-medium tabular-nums">
        {page + 1} <span className="text-muted-foreground/50">de</span> {total}
      </span>
      <Button variant="outline" size="sm" onClick={onNext} disabled={page >= total - 1} className="rounded-full w-9 h-9 p-0">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  ) : null
);

const EmptyState = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 bg-card/40 border border-dashed border-border/60 rounded-3xl space-y-4">
    <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center relative border border-border/20 shadow-inner">
      <Icon className="w-10 h-10 text-muted-foreground/30" />
      <div className="absolute inset-0 rounded-full border border-primary/5 animate-pulse" />
    </div>
    <div className="text-center space-y-1">
      <p className="text-lg font-bold text-foreground/80">{title}</p>
      {description && <p className="text-sm text-muted-foreground/60 max-w-[280px] mx-auto leading-relaxed">{description}</p>}
    </div>
  </div>
);

// ─── Photo Card ───
const PhotoCard = React.memo(({ 
  img, 
  showActions, 
  showCategoryEdit,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onUpdateCategory,
  categorySelection,
  onCategorySelectionChange,
  availableCategories
}: { 
  img: galleryService.GalleryPhotoRow; 
  showActions: boolean; 
  showCategoryEdit?: boolean;
  onView: (id: string) => void;
  onEdit: (img: galleryService.GalleryPhotoRow) => void;
  onDelete: (img: galleryService.GalleryPhotoRow) => void;
  onApprove: (id: string, cat: string) => void;
  onReject: (id: string) => void;
  onUpdateCategory: (id: string, cat: string) => void;
  categorySelection: string;
  onCategorySelectionChange: (v: string) => void;
  availableCategories: string[];
}) => {
  const [optimisticCategory, setOptimisticCategory] = React.useState(img.category || '');

  React.useEffect(() => {
    setOptimisticCategory(img.category || '');
  }, [img.category]);

  return (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.2 }}
    className="relative group"
  >
    <div className="aspect-square bg-muted rounded-2xl overflow-hidden border border-border/40 relative shadow-sm group-hover:shadow-md transition-all duration-300">
      <OptimizedImage 
        src={img.url} 
        alt={img.alt || ''} 
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
        aspectRatio="square" 
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
        <Badge className={cn('text-[10px] font-bold border-none backdrop-blur-md px-2 py-0.5 shadow-sm', 
          img.moderation_status === 'aprovado' ? 'bg-emerald-500/90 text-white' : 
          img.moderation_status === 'pendente' ? 'bg-amber-500/90 text-white' : 
          'bg-destructive/90 text-white'
        )}>
          {STATUS_LABELS[img.moderation_status as ModerationStatus] || img.moderation_status}
        </Badge>
      </div>

      <div className="absolute top-2 left-2 flex gap-1">
        {img.category && (
          <Badge className="text-[10px] font-bold border-none backdrop-blur-md px-2 py-0.5 shadow-sm bg-background/80 text-foreground capitalize">
            {img.category}
          </Badge>
        )}
      </div>

      <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button 
            size="sm" 
            className="h-10 px-4 text-xs flex-1 bg-white hover:bg-white/90 text-black font-bold rounded-xl shadow-xl border-none" 
            onClick={() => onView(img.id)}
          >
            <Eye className="w-4 h-4 mr-2" /> Ver
          </Button>
          <Button 
            size="sm" 
            className="h-10 w-10 p-0 bg-white hover:bg-white/90 text-black font-bold rounded-xl shadow-xl border-none" 
            onClick={() => onEdit(img)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            className="h-10 w-10 p-0 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-xl border-none"
            onClick={() => onDelete(img)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
      </div>
    </div>

    {showActions && img.moderation_status === 'pendente' && (
      <div className="mt-2 flex gap-2">
        <Select
          value={categorySelection}
          onValueChange={onCategorySelectionChange}
        >
          <SelectTrigger className="h-8 text-[11px] rounded-xl flex-1 bg-card">
            <SelectValue placeholder="Tipo..." />
          </SelectTrigger>
          <SelectContent>
            {availableCategories?.map(cat => (
              <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="h-8 w-8 p-0 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
          disabled={!categorySelection}
          onClick={() => onApprove(img.id, categorySelection)}
        >
          <CheckCircle2 className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 w-8 p-0 rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 shrink-0" 
          onClick={() => onReject(img.id)}
        >
          <XCircle className="w-4 h-4" />
        </Button>
      </div>
    )}
    
    {showCategoryEdit && img.moderation_status === 'aprovado' && (
      <div className="mt-2">
        <Select
          value={optimisticCategory}
          onValueChange={(v) => {
            setOptimisticCategory(v);
            onUpdateCategory(img.id, v);
          }}
        >
          <SelectTrigger className="h-8 text-[10px] rounded-xl w-full bg-muted/40 border-none hover:bg-muted/60 transition-colors">
            <SelectValue placeholder="Alterar categoria..." />
          </SelectTrigger>
          <SelectContent>
            {availableCategories?.map(cat => (
              <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )}
  </motion.div>
  );
});
PhotoCard.displayName = 'PhotoCard';

// ─── Review Card ───
const ReviewCard = React.memo(({ 
  review, 
  showActions, 
  responseText, 
  onResponseChange, 
  onSaveResponse, 
  onEdit,
  onApprove,
  onReject,
  refreshReviews
}: { 
  review: reviewsService.ReviewRow; 
  showActions: boolean; 
  responseText: string; 
  onResponseChange: (v: string) => void;
  onSaveResponse: (id: string) => void;
  onEdit: (r: reviewsService.ReviewRow) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  refreshReviews: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="border-border/40 bg-card/60 backdrop-blur-sm hover:shadow-md transition-all duration-300 rounded-3xl overflow-hidden relative group">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Review Visual Column (if has photo) */}
          {review.photos && review.photos.length > 0 && (
            <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-2xl overflow-hidden border border-border/40 shadow-sm relative group/review-photo">
              <OptimizedImage src={review.photos[0]} alt="Foto da avaliação" className="w-full h-full object-cover" aspectRatio="square" />
              <button 
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/review-photo:opacity-100 transition-opacity"
                onClick={() => {
                  const win = window.open(review.photos![0], '_blank');
                  win?.focus();
                }}
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
          )}

          {/* Review Content Column */}
          <div className="flex-1 space-y-4 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-inner">
                  <span className="text-lg font-bold text-primary">{review.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div>
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    {review.name}
                    <Badge className={cn('text-[10px] font-bold px-2 py-0 border-none', 
                      review.moderation_status === 'aprovado' ? 'bg-emerald-500/10 text-emerald-600' : 
                      review.moderation_status === 'pendente' ? 'bg-amber-500/10 text-amber-600' : 
                      'bg-destructive/10 text-destructive'
                    )}>
                      {STATUS_LABELS[review.moderation_status as ModerationStatus] || review.moderation_status}
                    </Badge>
                  </h4>
                  {review.pet_name && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-primary/60" /> {review.pet_name}</p>}
                </div>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "w-4 h-4",
                      star <= (review.rating || 5) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
                    )}
                  />
                ))}
              </div>
            </div>

            {review.review_text && (
              <p className="text-sm text-foreground/80 italic leading-relaxed border-l-2 border-primary/20 pl-4 py-1">"{review.review_text}"</p>
            )}

            <div className="bg-muted/30 p-4 rounded-2xl border border-border/40 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <MessageSquare className="w-4 h-4" /> Resposta do Petshop
              </div>
              {review.shop_response ? (
                <p className="text-sm text-muted-foreground bg-white dark:bg-black/20 p-3 rounded-xl border border-border/40 leading-relaxed">{review.shop_response}</p>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Escreva uma resposta pública..."
                    className="h-10 text-sm bg-white dark:bg-black/20 border-border/40 rounded-xl"
                    value={responseText}
                    onChange={(e) => onResponseChange(e.target.value)}
                  />
                  <Button size="sm" onClick={() => onSaveResponse(review.id)} className="h-10 rounded-xl px-4 gap-2 shadow-sm" disabled={!responseText?.trim()}>
                    <Send className="w-4 h-4" /> Responder
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <span className="text-xs text-muted-foreground font-medium bg-muted px-2.5 py-1 rounded-md">{review.service_name || 'Serviço não especificado'}</span>
              <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg">
                Ver Histórico do Cliente <ExternalLink className="w-3 h-3 ml-1.5" />
              </Button>
            </div>
          </div>

          <div className="flex md:flex-col gap-2 shrink-0 md:border-l md:border-border/20 md:pl-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 md:flex-none h-10 rounded-xl gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5"
              onClick={() => onEdit(review)}
            >
              <Edit2 className="w-4 h-4" /> <span className="md:hidden">Editar</span>
            </Button>
            
            {showActions && review.moderation_status === 'pendente' ? (
              <>
                <Button size="sm" className="flex-1 md:flex-none h-10 rounded-xl gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm" onClick={() => onApprove(review.id)}>
                  <CheckCircle2 className="w-4 h-4" /> Aprovar
                </Button>
                <Button size="sm" variant="outline" className="flex-1 md:flex-none h-10 rounded-xl gap-2 text-destructive border-destructive/20 hover:bg-destructive/5" onClick={() => onReject(review.id)}>
                  <XCircle className="w-4 h-4" /> Rejeitar
                </Button>
              </>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex-1 md:flex-none h-10 rounded-xl gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5">
                    <Trash2 className="w-4 h-4" /> <span className="md:hidden">Excluir</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl border-border/40 bg-card/95 backdrop-blur-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação removerá permanentemente a avaliação do cliente e não poderá ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel className="rounded-2xl border-border/40">Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-2xl"
                      onClick={() => {
                        toast.promise(reviewsService.updateReview(review.id, { moderation_status: 'rejeitado' }), {
                          loading: 'Excluindo...',
                          success: 'Avaliação removida!',
                          error: 'Erro ao remover.'
                        });
                        refreshReviews();
                      }}
                    >
                      Confirmar Exclusão
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
));
ReviewCard.displayName = 'ReviewCard';

export default function Moderacao() {
  const { galleryImages, reviewsList, approvePhoto, rejectPhoto, approveReview, rejectReview, addPhoto, setShopResponse, refreshGallery, refreshReviews, deletePhoto, updatePhoto, updateReview } = useAdmin();
  const { displayLimits } = useConfig();
  const pageSize = displayLimits.moderationPageSizePhotos || 10;
  const reviewPageSize = displayLimits.moderationPageSizeReviews || 10;

  const [uploadOpen, setUploadOpen] = useState(false);
  const [addReviewOpen, setAddReviewOpen] = useState(false);
  const [editPhotoTarget, setEditPhotoTarget] = useState<galleryService.GalleryPhotoRow | null>(null);
  const [editReviewTarget, setEditReviewTarget] = useState<reviewsService.ReviewRow | null>(null);
  
  const [responseTexts, setResponseTexts] = useState<Record<string, string>>({});
  const [photoCategorySelections, setPhotoCategorySelections] = useState<Record<string, string>>({});

  const [galleryCategories, setGalleryCategories] = useState<GalleryCategoryRow[]>([]);

  React.useEffect(() => {
    const fetchCats = async () => {
      let cats = await getGalleryCategories();
      
      // Ensure 'copa' category exists locally or create it
      if (!cats.some(c => c.slug === 'copa')) {
        const copaCat = await createGalleryCategory('Copa', 'copa', 100);
        if (copaCat) {
          cats = [...cats, copaCat];
        }
      }
      setGalleryCategories(cats);
    };
    fetchCats();
  }, []);

  const [photoFilter, setPhotoFilter] = useState<'todas' | ModerationStatus>('todas');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [photoPage, setPhotoPage] = useState(0);

  const [categoriesManageOpen, setCategoriesManageOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  const [reviewFilter, setReviewFilter] = useState<'todas' | ModerationStatus>('todas');
  const [reviewPage, setReviewPage] = useState(0);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [photoToDelete, setPhotoToDelete] = useState<galleryService.GalleryPhotoRow | null>(null);

  const pendingPhotos = galleryImages.filter(img => img.moderation_status === 'pendente');
  const pendingReviews = reviewsList.filter(r => r.moderation_status === 'pendente');
  const approvedPhotos = galleryImages.filter(img => img.moderation_status === 'aprovado');
  const approvedReviews = reviewsList.filter(r => r.moderation_status === 'aprovado');

  const baseFilteredPhotos = photoFilter === 'todas'
    ? galleryImages
    : galleryImages.filter(img => img.moderation_status === photoFilter);

  const filteredPhotos = categoryFilter === 'todas'
    ? baseFilteredPhotos
    : baseFilteredPhotos.filter(img => img.category === categoryFilter);

  const totalPhotoPages = Math.ceil(filteredPhotos.length / pageSize);
  const pagedPhotos = filteredPhotos.slice(photoPage * pageSize, (photoPage + 1) * pageSize);

  const filteredReviews = reviewFilter === 'todas'
    ? reviewsList
    : reviewsList.filter(r => r.moderation_status === reviewFilter);
  const totalReviewPages = Math.ceil(filteredReviews.length / reviewPageSize);
  const pagedReviews = filteredReviews.slice(reviewPage * reviewPageSize, (reviewPage + 1) * reviewPageSize);

  const updatePhotoCategory = async (id: string, category: string) => {
    await galleryService.updateGalleryPhoto(id, { category });
    refreshGallery();
  };

  const openViewer = (photoId: string) => {
    const index = filteredPhotos.findIndex(p => p.id === photoId);
    if (index !== -1) {
      setViewerIndex(index);
      setViewerOpen(true);
    }
  };

  const handleUploadSubmit = async (
    photoPreview: string,
    caption: string,
    category?: string,
    extra?: { petName?: string; ownerName?: string; submissionType?: string }
  ) => {
    try {
      const isOfficialUpload = (extra?.submissionType ?? 'oficial') === 'oficial';
      await addPhoto({
        url: photoPreview,
        alt: extra?.petName || 'Foto do petshop',
        category: category || undefined,
        moderation_status: isOfficialUpload ? 'aprovado' : 'pendente',
        submitted_by_name: extra?.ownerName || 'Admin',
        source: isOfficialUpload ? 'PETSHOP' : 'CLIENTE',
        pet_name: extra?.petName,
        owner_name: extra?.ownerName,
        caption,
      });
      setUploadOpen(false);
      toast.success(isOfficialUpload ? 'Foto publicada com sucesso.' : 'Foto enviada para moderação.');
    } catch (error) {
      console.error('handleUploadSubmit error:', error);
      toast.error('Não foi possível enviar a foto. Tente novamente.');
    }
  };

  const handleSaveResponse = (reviewId: string) => {
    const text = responseTexts[reviewId];
    if (text?.trim()) {
      setShopResponse(reviewId, text.trim());
    }
  };

  // ─── Shared Sub-Components ───

// ─── Shared Sub-Components ───
const FilterChips = ({ value, onChange, options }: { value: string; onChange: (v: any) => void; options: { label: string; value: string }[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(o => (
      <button
        key={o.value}
        onClick={() => onChange(o.value)}
        className={cn(
          'px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-all duration-200',
          value === o.value
            ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
            : 'bg-muted/50 backdrop-blur-sm text-muted-foreground border-border/30 hover:border-primary/40 hover:text-foreground'
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Pagination = ({ page, total, onPrev, onNext }: { page: number; total: number; onPrev: () => void; onNext: () => void }) => (
  total > 1 ? (
    <div className="flex items-center justify-center gap-3 mt-6">
      <Button variant="outline" size="sm" onClick={onPrev} disabled={page === 0} className="rounded-full w-9 h-9 p-0">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm text-muted-foreground font-medium tabular-nums">
        {page + 1} <span className="text-muted-foreground/50">de</span> {total}
      </span>
      <Button variant="outline" size="sm" onClick={onNext} disabled={page >= total - 1} className="rounded-full w-9 h-9 p-0">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  ) : null
);

const EmptyState = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 bg-card/40 border border-dashed border-border/60 rounded-3xl space-y-4">
    <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center relative border border-border/20 shadow-inner">
      <Icon className="w-10 h-10 text-muted-foreground/30" />
      <div className="absolute inset-0 rounded-full border border-primary/5 animate-pulse" />
    </div>
    <div className="text-center space-y-1">
      <p className="text-lg font-bold text-foreground/80">{title}</p>
      {description && <p className="text-sm text-muted-foreground/60 max-w-[280px] mx-auto leading-relaxed">{description}</p>}
    </div>
  </div>
);

// ─── Photo Card ───
const PhotoCard = React.memo(({ 
  img, 
  showActions, 
  showCategoryEdit,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onUpdateCategory,
  categorySelection,
  onCategorySelectionChange,
  availableCategories
}: { 
  img: galleryService.GalleryPhotoRow; 
  showActions: boolean; 
  showCategoryEdit?: boolean;
  onView: (id: string) => void;
  onEdit: (img: galleryService.GalleryPhotoRow) => void;
  onDelete: (img: galleryService.GalleryPhotoRow) => void;
  onApprove: (id: string, cat: string) => void;
  onReject: (id: string) => void;
  onUpdateCategory: (id: string, cat: string) => void;
  onUpdateCategory: (id: string, cat: string) => void;
  categorySelection: string;
  onCategorySelectionChange: (v: string) => void;
  availableCategories: string[];
}) => {
  const [optimisticCategory, setOptimisticCategory] = React.useState(img.category || '');

  React.useEffect(() => {
    setOptimisticCategory(img.category || '');
  }, [img.category]);

  return (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.2 }}
    className="relative group"
  >
    <div className="aspect-square bg-muted rounded-2xl overflow-hidden border border-border/40 relative shadow-sm group-hover:shadow-md transition-all duration-300">
      <OptimizedImage 
        src={img.url} 
        alt={img.alt || ''} 
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
        aspectRatio="square" 
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
        <Badge className={cn('text-[10px] font-bold border-none backdrop-blur-md px-2 py-0.5 shadow-sm', 
          img.moderation_status === 'aprovado' ? 'bg-emerald-500/90 text-white' : 
          img.moderation_status === 'pendente' ? 'bg-amber-500/90 text-white' : 
          'bg-destructive/90 text-white'
        )}>
          {STATUS_LABELS[img.moderation_status as ModerationStatus] || img.moderation_status}
        </Badge>
        {img.category && (
          <Badge variant="secondary" className="text-[9px] bg-background/80 backdrop-blur-md border-none text-foreground/70 px-1.5 py-0 capitalize">
            {img.category}
          </Badge>
        )}
      </div>

      <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0 flex gap-2">
          <Button 
            size="sm" 
            className="h-10 px-4 text-xs flex-1 bg-white hover:bg-white/90 text-black font-bold rounded-xl shadow-xl border-none" 
            onClick={() => onView(img.id)}
          >
            <Eye className="w-4 h-4 mr-2" /> Ver
          </Button>
          <Button 
            size="sm" 
            className="h-10 w-10 p-0 bg-white hover:bg-white/90 text-black font-bold rounded-xl shadow-xl border-none" 
            onClick={() => onEdit(img)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            className="h-10 w-10 p-0 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-xl border-none"
            onClick={() => onDelete(img)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
      </div>
    </div>

    {showActions && img.moderation_status === 'pendente' && (
      <div className="mt-2 flex gap-2">
        <Select
          value={categorySelection}
          onValueChange={onCategorySelectionChange}
        >
          <SelectTrigger className="h-8 text-[11px] rounded-xl flex-1 bg-card">
            <SelectValue placeholder="Tipo..." />
          </SelectTrigger>
          <SelectContent>
            {availableCategories?.map(cat => (
              <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="h-8 w-8 p-0 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
          disabled={!categorySelection}
          onClick={() => onApprove(img.id, categorySelection)}
        >
          <CheckCircle2 className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 w-8 p-0 rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 shrink-0" 
          onClick={() => onReject(img.id)}
        >
          <XCircle className="w-4 h-4" />
        </Button>
      </div>
    )}
    
    {showCategoryEdit && img.moderation_status === 'aprovado' && (
      <div className="mt-2">
        <Select
          value={optimisticCategory}
          onValueChange={(v) => {
            setOptimisticCategory(v);
            onUpdateCategory(img.id, v);
          }}
        >
          <SelectTrigger className="h-8 text-[10px] rounded-xl w-full bg-muted/40 border-none hover:bg-muted/60 transition-colors">
            <SelectValue placeholder="Alterar categoria..." />
          </SelectTrigger>
          <SelectContent>
            {availableCategories?.map(cat => (
              <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )}
  </motion.div>
  );
});
PhotoCard.displayName = 'PhotoCard';

// ─── Review Card ───
const ReviewCard = React.memo(({ 
  review, 
  showActions, 
  responseText, 
  onResponseChange, 
  onSaveResponse, 
  onEdit, 
  onApprove, 
  onReject, 
  refreshReviews 
}: { 
  review: reviewsService.ReviewRow; 
  showActions: boolean;
  responseText: string;
  onResponseChange: (v: string) => void;
  onSaveResponse: (id: string) => void;
  onEdit: (r: reviewsService.ReviewRow) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  refreshReviews: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="border-border/40 bg-card/60 backdrop-blur-sm hover:shadow-md transition-all duration-300 rounded-3xl overflow-hidden relative group">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Review Visual Column (if has photo) */}
          {review.photos && review.photos.length > 0 && (
            <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-2xl overflow-hidden border border-border/40 shadow-sm relative group/review-photo">
              <OptimizedImage src={review.photos[0]} alt="Foto da avaliação" className="w-full h-full object-cover" aspectRatio="square" />
              <button 
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/review-photo:opacity-100 transition-opacity"
                onClick={() => {
                  const win = window.open(review.photos![0], '_blank');
                  win?.focus();
                }}
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
          )}

          {/* Review Content Column */}
          <div className="flex-1 space-y-4 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-inner">
                  <span className="text-lg font-bold text-primary">{review.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div>
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    {review.name}
                    <Badge className={cn('text-[10px] font-bold px-2 py-0 border-none', 
                      review.moderation_status === 'aprovado' ? 'bg-emerald-500/10 text-emerald-600' : 
                      review.moderation_status === 'pendente' ? 'bg-amber-500/10 text-amber-600' : 
                      'bg-destructive/10 text-destructive'
                    )}>
                      {STATUS_LABELS[review.moderation_status as ModerationStatus] || review.moderation_status}
                    </Badge>
                  </h4>
                  {review.pet_name && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-primary/60" /> {review.pet_name}</p>}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('w-4 h-4', i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')} />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{review.created_at?.split('T')[0]}</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-3 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
              <p className="text-sm text-foreground/90 leading-relaxed italic pl-2">
                "{review.comment}"
              </p>
            </div>

            {review.shop_response && (
              <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden group/response">
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover/response:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => onResponseChange(review.shop_response!)}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-[11px] font-bold text-primary mb-1 flex items-center gap-1.5 uppercase tracking-wide">
                  <Store className="w-3 h-3" /> Resposta da Loja
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{review.shop_response}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Responder como PetCão..."
                value={responseText}
                onChange={(e) => onResponseChange(e.target.value)}
                className="h-9 text-xs rounded-xl bg-muted/40 border-border/30 focus:bg-background transition-all"
              />
              <Button 
                size="sm" 
                variant={responseText ? "default" : "outline"} 
                className="h-9 px-4 rounded-xl gap-2 font-semibold"
                disabled={!responseText?.trim()}
                onClick={() => onSaveResponse(review.id)}
              >
                <MessageSquare className="w-3.5 h-3.5" /> 
                <span className="hidden sm:inline">Responder</span>
              </Button>
            </div>
          </div>

          <div className="flex md:flex-col gap-2 shrink-0 md:border-l md:border-border/20 md:pl-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 md:flex-none h-10 rounded-xl gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5"
              onClick={() => onEdit(review)}
            >
              <Edit2 className="w-4 h-4" /> <span className="md:hidden">Editar</span>
            </Button>
            
            {showActions && review.moderation_status === 'pendente' ? (
              <>
                <Button size="sm" className="flex-1 md:flex-none h-10 rounded-xl gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm" onClick={() => onApprove(review.id)}>
                  <CheckCircle2 className="w-4 h-4" /> Aprovar
                </Button>
                <Button size="sm" variant="outline" className="flex-1 md:flex-none h-10 rounded-xl gap-2 text-destructive border-destructive/20 hover:bg-destructive/5" onClick={() => onReject(review.id)}>
                  <XCircle className="w-4 h-4" /> Rejeitar
                </Button>
              </>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex-1 md:flex-none h-10 rounded-xl gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5">
                    <Trash2 className="w-4 h-4" /> <span className="md:hidden">Excluir</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl border-border/40 bg-card/95 backdrop-blur-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação removerá permanentemente a avaliação do cliente e não poderá ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel className="rounded-2xl border-border/40">Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-2xl"
                      onClick={() => {
                        toast.promise(reviewsService.updateReview(review.id, { moderation_status: 'rejeitado' }), {
                          loading: 'Excluindo...',
                          success: 'Avaliação removida!',
                          error: 'Erro ao remover.'
                        });
                        refreshReviews();
                      }}
                    >
                      Confirmar Exclusão
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
));
ReviewCard.displayName = 'ReviewCard';

  // ─── Stats ───
  const stats = [
    { label: 'Pendentes', fullLabel: 'Conteúdo Pendente', value: pendingPhotos.length + pendingReviews.length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', glow: (pendingPhotos.length + pendingReviews.length) > 0, description: 'Conteúdo aguardando sua revisão para ser exibido no site.' },
    { label: 'Galeria', fullLabel: 'Fotos na Galeria', value: approvedPhotos.length, icon: Images, color: 'text-primary', bg: 'bg-primary/10', description: 'Fotos aprovadas que estão visíveis para os clientes.' },
    { label: 'Avaliações', fullLabel: 'Total de Reviews', value: approvedReviews.length, icon: Star, color: 'text-emerald-500', bg: 'bg-emerald-500/10', description: 'Reviews de clientes que já foram moderados e publicados.' },
    { label: 'Histórico', fullLabel: 'Total de Itens', value: galleryImages.length + reviewsList.length, icon: History, color: 'text-blue-500', bg: 'bg-blue-500/10', description: 'Total de registros (fotos e avaliações) processados no sistema.' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Premium Header ── */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex p-3.5 rounded-2xl bg-gradient-to-br from-primary to-primary/80 border border-primary/10 shadow-lg shadow-primary/20">
              <Images className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Galeria e Avaliações</h1>
              <p className="text-sm text-muted-foreground">Gerencie sua galeria de fotos e o mural de avaliações dos clientes</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 backdrop-blur-sm rounded-full border border-border/40">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Módulo de Moderação</span>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <TooltipProvider>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <motion.div key={s.fullLabel} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={cn(
                "border-border/30 bg-card/80 backdrop-blur-sm rounded-2xl transition-all h-full relative group/stat",
                s.glow && "ring-1 ring-amber-500/20 border-amber-500/20"
              )}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground/40 hover:text-primary transition-colors">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-[11px] bg-popover/95 backdrop-blur-md">
                    <p>{s.description}</p>
                  </TooltipContent>
                </Tooltip>
                
                <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-1.5">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                    <s.icon className={cn("w-5 h-5", s.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-foreground tabular-nums">{s.value}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">{s.fullLabel}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </TooltipProvider>

      {/* ── Main Modules ── */}
      <Tabs defaultValue="galeria" className="w-full">
        <ScrollableTabs>
          <TabsList className={premiumTabListClass}>
            <TabsTrigger value="galeria" className={premiumTabClass}>
              <Images className="w-3.5 h-3.5" /> Galeria de Fotos
              {pendingPhotos.length > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px]">
                  {pendingPhotos.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="avaliacoes" className={premiumTabClass}>
              <MessageSquareText className="w-3.5 h-3.5" /> Mural de Avaliações
              {pendingReviews.length > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px]">
                  {pendingReviews.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </ScrollableTabs>

        {/* ── MODULE: GALERIA ── */}
        <TabsContent value="galeria" className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-2xl border border-border/40">
            <FilterChips
              value={photoFilter}
              onChange={(v: any) => { setPhotoFilter(v); setPhotoPage(0); }}
              options={[
                { label: 'Tudo', value: 'todas' },
                { label: 'Pendentes', value: 'pendente' },
                { label: 'Aprovadas', value: 'aprovado' },
                { label: 'Rejeitadas', value: 'rejeitado' },
              ]}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPhotoPage(0); }}>
                <SelectTrigger className="h-9 w-[140px] text-xs rounded-xl bg-background border-border/30">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as categorias</SelectItem>
                  {galleryCategories.map(cat => (
                    <SelectItem key={cat.slug} value={cat.slug} className="capitalize">{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setCategoriesManageOpen(true)} variant="outline" size="sm" className="h-9 px-3 rounded-xl gap-1 border-border/30 text-xs">
                Gerenciar Categorias
              </Button>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <span className="text-xs text-muted-foreground font-medium">{filteredPhotos.length} fotos encontradas</span>
              <Button onClick={() => setUploadOpen(true)} size="sm" className="gap-2 h-9 rounded-xl">
                <Plus className="w-3.5 h-3.5" /> Enviar Foto
              </Button>
            </div>
          </div>

          {pagedPhotos.length === 0 ? (
            <EmptyState 
              icon={photoFilter === 'pendente' ? FileCheck : ImageOff} 
              title={photoFilter === 'pendente' ? "Tudo moderado!" : "Nenhuma foto encontrada"} 
              description={photoFilter === 'pendente' ? "Não há novas fotos aguardando aprovação." : "Tente ajustar os filtros ou enviar uma nova foto."}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pagedPhotos.map((img) => (
                <PhotoCard 
                  key={img.id} 
                  img={img} 
                  showActions={img.moderation_status === 'pendente'} 
                  showCategoryEdit={img.moderation_status !== 'pendente'}
                  onView={openViewer}
                  onEdit={setEditPhotoTarget}
                  onDelete={setPhotoToDelete}
                  onApprove={approvePhoto}
                  onReject={rejectPhoto}
                  onUpdateCategory={(id, cat) => {
                    toast.promise(updatePhotoCategory(id, cat), {
                      loading: 'Atualizando categoria...',
                      success: 'Categoria atualizada!',
                      error: 'Erro ao atualizar.'
                    });
                  }}
                  categorySelection={photoCategorySelections[img.id] || ''}
                  onCategorySelectionChange={(v) => setPhotoCategorySelections(prev => ({ ...prev, [img.id]: v }))}
                  availableCategories={galleryCategories.map(c => c.slug)}
                />
              ))}
            </div>
          )}

          <Pagination
            page={photoPage}
            total={totalPhotoPages}
            onPrev={() => setPhotoPage(p => Math.max(0, p - 1))}
            onNext={() => setPhotoPage(p => Math.min(totalPhotoPages - 1, p + 1))}
          />
        </TabsContent>

        {/* ── MODULE: AVALIAÇÕES ── */}
        <TabsContent value="avaliacoes" className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-2xl border border-border/40">
            <FilterChips
              value={reviewFilter}
              onChange={(v: any) => { setReviewFilter(v); setReviewPage(0); }}
              options={[
                { label: 'Tudo', value: 'todas' },
                { label: 'Pendentes', value: 'pendente' },
                { label: 'Aprovadas', value: 'aprovado' },
                { label: 'Rejeitadas', value: 'rejeitado' },
              ]}
            />
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground font-medium">{filteredReviews.length} avaliações encontradas</span>
              <Button onClick={() => setAddReviewOpen(true)} variant="outline" size="sm" className="gap-2 h-9 rounded-xl">
                <Plus className="w-3.5 h-3.5" /> Nova Avaliação
              </Button>
            </div>
          </div>

          {pagedReviews.length === 0 ? (
            <EmptyState 
              icon={reviewFilter === 'pendente' ? FileCheck : MessageCircleOff} 
              title={reviewFilter === 'pendente' ? "Sem pendências!" : "Nenhuma avaliação encontrada"}
              description={reviewFilter === 'pendente' ? "Todas as avaliações já foram moderadas." : "Tente mudar o filtro de busca."}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pagedReviews.map((review) => (
                <ReviewCard 
                  key={review.id} 
                  review={review} 
                  showActions={review.moderation_status === 'pendente'} 
                  responseText={responseTexts[review.id] ?? ''}
                  onResponseChange={(v) => setResponseTexts(prev => ({ ...prev, [review.id]: v }))}
                  onSaveResponse={handleSaveResponse}
                  onEdit={setEditReviewTarget}
                  onApprove={approveReview}
                  onReject={rejectReview}
                  refreshReviews={refreshReviews}
                />
              ))}
            </div>
          )}

          <Pagination
            page={reviewPage}
            total={totalReviewPages}
            onPrev={() => setReviewPage(p => Math.max(0, p - 1))}
            onNext={() => setReviewPage(p => Math.min(totalReviewPages - 1, p + 1))}
          />
        </TabsContent>
      </Tabs>

      <GalleryUploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSubmit={handleUploadSubmit}
        isAdmin={true}
      />

      <AddReviewModal
        open={addReviewOpen}
        onOpenChange={setAddReviewOpen}
      />

      <ResponsiveModal
        open={categoriesManageOpen}
        onOpenChange={setCategoriesManageOpen}
        title="Gerenciar Categorias"
      >
        <div className="space-y-6 pt-2 pb-4">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Adicionar Nova</h4>
            <div className="flex gap-2">
              <Input 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: festas, banho, etc."
                className="h-11 text-base rounded-xl"
              />
              <Button 
                className="h-11 px-6 rounded-xl shrink-0"
                disabled={!newCategoryName.trim()}
                onClick={async () => {
                  const name = newCategoryName.trim();
                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  if (slug && !galleryCategories.some(c => c.slug === slug)) {
                    const newCat = await createGalleryCategory(name, slug);
                    if (newCat) {
                      setGalleryCategories([...galleryCategories, newCat]);
                      setNewCategoryName('');
                      toast.success('Categoria adicionada!');
                    } else {
                      toast.error('Erro ao criar categoria.');
                    }
                  } else if (galleryCategories.some(c => c.slug === slug)) {
                    toast.error('Categoria já existe!');
                  }
                }}
              >
                Adicionar
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Categorias Existentes</h4>
            {galleryCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 text-center">Nenhuma categoria encontrada.</p>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                {galleryCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
                    {editingCategoryId === cat.id ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <Input 
                          value={editingCategoryValue}
                          onChange={e => setEditingCategoryValue(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                          onClick={async () => {
                            const newName = editingCategoryValue.trim();
                            if (!newName) return;
                            const newSlug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            toast.promise(updateGalleryCategory(cat.id, { name: newName, slug: newSlug }), {
                              loading: 'Atualizando...',
                              success: () => {
                                setGalleryCategories(prev => prev.map(c => c.id === cat.id ? { ...c, name: newName, slug: newSlug } : c));
                                setEditingCategoryId(null);
                                return 'Categoria atualizada!';
                              },
                              error: 'Erro ao atualizar.'
                            });
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-muted-foreground"
                          onClick={() => setEditingCategoryId(null)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col min-w-0 pr-4">
                          <span className="font-semibold text-foreground text-sm truncate">{cat.name}</span>
                          <span className="text-[10px] text-muted-foreground truncate">{cat.slug}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setEditingCategoryValue(cat.name);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja excluir a categoria "${cat.name}"?`)) {
                                toast.promise(deleteGalleryCategory(cat.id), {
                                  loading: 'Excluindo...',
                                  success: () => {
                                    setGalleryCategories(prev => prev.filter(c => c.id !== cat.id));
                                    return 'Categoria excluída!';
                                  },
                                  error: 'Erro ao excluir.'
                                });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ResponsiveModal>

      {/* ── Edit Photo Modal ── */}
      <ResponsiveModal 
        open={!!editPhotoTarget} 
        onOpenChange={(v) => !v && setEditPhotoTarget(null)} 
        title="Editar Foto"
        stickyFooter={
          <Button 
            className="w-full h-12 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg" 
            onClick={() => {
              toast.promise(updatePhoto(editPhotoTarget!.id, editPhotoTarget!), {
                loading: 'Salvando...',
                success: 'Foto atualizada!',
                error: 'Erro ao salvar.'
              });
              setEditPhotoTarget(null);
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
                    {galleryCategories.map(cat => (
                      <SelectItem key={cat.slug} value={cat.slug} className="capitalize">{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </ResponsiveModal>

      {/* ── Edit Review Modal ── */}
      <ResponsiveModal 
        open={!!editReviewTarget} 
        onOpenChange={(v) => !v && setEditReviewTarget(null)} 
        title="Editar Avaliação"
        stickyFooter={
          <Button 
            className="w-full h-12 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg" 
            onClick={() => {
              toast.promise(updateReview(editReviewTarget!.id, editReviewTarget!), {
                loading: 'Salvando...',
                success: 'Avaliação atualizada!',
                error: 'Erro ao salvar.'
              });
              setEditReviewTarget(null);
            }}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        }
      >
        {editReviewTarget && (
          <div className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Cliente</Label>
                  <Input 
                    value={editReviewTarget.name || ''} 
                    onChange={(e) => setEditReviewTarget({...editReviewTarget, name: e.target.value})}
                    className="h-11 text-base rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Pet</Label>
                  <Input 
                    value={editReviewTarget.pet_name || ''} 
                    onChange={(e) => setEditReviewTarget({...editReviewTarget, pet_name: e.target.value})}
                    className="h-11 text-base rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Nota (1 a 5)</Label>
                <Select 
                  value={String(editReviewTarget.rating)} 
                  onValueChange={(v) => setEditReviewTarget({...editReviewTarget, rating: Number(v)})}
                >
                  <SelectTrigger className="h-11 rounded-xl text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5,4,3,2,1].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} Estrelas</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Título</Label>
                <Input 
                  value={editReviewTarget.title || ''} 
                  onChange={(e) => setEditReviewTarget({...editReviewTarget, title: e.target.value})}
                  className="h-11 text-base rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Comentário</Label>
                <Textarea 
                  value={editReviewTarget.comment || ''} 
                  onChange={(e) => setEditReviewTarget({...editReviewTarget, comment: e.target.value})}
                  className="min-h-[100px] text-base rounded-xl resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </ResponsiveModal>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={!!photoToDelete} onOpenChange={(v) => !v && setPhotoToDelete(null)}>
        <AlertDialogContent className="rounded-[32px] border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Excluir imagem?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Esta ação removerá permanentemente a imagem da galeria. Você tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 aspect-video rounded-2xl overflow-hidden border border-border/20">
             {photoToDelete && <img src={photoToDelete.url} className="w-full h-full object-cover" alt="" />}
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-2xl border-none bg-muted/50 hover:bg-muted font-semibold">Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20"
              onClick={() => {
                if (photoToDelete) {
                  toast.promise(deletePhoto(photoToDelete.id), {
                    loading: 'Excluindo...',
                    success: 'Imagem excluída com sucesso!',
                    error: 'Erro ao excluir imagem.'
                  });
                  setPhotoToDelete(null);
                }
              }}
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Photo Viewer Modal ── */}
      <PhotoViewer 
        images={filteredPhotos}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        showAdminActions={true}
        onDelete={async (id) => {
           await deletePhoto(id);
           setViewerOpen(false);
           toast.success('Foto excluída.');
        }}
        onEdit={(img) => {
          setEditPhotoTarget(img as any);
          setViewerOpen(false);
        }}
      />
    </div>
  );
}
