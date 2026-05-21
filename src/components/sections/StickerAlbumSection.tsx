import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Pencil } from 'lucide-react';
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
function FilledSticker({ card, canAdmin, onDelete, onEdit }: {
  card: StickerCard;
  canAdmin: boolean;
  onDelete: (id: string) => void;
  onEdit: (card: StickerCard) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.6, rotateY: -20 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ perspective: 1000 }}
    >
      <div
        className="relative bg-white rounded-lg p-1.5 cursor-default transition-transform duration-300"
        style={{
          boxShadow: hovered
            ? '0 20px 40px rgba(0,0,0,0.5), 0 0 0 2px #FFDF00, 0 0 25px rgba(255,223,0,0.5)'
            : '0 8px 24px rgba(0,0,0,0.3)',
          transform: hovered ? 'translateY(-8px) rotateY(5deg) scale(1.05)' : 'translateY(0) rotateY(0) scale(1)',
        }}
      >
        {/* Inner Gold/Green Card */}
        <div
          className="relative rounded overflow-hidden h-full flex flex-col"
          style={{
            background: 'linear-gradient(135deg, #004D28 0%, #008040 40%, #009C3B 100%)',
            border: '2px solid #FFDF00'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-2 py-1 bg-gradient-to-r from-[#002776] to-[#001D5E] border-b-2 border-[#FFDF00]">
            <span className="text-[10px] font-black text-white">2026</span>
            <span className="text-[10px] font-black tracking-widest text-[#FFDF00]">PETCÃO</span>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[#009C3B]"></span>
              <span className="w-2 h-2 rounded-full bg-[#FFDF00]"></span>
            </div>
          </div>

          {/* Holographic background pattern */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)',
            backgroundSize: '8px 8px'
          }} />

          {/* Photo Section */}
          <div className="relative mx-1 mt-1 border-2 border-white rounded-sm overflow-hidden" style={{ aspectRatio: '3/3.5' }}>
            <img
              src={card.url}
              alt={card.alt || card.pet_name || ''}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Holographic foil overlay on image */}
            <div className="absolute inset-0 pointer-events-none transition-opacity duration-500"
              style={{
                background: 'linear-gradient(125deg, transparent 20%, rgba(255,255,255,0.4) 40%, rgba(255,223,0,0.2) 60%, transparent 80%)',
                opacity: hovered ? 1 : 0,
                mixBlendMode: 'overlay'
              }}
            />
          </div>

          {/* Info Section */}
          <div className="px-1.5 py-1.5 flex-1 flex flex-col justify-end relative z-10 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <p className="font-black text-[12px] leading-tight truncate uppercase text-white drop-shadow-md">
                {card.pet_name || '?'}
              </p>
              <span className="text-[12px]" title="Brasil">🇧🇷</span>
            </div>
            {card.owner_name && (
              <p className="text-[#FFDF00] text-[8px] font-bold truncate mt-0.5 uppercase tracking-wide">
                Tutor: {card.owner_name}
              </p>
            )}
            {card.caption && (
              <p className="text-white/80 text-[8px] leading-tight mt-0.5 line-clamp-2 italic drop-shadow">
                "{card.caption}"
              </p>
            )}
          </div>

          {/* Dynamic reflection on hover */}
          <div className="absolute inset-0 pointer-events-none rounded transition-transform duration-500"
            style={{
              background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.3) 25%, transparent 30%)',
              transform: hovered ? 'translateX(100%)' : 'translateX(-100%)',
            }}
          />
        </div>

        {/* Admin actions */}
        {canAdmin && hovered && (
          <div className="absolute -top-3 -right-3 flex gap-1 z-20">
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
          background: 'rgba(255, 255, 255, 0.05)',
          border: `2px dashed ${canAdmin ? 'rgba(255,223,0,0.4)' : 'rgba(255,255,255,0.2)'}`,
          cursor: canAdmin ? 'pointer' : 'default',
          backdropFilter: 'blur(4px)',
        }}
        onClick={canAdmin ? onAdd : undefined}
        onMouseEnter={e => {
          if (canAdmin) {
            (e.currentTarget as HTMLElement).style.borderColor = BR.yellow;
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,223,0,0.1)';
          }
        }}
        onMouseLeave={e => {
          if (canAdmin) {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,223,0,0.4)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
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
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (card) {
      setPetName(card.pet_name || '');
      setOwnerName(card.owner_name || '');
      setCaption(card.caption || '');
    }
  }, [card]);

  const handleSave = async () => {
    if (!card) return;
    setSaving(true);
    try {
      await onSave(card.id, {
        pet_name: petName.trim() || null,
        owner_name: ownerName.trim() || null,
        caption: caption.trim() || null,
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
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Bio / Curiosidade</Label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 120))}
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
          <div style={{ background: 'linear-gradient(180deg, #f0f4f8 0%, #e1e8f0 100%)', borderTop: '2px solid #FFDF00' }}>

            {/* Sub-header strip */}
            <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-white"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🏆</span>
                <span className="hidden sm:inline" style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#002776' }}>
                  Comissão Técnica: Lucianinha
                </span>
              </div>
              <div className="flex items-center gap-3 md:gap-4">
                {loading && (
                  <span style={{ fontSize: 10, color: '#666' }} className="animate-pulse">
                    Carregando...
                  </span>
                )}
                <div className="flex items-center gap-2 md:gap-3">
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#002776' }}>
                    {filledCount}/{TOTAL_SLOTS}
                  </span>
                  <div className="relative w-24 md:w-32 h-2.5 rounded-full overflow-hidden bg-gray-200" style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${BR.green} 0%, #3dba6b 45%, ${BR.yellow} 100%)` }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${progressPct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 900, color: BR.green }}>
                    {progressPct}%
                  </span>
                </div>
              </div>
            </div>
            {/* Rainbow underline */}
            <div className="h-[2px] mx-6 rounded-full"
              style={{ background: `linear-gradient(90deg, ${BR.green}55, ${BR.yellow}55, transparent)` }}
            />

            {/* Sticker grid */}
            <div className="p-5 md:p-8">
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
              className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#009C3B] via-[#004D28] to-[#009C3B]"
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
    </section>
  );
}
