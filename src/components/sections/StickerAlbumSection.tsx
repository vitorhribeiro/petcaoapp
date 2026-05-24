import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Pencil, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { StickerUploadModal } from '@/components/album/StickerUploadModal';
import { StickerCard, getAlbumStickers, deleteStickerCard, updateStickerCard } from '@/services/stickerAlbumService';
import { ResponsiveModal } from '@/components/modals/ResponsiveModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TOTAL_SLOTS = 12;

/* ── Brazil colors ── */
const BR = { green: '#009C3B', yellow: '#FFDF00', blue: '#002776', darkGreen: '#005C2E' };

/* ─────────────────────────────────────────────────────────
   Filled Sticker — Premium card redesign (Panini Style)
───────────────────────────────────────────────────────── */
function FilledSticker({ card, canAdmin, onDelete, onEdit, onView }: {
  card: StickerCard;
  canAdmin: boolean;
  onDelete: (id: string) => void;
  onEdit: (card: StickerCard) => void;
  onView?: (url: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.6, rotateY: -20 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className="relative group w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        onClick={() => onView?.(card.url)}
        className="relative bg-white cursor-pointer transition-all duration-300 rounded-[4px]"
        style={{
          boxShadow: hovered
            ? '0 12px 24px rgba(0,0,0,0.15)'
            : '0 4px 12px rgba(0,0,0,0.08)',
          transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
          aspectRatio: '1 / 1.38',
          padding: '4px',
        }}
      >
        {/* Inner Card Boundary - Just the image now */}
        <div className="relative w-full h-full overflow-hidden rounded-[2px] bg-gray-100">
          <img src={card.url} className="absolute inset-0 w-full h-full object-cover" alt={card.alt || card.pet_name || ''} />
        </div>

        {/* Admin actions */}
        {canAdmin && hovered && (
          <div className="absolute -top-3 -right-3 flex gap-1 z-40 pointer-events-auto">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(card); }}
              className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-lg text-emerald-600 hover:bg-emerald-50 hover:scale-110 transition-all border border-emerald-100"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
              className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-lg text-red-600 hover:bg-red-50 hover:scale-110 transition-all border border-red-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   Empty Slot — Copa themed
───────────────────────────────────────────────────────── */
function EmptySlot({ number, canAdmin, onAdd }: {
  number: number;
  canAdmin: boolean;
  onAdd: () => void;
}) {
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative group">
      <div
        className="rounded-lg flex flex-col items-center justify-center transition-all duration-200 overflow-hidden relative"
        style={{
          aspectRatio: '3/4.2',
          background: 'rgba(0, 0, 0, 0.25)',
          border: `2px dashed ${canAdmin ? 'rgba(255,223,0,0.8)' : 'rgba(255,255,255,0.3)'}`,
          cursor: canAdmin ? 'pointer' : 'default',
          backdropFilter: 'blur(12px)',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.15)',
        }}
        onClick={canAdmin ? onAdd : undefined}
        onMouseEnter={e => {
          if (canAdmin) {
            (e.currentTarget as HTMLElement).style.borderColor = BR.yellow;
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,223,0,0.2)';
          }
        }}
        onMouseLeave={e => {
          if (canAdmin) {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,223,0,0.8)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(0, 0, 0, 0.25)';
          }
        }}
      >
        {/* Subtle background number */}
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[80px] font-black opacity-5 pointer-events-none text-white">
          {number}
        </span>

        {canAdmin ? (
          <div className="flex flex-col items-center gap-2 transition-transform group-hover:scale-110 z-10">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#FFDF00] shadow-[0_0_15px_rgba(255,223,0,0.4)]">
              <Plus className="w-5 h-5 text-[#009C3B]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFDF00] drop-shadow-md">
              Colar
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-50 z-10">
            <span className="text-3xl filter grayscale brightness-200">🐾</span>
            <span className="text-[14px] font-black tracking-widest text-white uppercase bg-black/30 px-3 py-1 rounded-full">
              {number}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   Edit Modal
───────────────────────────────────────────────────────── */
function EditStickerModal({ card, open, onClose, onSave }: {
  card: StickerCard | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<StickerCard>) => Promise<void>;
}) {
  const [petName, setPetName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [bio, setBio] = useState('');
  const [teamPosition, setTeamPosition] = useState('');
  const [shirtNumber, setShirtNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (card) {
      setPetName(card.pet_name || '');
      setOwnerName(card.owner_name || '');

      let b = card.caption || '';
      let pos = '';
      let num = '';
      try {
        if (card.caption && card.caption.trim().startsWith('{')) {
          const data = JSON.parse(card.caption);
          b = data.bio || '';
          pos = data.position || '';
          num = data.number || '';
        }
      } catch (e) { }

      setBio(b);
      setTeamPosition(pos);
      setShirtNumber(num);
    }
  }, [card]);

  const handleSave = async () => {
    if (!card) return;
    setSaving(true);
    try {
      const captionData = JSON.stringify({
        bio: bio.trim(),
        position: teamPosition.trim(),
        number: shirtNumber.trim()
      });

      await onSave(card.id, {
        pet_name: petName.trim() || null,
        owner_name: ownerName.trim() || null,
        caption: captionData,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Editar Figurinha"
      stickyFooter={
        <Button className="w-full h-12 rounded-xl font-bold" onClick={handleSave} disabled={saving || !petName.trim()}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      }
    >
      <div className="space-y-4 pt-2">
        {card && (
          <div className="w-24 mx-auto rounded-xl overflow-hidden shadow-md">
            <img src={card.url} alt="" className="w-full h-32 object-cover object-top" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Nome do pet *</Label>
          <Input value={petName} onChange={(e) => setPetName(e.target.value.slice(0, 40))} className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Nome do dono</Label>
          <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value.slice(0, 60))} className="h-11 rounded-xl" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Posição</Label>
            <Input value={teamPosition} onChange={(e) => setTeamPosition(e.target.value.slice(0, 30))} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nº Camisa</Label>
            <Input type="number" value={shirtNumber} onChange={(e) => setShirtNumber(e.target.value.slice(0, 3))} className="h-11 rounded-xl" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Bio / Curiosidade</Label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 120))}
            rows={2}
            className="flex w-full rounded-xl border border-input bg-background px-3 py-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
    </ResponsiveModal>
  );
}

/* ─────────────────────────────────────────────────────────
   CBF-style Badge SVG
───────────────────────────────────────────────────────── */
function BrazilBadge({ size = 56 }: { size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center border-[3px] relative"
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle at 35% 35%, #00C44A, #004D20)',
        borderColor: BR.yellow,
        boxShadow: `0 0 0 1px rgba(0,0,0,0.25), 0 6px 24px rgba(0,0,0,0.5), 0 0 16px rgba(255,223,0,0.3)`,
      }}
    >
      {/* Losango */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          width: size * 0.62,
          height: size * 0.62,
          background: 'linear-gradient(135deg, #FFE84D, #FFDF00, #D4940A)',
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)',
        }}
      />
      {/* Círculo azul */}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          width: size * 0.36,
          height: size * 0.36,
          background: 'linear-gradient(135deg, #002776, #003A99)',
          boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.15)',
        }}
      >
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Main Section
───────────────────────────────────────────────────────── */
export function StickerAlbumSection() {
  const { isDev, isAdmin } = useAuth();
  const canAdmin = isDev() || isAdmin();

  const [stickers, setStickers] = useState<StickerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StickerCard | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const loadStickers = useCallback(async () => {
    setLoading(true);
    const data = await getAlbumStickers();
    setStickers(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadStickers(); }, [loadStickers]);

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta figurinha do álbum?')) return;
    const ok = await deleteStickerCard(id);
    if (ok) {
      setStickers((prev) => prev.filter((s) => s.id !== id));
      toast.success('Figurinha removida.');
    } else {
      toast.error('Erro ao remover figurinha.');
    }
  };

  const handleEdit = async (id: string, data: Partial<StickerCard>) => {
    const ok = await updateStickerCard(id, data as any);
    if (ok) {
      setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
      toast.success('Figurinha atualizada!');
    } else {
      throw new Error('Falha ao atualizar');
    }
  };

  const handleDownloadImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!viewingImage) return;
    
    try {
      const toastId = toast.loading('Baixando figurinha...');
      const response = await fetch(viewingImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `figurinha-petcao-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.dismiss(toastId);
      toast.success('Download concluído!');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.dismiss();
      toast.error('Erro ao baixar a figurinha.');
    }
  };

  const filledCount = stickers.length;
  const emptyCount = Math.max(0, TOTAL_SLOTS - filledCount);
  const progressPct = Math.round((filledCount / TOTAL_SLOTS) * 100);

  const slots = [
    ...stickers.map((s, i) => ({ type: 'filled' as const, card: s, number: i + 1 })),
    ...Array.from({ length: emptyCount }, (_, i) => ({ type: 'empty' as const, number: filledCount + i + 1 })),
  ];

  return (
    <section
      id="album"
      className="relative overflow-hidden scroll-mt-20"
      style={{
        paddingTop: '6rem',
        paddingBottom: '6rem',
        backgroundColor: '#1a5c2b',
      }}
    >
      {/* ── Realistic Football Field Background ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Pitch Stripes (Light and Dark Green) */}
        <div className="absolute inset-0" style={{
          background: `repeating-linear-gradient(
            90deg,
            #1e6b33 0px,
            #1e6b33 100px,
            #1a5c2b 100px,
            #1a5c2b 200px
          )`,
          opacity: 0.9
        }} />

        {/* Field White Lines Container */}
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
          {/* Center Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[4px] bg-white -translate-x-1/2" />
          {/* Center Circle */}
          <div className="absolute w-[300px] h-[300px] md:w-[500px] md:h-[500px] border-[4px] border-white rounded-full" />
          {/* Center Spot */}
          <div className="absolute w-4 h-4 bg-white rounded-full" />
          {/* Penalty Box (Left) */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[150px] md:w-[250px] h-[300px] md:h-[400px] border-[4px] border-l-0 border-white" />
          {/* Penalty Box (Right) */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[150px] md:w-[250px] h-[300px] md:h-[400px] border-[4px] border-r-0 border-white" />
          {/* Corner arcs */}
          <div className="absolute top-0 left-0 w-[50px] h-[50px] border-[4px] border-t-0 border-l-0 border-white rounded-br-full" />
          <div className="absolute bottom-0 left-0 w-[50px] h-[50px] border-[4px] border-b-0 border-l-0 border-white rounded-tr-full" />
          <div className="absolute top-0 right-0 w-[50px] h-[50px] border-[4px] border-t-0 border-r-0 border-white rounded-bl-full" />
          <div className="absolute bottom-0 right-0 w-[50px] h-[50px] border-[4px] border-b-0 border-r-0 border-white rounded-tl-full" />
        </div>

        {/* Stadium Shadow Overlay (Vignette) */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.6) 100%)' }}
        />

        {/* World Cup Decorative Elements */}
        {/* Large Trophy Ghost */}
        <div className="absolute right-[-10%] top-[10%] opacity-10 pointer-events-none" style={{ transform: 'rotate(15deg)' }}>
          <span className="text-[350px] filter drop-shadow-[0_0_30px_#FFDF00]">🏆</span>
        </div>
        {/* Brazil Flag Background Ghost */}
        <div className="absolute left-[-10%] bottom-[5%] opacity-10 pointer-events-none" style={{ transform: 'rotate(-15deg)' }}>
          <span className="text-[300px] filter drop-shadow-[0_0_30px_#009C3B]">🇧🇷</span>
        </div>

        {/* Floating Confetti / Stars */}
        {[
          { top: '10%', left: '15%', sz: 24, op: 0.3, color: BR.yellow },
          { top: '25%', left: '85%', sz: 16, op: 0.2, color: BR.green },
          { top: '75%', left: '10%', sz: 20, op: 0.4, color: BR.blue },
          { top: '80%', left: '80%', sz: 28, op: 0.3, color: BR.yellow },
          { top: '45%', left: '5%', sz: 14, op: 0.2, color: '#fff' },
        ].map((s, i) => (
          <div key={i} className="absolute select-none animate-pulse"
            style={{ top: s.top, left: s.left, fontSize: s.sz, opacity: s.op, color: s.color, animationDuration: `${2 + i}s` }}
          >★</div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">

        {/* ── Section heading ── */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Trophy + stars row */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="flex gap-1" style={{ color: BR.yellow, opacity: 0.6 }}>
              {'★★★★★'.split('').map((s, i) => <span key={i} style={{ fontSize: 10 }}>{s}</span>)}
            </div>
            <span className="text-3xl" style={{ filter: 'drop-shadow(0 4px 12px rgba(255,200,0,0.4))' }}>🏆</span>
            <div className="flex gap-1" style={{ color: BR.yellow, opacity: 0.6 }}>
              {'★★★★★'.split('').map((s, i) => <span key={i} style={{ fontSize: 10 }}>{s}</span>)}
            </div>
          </div>

          {/* Badge pill */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-5"
            style={{
              background: 'linear-gradient(90deg, #009C3B 0%, #FFDF00 50%, #002776 100%)',
              border: `2px solid rgba(255,255,255,0.8)`,
              boxShadow: '0 6px 20px rgba(0,156,59,0.5)',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-white shadow-sm" />
            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              Álbum Oficial · PetCão 2026
            </span>
          </div>

          {/* Main heading */}
          <h2 className="font-black leading-none tracking-tight mb-4"
            style={{ fontSize: 'clamp(32px, 7vw, 60px)', color: '#fff', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
          >
            SELEÇÃO DO{' '}
            <span style={{
              background: 'linear-gradient(90deg, #00ff33ff 0%, #FFE84D 40%, #00ff33ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 4px 12px rgba(255,200,0,0.5))',
            }}>
              PETCÃO
            </span>
          </h2>
          <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Os craques que passaram pelo PetCão! Cada pet tem sua figurinha especial neste álbum.
          </p>

          {/* Admin button */}
          {canAdmin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
              <Button
                onClick={() => setUploadOpen(true)}
                className="gap-2 h-10 px-6 rounded-xl font-bold text-sm"
                style={{
                  background: `linear-gradient(135deg, ${BR.darkGreen}, ${BR.green})`,
                  color: '#fff',
                  border: `1px solid rgba(255,223,0,0.25)`,
                  boxShadow: `0 4px 20px rgba(0,156,59,0.4)`,
                }}
              >
                <Plus className="w-4 h-4" />
                Adicionar Figurinha
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* ── Album Book ── */}
        <motion.div
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.1 }}
          style={{
            borderRadius: 28,
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,223,0,0.15)',
          }}
        >
          {/* ─── Album Cover Header ─── */}
          <div
            className="relative overflow-hidden border-b-4 border-[#FFDF00]"
            style={{ background: 'linear-gradient(135deg, #002776 0%, #00123A 100%)' }}
          >
            {/* BG decor inside header */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
              {/* Brazil Flag abstract shape */}
              <div className="absolute w-[120%] h-[150%] opacity-20" style={{
                background: 'linear-gradient(135deg, transparent 30%, #009C3B 30%, #009C3B 45%, #FFDF00 45%, #FFDF00 55%, transparent 55%)'
              }} />

              <div className="absolute opacity-10">
                <span className="text-[200px]">🇧🇷</span>
              </div>
            </div>

            {/* Top stripe */}
            <div className="relative z-10 h-[3px]"
              style={{ background: `linear-gradient(90deg, transparent, ${BR.yellow} 20%, #FFE84D 50%, ${BR.yellow} 80%, transparent)` }}
            />

            {/* Header content */}
            <div className="relative z-10 px-6 md:px-10 py-7 flex items-center justify-between" style={{ minHeight: 100 }}>

              {/* LEFT */}
              <div className="flex flex-col gap-2 relative z-10">
                <span className="text-[#FFDF00] text-xs font-bold tracking-[0.3em] uppercase drop-shadow">Rumo ao Hexa</span>
                <p style={{
                  fontSize: 'clamp(20px, 4vw, 32px)',
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: '#fff',
                  textShadow: '0 3px 12px rgba(0,0,0,0.8)',
                  margin: 0,
                }}>
                  NOSSOS{' '}
                  <span style={{
                    background: 'linear-gradient(90deg, #FFDF00 0%, #009C3B 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
                  }}>
                    CONVOCADOS
                  </span>
                </p>
              </div>

              {/* CENTER — diamond with stars */}
              <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-1.5" style={{ zIndex: 20 }}>
                <div style={{ filter: 'drop-shadow(0 0 16px rgba(255,200,0,0.6))' }}>
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 60,
                      height: 60,
                      background: 'linear-gradient(145deg, #FFE84D 0%, #FFDF00 50%, #C98800 100%)',
                      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                      boxShadow: 'inset 0 3px 6px rgba(255,255,255,0.4)',
                    }}
                  >
                    <span style={{ fontSize: 24, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>🐾</span>
                  </div>
                </div>
                <div className="flex gap-[2px]" style={{ color: BR.yellow, opacity: 0.9, filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))' }}>
                  {'★★★★★'.split('').map((s, i) => <span key={i} style={{ fontSize: 8 }}>{s}</span>)}
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,223,0,0.65)', margin: 0 }}>Edição</p>
                  <p style={{ fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 900, lineHeight: 1, color: BR.yellow, textShadow: '0 3px 10px rgba(0,0,0,0.4)', margin: 0 }}>2026</p>
                </div>
                <BrazilBadge size={54} />
              </div>
            </div>

            {/* Bottom tricolor stripe */}
            <div className="relative z-10 overflow-hidden" style={{ height: 9 }}>
              <div className="flex h-full">
                <div className="flex-1" style={{ background: BR.green }} />
                <div className="flex-1" style={{ background: BR.yellow }} />
                <div className="flex-1" style={{ background: BR.blue }} />
                <div className="flex-1" style={{ background: BR.yellow }} />
                <div className="flex-1" style={{ background: BR.green }} />
              </div>
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)' }}
              />
            </div>
          </div>

          {/* ─── Album Body ─── */}
          <div className="relative overflow-hidden" style={{
            backgroundColor: '#001D5E',
            backgroundImage: 'url("/album-bg.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'bottom center',
            borderTop: '2px solid #FFDF00'
          }}>

            {/* Frosted white overlay to make the background subtle and let stickers pop */}
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] pointer-events-none z-0" />

            {/* Sub-header strip */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 md:px-6 py-3.5 bg-white shadow-md"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}
            >
              <div className="flex items-center justify-between w-full md:w-auto">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-lg md:text-xl drop-shadow-sm shrink-0">🏆</span>
                  <span className="truncate" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#002776' }}>
                    Comissão Técnica: Lucianinha
                  </span>
                </div>
                {loading && (
                  <span style={{ fontSize: 10, color: '#666' }} className="animate-pulse md:hidden shrink-0 ml-2">
                    ...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                {loading && (
                  <span style={{ fontSize: 10, color: '#666' }} className="animate-pulse hidden md:inline">
                    Carregando...
                  </span>
                )}

                {/* Score/Slots */}
                <div className="flex items-center justify-center bg-gradient-to-br from-[#002776] to-[#001D5E] text-white px-2.5 py-1 rounded-md shadow-sm border border-[#FFDF00]/30 shrink-0" style={{ minWidth: 48 }}>
                  <span style={{ fontSize: 14, fontWeight: 900, lineHeight: 1 }}>{filledCount}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginLeft: 2, lineHeight: 1 }}>/{TOTAL_SLOTS}</span>
                </div>

                {/* Thematic Progress Bar Wrapper */}
                <div className="relative flex-1 md:w-64 h-5 mx-1.5">
                  {/* Track */}
                  <div className="absolute inset-0 rounded-full overflow-hidden bg-[#e1e8f0] border border-black/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]">
                    {/* Background Field Stripes */}
                    <div className="absolute inset-0 opacity-[0.06]" style={{
                      background: 'repeating-linear-gradient(90deg, #000 0px, #000 12px, transparent 12px, transparent 24px)'
                    }} />

                    {/* Fill */}
                    <motion.div
                      className="absolute top-0 bottom-0 left-0 rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${BR.green} 0%, #3dba6b 50%, ${BR.yellow} 100%)`,
                        boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.4)'
                      }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${progressPct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, type: "spring", bounce: 0.2 }}
                    >
                      {/* Shine effect at the end of the bar */}
                      <div className="absolute top-0 bottom-0 right-0 w-8" style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6) 50%, transparent)'
                      }} />
                    </motion.div>
                  </div>

                  {/* Tracking Icon */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center z-10"
                    style={{ width: 24, height: 24, marginLeft: -12 }}
                    initial={{ left: '0%' }}
                    whileInView={{ left: `${progressPct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, type: "spring", bounce: 0.2 }}
                  >
                    <span style={{ fontSize: 18, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>⚽</span>
                  </motion.div>
                </div>

                <span className="text-right shrink-0" style={{ minWidth: 36, fontSize: 14, fontWeight: 900, color: BR.green }}>
                  {progressPct}%
                </span>
              </div>
            </div>
            {/* Rainbow underline */}
            <div className="relative z-10 h-[2px] mx-6 rounded-full"
              style={{ background: `linear-gradient(90deg, ${BR.green}55, ${BR.yellow}55, transparent)` }}
            />

            {/* Sticker grid */}
            <div className="relative z-10 p-5 md:p-8">
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
                  {slots.map((slot) =>
                    slot.type === 'filled' ? (
                      <FilledSticker
                        key={slot.card.id}
                        card={slot.card}
                        canAdmin={canAdmin}
                        onDelete={handleDelete}
                        onEdit={setEditTarget}
                        onView={setViewingImage}
                      />
                    ) : (
                      <EmptySlot
                        key={`empty-${slot.number}`}
                        number={slot.number}
                        canAdmin={canAdmin}
                        onAdd={() => setUploadOpen(true)}
                      />
                    )
                  )}
                </div>
              </AnimatePresence>
            </div>

            {/* Album footer */}
            <div
              className="relative z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#009C3B] via-[#004D28] to-[#009C3B]"
            >
              <div className="flex items-center gap-2">

                <p style={{ fontSize: 11, color: '#fff', fontWeight: 600, margin: 0, letterSpacing: '0.05em' }}>
                  PetCão · Rumo à Vitória
                </p>
              </div>
              {/* Tricolor dots */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                <div className="w-2 h-2 rounded-full bg-[#FFDF00] shadow-sm" />
                <div className="w-2 h-2 rounded-full bg-[#002776] shadow-sm" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <StickerUploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => { setUploadOpen(false); loadStickers(); }}
      />
      <EditStickerModal
        card={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleEdit}
      />

      {/* Lightbox Modal */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingImage(null)}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 cursor-zoom-out gap-6"
          >
            <motion.img
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              src={viewingImage}
              className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain ring-4 ring-white/10"
              alt="Visualização da Figurinha"
              onClick={(e) => e.stopPropagation()} // Prevent clicking the image from closing it if they want to drag, but a click outside closes.
            />
            
            {/* Download Button */}
            <motion.button 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full flex items-center gap-2 text-white text-sm font-medium transition-colors z-50 cursor-pointer" 
              onClick={handleDownloadImage}
              title="Baixar Figurinha"
            >
              <Download className="w-4 h-4" />
              Baixar Figurinha
            </motion.button>

            {/* Close Button Hint */}
            <div className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer transition-colors" onClick={() => setViewingImage(null)}>
              ✕
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
