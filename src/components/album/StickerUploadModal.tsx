import { useState, useRef } from 'react';
import { Upload, FileImage, Loader2, CheckCircle2, XCircle, ImagePlus, Dog, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveModal } from '@/components/modals/ResponsiveModal';
import { toast } from 'sonner';
import { validateImageFile, createImagePreview } from '@/lib/imageUtils';
import { uploadImageToStorage } from '@/lib/storageUtils';
import { createStickerCard } from '@/services/stickerAlbumService';

interface StickerUploadModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StickerUploadModal({ open, onOpenChange, onSuccess }: StickerUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [petName, setPetName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [bio, setBio] = useState('');
  const [teamPosition, setTeamPosition] = useState('Atacante');
  const [shirtNumber, setShirtNumber] = useState('10');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Arquivo inválido');
      e.target.value = '';
      return;
    }

    try {
      setSelectedFile(file);
      setFileName(file.name);
      setFileSize(file.size);
      const preview = await createImagePreview(file);
      setPhotoPreview(preview);
    } catch {
      toast.error('Erro ao processar a imagem.');
      e.target.value = '';
      setSelectedFile(null);
      setPhotoPreview('');
      setFileName('');
      setFileSize(0);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !petName.trim()) return;

    setLoading(true);
    setUploadProgress('Otimizando imagem...');
    try {
      setUploadProgress('Enviando figurinha...');
      const { url } = await uploadImageToStorage(selectedFile, 'gallery', undefined, {
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 1000,
      });

      setUploadProgress('Salvando no álbum...');
      const captionData = JSON.stringify({
        bio: bio.trim(),
        position: teamPosition,
        number: shirtNumber
      });
      
      const result = await createStickerCard({
        url,
        pet_name: petName.trim(),
        owner_name: ownerName.trim() || undefined,
        caption: captionData,
      });

      if (!result) throw new Error('Falha ao salvar figurinha.');

      toast.success(`🐾 Figurinha de ${petName} adicionada ao álbum!`);
      resetForm();
      onSuccess();
    } catch (err) {
      console.error('StickerUploadModal error:', err);
      toast.error('Não foi possível adicionar a figurinha. Tente novamente.');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPhotoPreview('');
    setFileName('');
    setFileSize(0);
    setPetName('');
    setOwnerName('');
    setBio('');
    setTeamPosition('Atacante');
    setShirtNumber('10');
    setLoading(false);
    setUploadProgress('');
  };

  const handleClose = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPhotoPreview('');
    setFileName('');
    setFileSize(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const canSubmit = !!photoPreview && !!petName.trim() && !loading;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleClose}
      title="Nova Figurinha"
      description="Adicione um cãozinho ao álbum PetCão 🐾"
      icon={<ImagePlus className="w-5 h-5 text-primary" />}
      maxWidth="max-w-[520px]"
      stickyFooter={
        <Button
          className="w-full h-12 text-base font-bold rounded-xl gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {uploadProgress || 'Enviando...'}
            </>
          ) : (
            <>
              <ImagePlus className="w-4 h-4" />
              Adicionar ao Álbum
            </>
          )}
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Photo upload */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Foto do pet *</Label>
          {!fileName ? (
            <label className="flex flex-col items-center justify-center gap-3 w-full px-4 py-10 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileImage className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Toque para selecionar</p>
                <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG ou WEBP · Foto vertical funciona melhor</p>
              </div>
              <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-border/40 bg-muted/20">
              {photoPreview && (
                <div className="aspect-[3/4] relative">
                  <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-xs font-semibold truncate">{fileName}</p>
                      <p className="text-white/70 text-[10px]">{formatFileSize(fileSize)}</p>
                    </div>
                    <button
                      onClick={removeFile}
                      className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-destructive/80 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pet name (required) */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <Dog className="w-4 h-4 text-primary" />
            Nome do pet *
          </Label>
          <Input
            value={petName}
            onChange={(e) => setPetName(e.target.value.slice(0, 40))}
            placeholder="Ex: Thor, Luna, Bolinha..."
            className="h-11 rounded-xl text-base"
            autoComplete="off"
          />
        </div>

        {/* Owner name (optional) */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <User className="w-4 h-4 text-muted-foreground" />
            Nome do dono
            <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
          </Label>
          <Input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value.slice(0, 60))}
            placeholder="Nome do tutor"
            className="h-11 rounded-xl text-base"
            autoComplete="off"
          />
        </div>

        {/* Position and Number */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Posição no time</Label>
            <Input
              value={teamPosition}
              onChange={(e) => setTeamPosition(e.target.value.slice(0, 30))}
              placeholder="Ex: Atacante"
              className="h-11 rounded-xl text-base"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Nº da camisa</Label>
            <Input
              type="number"
              value={shirtNumber}
              onChange={(e) => setShirtNumber(e.target.value.slice(0, 3))}
              placeholder="Ex: 10"
              className="h-11 rounded-xl text-base"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Bio (optional) */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            Curiosidade / Bio
            <span className="text-muted-foreground text-xs font-normal ml-1">(opcional)</span>
          </Label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 120))}
            placeholder="Uma curiosidade sobre o pet... 🐾"
            rows={2}
            className="flex w-full rounded-xl border border-input bg-background px-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/120</p>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-primary/80 text-center font-medium">
            🌟 A figurinha será publicada imediatamente no álbum público
          </p>
        </div>
      </div>
    </ResponsiveModal>
  );
}
