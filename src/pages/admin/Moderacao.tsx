import { useState } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { useConfig } from '@/hooks/useConfig';
import * as galleryService from '@/services/galleryService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollableTabs, premiumTabClass, premiumTabListClass } from '@/components/ui/scrollable-tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GalleryUploadModal } from '@/components/gallery/GalleryUploadModal';
import { AddReviewModal } from '@/components/modals/AddReviewModal';
import { ResponsiveModal } from '@/components/modals/ResponsiveModal';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2, XCircle, Image, Star, Plus, ChevronLeft, ChevronRight,
  Shield, Clock, Camera, MessageSquare, Sparkles, ImageOff, MessageCircleOff,
  Trash2, Images, MessageSquareText, FileCheck, History, LayoutDashboard,
  Info, Edit2
} from 'lucide-react';
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

export default function Moderacao() {
  const { galleryImages, reviewsList, approvePhoto, rejectPhoto, approveReview, rejectReview, addPhoto, setShopResponse, refreshGallery, deletePhoto, updatePhoto, updateReview } = useAdmin();
  const { displayLimits } = useConfig();
  const pageSize = displayLimits.moderationPageSizePhotos || 10;
  const reviewPageSize = displayLimits.moderationPageSizeReviews || 10;

  const [uploadOpen, setUploadOpen] = useState(false);
  const [addReviewOpen, setAddReviewOpen] = useState(false);
  const [editPhotoTarget, setEditPhotoTarget] = useState<galleryService.GalleryPhotoRow | null>(null);
  const [editReviewTarget, setEditReviewTarget] = useState<reviewsService.ReviewRow | null>(null);
  
  const [responseTexts, setResponseTexts] = useState<Record<string, string>>({});
  const [photoCategorySelections, setPhotoCategorySelections] = useState<Record<string, string>>({});

  const [photoFilter, setPhotoFilter] = useState<'todas' | ModerationStatus>('todas');
  const [photoPage, setPhotoPage] = useState(0);

  const [reviewFilter, setReviewFilter] = useState<'todas' | ModerationStatus>('todas');
  const [reviewPage, setReviewPage] = useState(0);

  const pendingPhotos = galleryImages.filter(img => img.moderation_status === 'pendente');
  const pendingReviews = reviewsList.filter(r => r.moderation_status === 'pendente');
  const approvedPhotos = galleryImages.filter(img => img.moderation_status === 'aprovado');
  const approvedReviews = reviewsList.filter(r => r.moderation_status === 'aprovado');

  const filteredPhotos = photoFilter === 'todas'
    ? galleryImages
    : galleryImages.filter(img => img.moderation_status === photoFilter);
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
      <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center relative">
        <Icon className="w-10 h-10 text-muted-foreground/30" />
        <div className="absolute inset-0 rounded-full border border-primary/5 animate-pulse" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-lg font-semibold text-foreground/80">{title}</p>
        {description && <p className="text-sm text-muted-foreground/60 max-w-[280px] mx-auto leading-relaxed">{description}</p>}
      </div>
    </div>
  );

  // ─── Photo Card ───
  const PhotoCard = ({ img, showActions, showCategoryEdit }: { img: typeof galleryImages[0]; showActions: boolean; showCategoryEdit?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-border/40 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 rounded-2xl group">
        <div className="aspect-square bg-muted overflow-hidden relative">
          <OptimizedImage src={img.url} alt={img.alt || ''} className="w-full h-full group-hover:scale-105 transition-transform duration-500" aspectRatio="square" />
          {/* Status overlay badge */}
          <div className={cn(
            'absolute top-2.5 right-2.5 px-2 py-1 rounded-full text-[10px] font-bold border shadow-sm flex items-center gap-1 backdrop-blur-md',
            STATUS_COLORS[img.moderation_status as ModerationStatus] || ''
          )}>
            {(() => {
              const Icon = STATUS_ICONS[img.moderation_status as ModerationStatus];
              return Icon ? <Icon className="w-3 h-3" /> : null;
            })()}
            {STATUS_LABELS[img.moderation_status as ModerationStatus] || img.moderation_status}
          </div>
          {img.source && (
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-background/95 text-foreground/80 border border-border shadow-sm flex items-center gap-1 backdrop-blur-md">
              {img.source === 'PETSHOP' ? 'Oficial' : 'Cliente'}
            </div>
          )}
          {/* Edit button in corner */}
          <button 
            onClick={() => setEditPhotoTarget(img)}
            className="absolute bottom-2.5 right-2.5 p-1.5 rounded-full bg-background/80 text-foreground/70 hover:text-primary backdrop-blur-md border border-border/20 shadow-sm transition-colors"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        </div>
        <CardContent className="p-3.5 space-y-2.5">
          <div>
            <p className="text-sm font-semibold text-foreground truncate">{img.alt || 'Sem título'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {img.pet_name && <span className="text-xs text-muted-foreground">🐾 {img.pet_name}</span>}
              {img.owner_name && <span className="text-xs text-muted-foreground">• {img.owner_name}</span>}
            </div>
            {img.created_at && (
              <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {img.created_at.split('T')[0]}
              </p>
            )}
          </div>

          {showActions && img.moderation_status === 'pendente' && (
            <div className="space-y-2 pt-1">
              <Select
                value={photoCategorySelections[img.id] || ''}
                onValueChange={(v) => setPhotoCategorySelections(prev => ({ ...prev, [img.id]: v }))}
              >
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="Tipo da foto *" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambiente">🏠 Ambientes</SelectItem>
                  <SelectItem value="antes-depois">✨ Antes e Depois</SelectItem>
                  <SelectItem value="pets">🐶 Pets</SelectItem>
                  <SelectItem value="outro">📌 Outro</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-9 rounded-xl gap-1.5 shadow-sm"
                  disabled={!photoCategorySelections[img.id]}
                  onClick={() => {
                    approvePhoto(img.id, photoCategorySelections[img.id]);
                    setPhotoCategorySelections(prev => { const n = { ...prev }; delete n[img.id]; return n; });
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                </Button>
                <Button size="sm" variant="outline" className="h-9 w-9 p-0 rounded-xl text-destructive hover:text-destructive" onClick={() => rejectPhoto(img.id)}>
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-9 w-9 p-0 rounded-xl text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. A imagem será removida permanentemente da galeria.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="rounded-xl border-border/40">Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                        onClick={() => {
                          toast.promise(deletePhoto(img.id), {
                            loading: 'Excluindo foto...',
                            success: 'Foto excluída com sucesso!',
                            error: 'Erro ao excluir foto.'
                          });
                        }}
                      >
                        Confirmar Exclusão
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {img.moderation_status !== 'pendente' && (
            <div className="flex gap-2 pt-1">
              <Select value={img.category || ''} onValueChange={(v) => updatePhotoCategory(img.id, v)}>
                <SelectTrigger className="h-8 text-xs rounded-lg flex-1">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambiente">🏠 Ambientes</SelectItem>
                  <SelectItem value="antes-depois">✨ Antes e Depois</SelectItem>
                  <SelectItem value="pets">🐶 Pets</SelectItem>
                  <SelectItem value="outro">📌 Outro</SelectItem>
                </SelectContent>
              </Select>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/40 rounded-lg shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. A imagem será removida permanentemente da galeria.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel className="rounded-xl border-border/40">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                      onClick={() => {
                        toast.promise(deletePhoto(img.id), {
                          loading: 'Excluindo foto...',
                          success: 'Foto excluída com sucesso!',
                          error: 'Erro ao excluir foto.'
                        });
                      }}
                    >
                      Confirmar Exclusão
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  // ─── Review Card ───
  const ReviewCard = ({ review, showActions }: { review: typeof reviewsList[0]; showActions: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border/40 bg-card/80 backdrop-blur-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{review.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{review.name}</p>
                  {review.pet_name && <p className="text-xs text-muted-foreground">🐾 {review.pet_name}</p>}
                </div>
                <Badge variant="outline" className={cn('text-[10px] font-bold', STATUS_COLORS[review.moderation_status as ModerationStatus] || '')}>
                  {STATUS_LABELS[review.moderation_status as ModerationStatus] || review.moderation_status}
                </Badge>
              </div>
              <button 
                onClick={() => setEditReviewTarget(review)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              {review.title && <p className="text-sm font-medium text-foreground">{review.title}</p>}

              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn('w-4 h-4', i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')} />
                ))}
                <span className="text-xs text-muted-foreground ml-2">{review.rating}/5</span>
              </div>

              {review.comment && (
                <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 rounded-xl p-3 border border-border/20">
                  "{review.comment}"
                </p>
              )}

              <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {review.created_at?.split('T')[0]}
              </p>

              {review.shop_response && (
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                  <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Resposta do PetCão
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{review.shop_response}</p>
                </div>
              )}
            </div>

            {showActions && (
              <div className="flex sm:flex-col gap-2 shrink-0">
                <Button size="sm" className="rounded-xl gap-1.5 shadow-sm" onClick={() => approveReview(review.id)}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-destructive hover:text-destructive" onClick={() => rejectReview(review.id)}>
                  <XCircle className="w-3.5 h-3.5" /> Rejeitar
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-border/30 pt-3">
            <Label className="text-xs font-semibold text-muted-foreground">Responder avaliação</Label>
            <Textarea
              placeholder="Escreva uma resposta para esta avaliação..."
              value={responseTexts[review.id] ?? review.shop_response ?? ''}
              onChange={(e) => setResponseTexts(prev => ({ ...prev, [review.id]: e.target.value }))}
              className="min-h-[60px] rounded-xl text-sm resize-none"
            />
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => handleSaveResponse(review.id)}>
              <MessageSquare className="w-3.5 h-3.5" /> Salvar resposta
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

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
            <div className="flex items-center gap-4">
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
                <PhotoCard key={img.id} img={img} showActions={img.moderation_status === 'pendente'} showCategoryEdit={img.moderation_status !== 'pendente'} />
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
                <ReviewCard key={review.id} review={review} showActions={review.moderation_status === 'pendente'} />
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

      {/* ── Edit Photo Modal ── */}
      <ResponsiveModal 
        open={!!editPhotoTarget} 
        onOpenChange={(v) => !v && setEditPhotoTarget(null)} 
        title="Editar Foto"
      >
        {editPhotoTarget && (
          <div className="space-y-4 pt-2">
            <div className="aspect-video relative rounded-xl overflow-hidden bg-muted">
              <img src={editPhotoTarget.url} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Pet</Label>
                  <Input 
                    value={editPhotoTarget.pet_name || ''} 
                    onChange={(e) => setEditPhotoTarget({...editPhotoTarget, pet_name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Dono</Label>
                  <Input 
                    value={editPhotoTarget.owner_name || ''} 
                    onChange={(e) => setEditPhotoTarget({...editPhotoTarget, owner_name: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Título / Alt Text</Label>
                <Input 
                  value={editPhotoTarget.alt || ''} 
                  onChange={(e) => setEditPhotoTarget({...editPhotoTarget, alt: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Legenda</Label>
                <Textarea 
                  value={editPhotoTarget.caption || ''} 
                  onChange={(e) => setEditPhotoTarget({...editPhotoTarget, caption: e.target.value})}
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select 
                  value={editPhotoTarget.category || ''} 
                  onValueChange={(v) => setEditPhotoTarget({...editPhotoTarget, category: v})}
                >
                  <SelectTrigger>
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
            <Button 
              className="w-full h-11 rounded-xl font-bold" 
              onClick={() => {
                toast.promise(updatePhoto(editPhotoTarget.id, editPhotoTarget), {
                  loading: 'Salvando...',
                  success: 'Foto atualizada!',
                  error: 'Erro ao salvar.'
                });
                setEditPhotoTarget(null);
              }}
            >
              Salvar Alterações
            </Button>
          </div>
        )}
      </ResponsiveModal>

      {/* ── Edit Review Modal ── */}
      <ResponsiveModal 
        open={!!editReviewTarget} 
        onOpenChange={(v) => !v && setEditReviewTarget(null)} 
        title="Editar Avaliação"
      >
        {editReviewTarget && (
          <div className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Cliente</Label>
                  <Input 
                    value={editReviewTarget.name || ''} 
                    onChange={(e) => setEditReviewTarget({...editReviewTarget, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Pet</Label>
                  <Input 
                    value={editReviewTarget.pet_name || ''} 
                    onChange={(e) => setEditReviewTarget({...editReviewTarget, pet_name: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Nota (1 a 5)</Label>
                <Select 
                  value={String(editReviewTarget.rating)} 
                  onValueChange={(v) => setEditReviewTarget({...editReviewTarget, rating: Number(v)})}
                >
                  <SelectTrigger>
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
                <Label>Título</Label>
                <Input 
                  value={editReviewTarget.title || ''} 
                  onChange={(e) => setEditReviewTarget({...editReviewTarget, title: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Comentário</Label>
                <Textarea 
                  value={editReviewTarget.comment || ''} 
                  onChange={(e) => setEditReviewTarget({...editReviewTarget, comment: e.target.value})}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <Button 
              className="w-full h-11 rounded-xl font-bold" 
              onClick={() => {
                toast.promise(updateReview(editReviewTarget.id, editReviewTarget), {
                  loading: 'Salvando...',
                  success: 'Avaliação atualizada!',
                  error: 'Erro ao salvar.'
                });
                setEditReviewTarget(null);
              }}
            >
              Salvar Alterações
            </Button>
          </div>
        )}
      </ResponsiveModal>
    </div>
  );
}
