import { useEffect, useState } from 'react';
import {
  X, Home, Scissors, CalendarDays, PawPrint, Star, MapPin,
  User, Settings, ChevronRight, LogOut, Sun, Moon, Camera,
  Clock, Wrench, Package,
} from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import logoPetDefault from '@/assets/logopet.webp';
import { useTestModes } from '@/contexts/TestModesContext';

interface MobileDrawerMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

const exploreItems = [
  { id: 'album',       icon: PawPrint,     label: '🏆 Álbum',    color: '#009C3B', bg: 'rgba(255,223,0,0.25)' },
  { id: 'servicos',    icon: Scissors,     label: 'Serviços',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  { id: 'pacotes',     icon: Package,      label: 'Pacotes',     color: '#3B82F6', bg: 'rgba(59,130,246,0.15)'  },
  { id: 'fotos',       icon: Camera,       label: 'Galeria',     color: '#EC4899', bg: 'rgba(236,72,153,0.15)'  },
  { id: 'avaliacoes',  icon: Star,         label: 'Depoimentos', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)'  },
  { id: 'localizacao', icon: MapPin,       label: 'Localização', color: '#10B981', bg: 'rgba(16,185,129,0.15)'  },
];

const accountItems = [
  { id: 'meus-dados', icon: User,         label: 'Meus Dados',   color: '#6366F1', bg: 'rgba(99,102,241,0.15)'  },
  { id: 'meus-pets',  icon: PawPrint,     label: 'Meus Pets',    color: '#F472B6', bg: 'rgba(244,114,182,0.15)' },
  { id: 'agenda',     icon: CalendarDays, label: 'Minha Agenda', color: '#34D399', bg: 'rgba(52,211,153,0.15)'  },
];

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pendente:   { label: 'Pendente',   color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  dot: '#F59E0B' },
  confirmado: { label: 'Confirmado', color: '#10B981', bg: 'rgba(16,185,129,0.15)',  dot: '#10B981' },
  remarcado:  { label: 'Remarcado', color: '#3B82F6',  bg: 'rgba(59,130,246,0.15)', dot: '#3B82F6' },
};

export function MobileDrawerMenu({ open, onOpenChange, onOpenLogin }: MobileDrawerMenuProps) {
  const { isAuthenticated, user, logout, canAccessDashboard, canModerate, isDev, appointments } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  const logoSrc = branding.logoUrl || logoPetDefault;
  const { clientModeActive } = useTestModes();
  const showAdmin = isAuthenticated && !clientModeActive && (canAccessDashboard() || canModerate());
  const isDarkMode = theme === 'dark';

  /* animation */
  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
    } else {
      setAnimating(false);
      const t = setTimeout(() => setVisible(false), 380);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!visible) return null;

  const close = () => onOpenChange(false);

  /* upcoming appointments (max 3) */
  const upcomingAppointments = (() => {
    if (!isAuthenticated || !appointments?.length) return [];
    const now = new Date();
    return appointments
      .filter(a => {
        if (a.status === 'cancelado' || a.status === 'realizado') return false;
        return new Date(`${a.date}T${a.time}`) >= now;
      })
      .sort((a, b) =>
        new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
      )
      .slice(0, 3);
  })();

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' });

  const scrollTo = (id: string) => {
    close();
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else { navigate('/'); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 500); }
    }, 380);
  };

  const handleAccountItem = (id: string) => {
    if (!isAuthenticated) { close(); navigate('/auth/login'); return; }
    close(); navigate('/perfil');
  };

  const handleAdmin = () => {
    close();
    if (canAccessDashboard()) navigate('/admin/dashboard');
    else if (canModerate()) navigate('/admin/moderacao');
  };

  const handleLogout = () => { close(); logout(); navigate('/'); };
  const handleEditProfile = () => { close(); navigate('/perfil'); };

  const primaryPet = (() => {
    if (!user?.pets?.length) return null;
    const pid = (user as any)?.primaryPetId;
    return pid ? (user.pets.find(p => p.id === pid) || user.pets[0]) : user.pets[0];
  })();

  /* colour tokens */
  const panelBg    = isDarkMode ? '#0D0D1A' : '#F4F4F8';
  const cardBg     = isDarkMode ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.90)';
  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.08)'  : 'rgba(0,0,0,0.07)';
  const divider    = isDarkMode ? 'rgba(255,255,255,0.06)'  : 'rgba(0,0,0,0.06)';
  const textMain   = isDarkMode ? '#FFFFFF' : '#0A0A14';
  const textSub    = isDarkMode ? 'rgba(255,255,255,0.45)'  : 'rgba(10,10,20,0.42)';

  /* ─── AVATAR size ─────────────────────────────────────────── */
  const AVATAR_SIZE = 72;
  const BANNER_H    = 88;
  const AVATAR_OFFSET = AVATAR_SIZE / 2; // how much it overflows down

  return (
    <div className="fixed inset-0 z-[100] lg:hidden">
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'absolute', inset: 0,
          background: isDarkMode ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0.38)',
          backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
          opacity: animating ? 1 : 0, transition: 'opacity 380ms ease',
        }}
      />

      {/* Bottom-sheet panel */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        maxHeight: '96dvh',
        background: panelBg,
        borderRadius: '28px 28px 0 0',
        transform: animating ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 -10px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
          <div style={{ width: 38, height: 5, borderRadius: 99, background: isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.13)' }} />
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 36 }}>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 14px' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: textMain, letterSpacing: '-0.3px' }}>Menu</span>
            <button
              onClick={close}
              aria-label="Fechar"
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={16} color={textMain} />
            </button>
          </div>

          {/* ── Profile card ─────────────────────────────────── */}
          <div style={{
            margin: '0 16px 8px', borderRadius: 22, overflow: 'visible',
            background: cardBg, border: `1px solid ${cardBorder}`,
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            boxShadow: isDarkMode ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
            position: 'relative',
          }}>
            {/* Gradient banner */}
            <div style={{
              height: isAuthenticated ? BANNER_H : 90,
              background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 45%, #0EA5E9 100%)',
              position: 'relative', flexShrink: 0,
              overflow: 'hidden',
              borderRadius: '22px 22px 0 0',
            }}>
              {/* Decorative mesh blobs */}
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', filter: 'blur(2px)' }} />
              <div style={{ position: 'absolute', bottom: -20, right: 24, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ position: 'absolute', top: 10, left: '40%', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            </div>

            {/* Avatar — centrado no banner quando NÃO logado, canto esquerdo quando logado */}
            <div style={{
              position: 'absolute',
              top: (isAuthenticated ? BANNER_H : 90) - AVATAR_OFFSET,
              ...(isAuthenticated
                ? { left: 18 }
                : { left: '50%', transform: 'translateX(-50%)' }
              ),
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: '50%',
              border: `4px solid ${panelBg}`,
              background: isDarkMode ? '#1C1C2E' : '#fff',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              zIndex: 2,
            }}>
              {isAuthenticated && user?.avatarUrl ? (
                <OptimizedImage src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-full" aspectRatio="square" />
              ) : (
                <OptimizedImage src={logoSrc} alt="Logo" style={{ width: 52, height: 52, objectFit: 'contain' }} showSkeleton={false} />
              )}
            </div>

            {/* Info area — padTop accounts for avatar overflow */}
            <div style={{
              paddingTop: AVATAR_OFFSET + 10,
              paddingLeft: isAuthenticated ? 18 : 0,
              paddingRight: isAuthenticated ? 18 : 0,
              paddingBottom: 20,
            }}>
              {isAuthenticated && user ? (
                <>
                  <p style={{ fontSize: 17, fontWeight: 700, color: textMain, margin: 0, letterSpacing: '-0.2px' }}>{user.name}</p>
                  <p style={{ fontSize: 12, color: textSub, margin: '2px 0 0' }}>{user.phone || user.email}</p>

                  {/* Pet chips */}
                  {user.pets.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {user.pets.map(pet => (
                        <span key={pet.id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 99,
                          background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(139,92,246,0.22)',
                          fontSize: 11, fontWeight: 600, color: '#8B5CF6',
                        }}>
                          🐾 {pet.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* ── Appointments section ────────────────────── */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CalendarDays size={13} color="#6366F1" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                          Agendamentos
                        </span>
                      </div>
                      {upcomingAppointments.length > 0 && (
                        <button
                          onClick={handleEditProfile}
                          style={{ fontSize: 11, fontWeight: 600, color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          Ver todos →
                        </button>
                      )}
                    </div>

                    {upcomingAppointments.length === 0 ? (
                      /* Empty state */
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 14px', borderRadius: 14,
                        background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                        border: `1px dashed ${cardBorder}`,
                      }}>
                        <CalendarDays size={18} color={textSub} style={{ flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: textMain }}>Nenhum agendamento</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: textSub }}>Agende um horário para seu pet</p>
                        </div>
                      </div>
                    ) : (
                      /* Appointment list */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {upcomingAppointments.map((appt, idx) => {
                          const sc = STATUS_MAP[appt.status] || STATUS_MAP['pendente'];
                          return (
                            <div
                              key={appt.id}
                              style={{
                                padding: '10px 14px', borderRadius: 14,
                                background: idx === 0
                                  ? (isDarkMode ? 'rgba(99,102,241,0.13)' : 'rgba(99,102,241,0.07)')
                                  : (isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                                border: idx === 0
                                  ? '1px solid rgba(99,102,241,0.22)'
                                  : `1px solid ${cardBorder}`,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                {/* Left */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {idx === 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                                      <Clock size={10} color="#6366F1" />
                                      <span style={{ fontSize: 9, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                        Próximo
                                      </span>
                                    </div>
                                  )}
                                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {appt.service}
                                  </p>
                                  <p style={{ margin: '2px 0 0', fontSize: 11, color: textSub }}>
                                    {formatDate(appt.date)} · {appt.time}
                                    {appt.petName && ` · ${appt.petName}`}
                                  </p>
                                </div>

                                {/* Status badge */}
                                <span style={{
                                  flexShrink: 0,
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  fontSize: 10, fontWeight: 600, color: sc.color,
                                  background: sc.bg, padding: '3px 8px', borderRadius: 99,
                                  whiteSpace: 'nowrap',
                                }}>
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                                  {sc.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Área do cliente button */}
                  <button
                    onClick={handleEditProfile}
                    style={{
                      marginTop: 14, width: '100%', padding: '12px', borderRadius: 14, border: 'none', cursor: 'pointer',
                      background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      color: textMain, fontSize: 14, fontWeight: 600, transition: 'background 200ms',
                    }}
                  >
                    Área do Cliente
                  </button>
                </>
              ) : (
                /* Not logged in — layout centralizado */
                <div style={{ textAlign: 'center', padding: '0 20px 4px' }}>
                  {/* Greeting */}
                  <p style={{
                    fontSize: 19, fontWeight: 800,
                    margin: 0, letterSpacing: '-0.4px',
                    lineHeight: 1.2,
                    color: textMain,
                  }}>
                    Olá{' '}
                    <span style={{
                      background: 'linear-gradient(90deg, #1A73E8 0%, #4285F4 40%, #FBBC04 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>Aumigo</span>! 🐾
                  </p>
                  <p style={{
                    fontSize: 13, color: textSub,
                    margin: '6px 0 0', lineHeight: 1.6,
                  }}>
                    Bem-vindo ao <strong style={{ color: textMain, fontWeight: 700 }}>PetCão</strong>!{' '}
                    Faça login para agendar e acompanhar seus pets.
                  </p>

                  {/* CTA button */}
                  <button
                    onClick={() => { close(); navigate('/auth/login'); }}
                    style={{
                      marginTop: 18, width: '100%', padding: '14px', borderRadius: 16, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 60%, #0EA5E9 100%)',
                      color: '#fff', fontSize: 15, fontWeight: 700,
                      letterSpacing: '-0.2px',
                      boxShadow: '0 6px 28px rgba(99,102,241,0.5)',
                      transition: 'transform 150ms, box-shadow 150ms',
                    }}
                    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.boxShadow = '0 3px 14px rgba(99,102,241,0.4)'; }}
                    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(99,102,241,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(99,102,241,0.5)'; }}
                  >
                    Entrar / Criar conta
                  </button>

                  {/* Divider hint */}
                  <p style={{ margin: '12px 0 0', fontSize: 11, color: textSub }}>
                    Novo por aqui?{' '}
                    <button
                      onClick={() => { close(); navigate('/auth/register'); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, fontWeight: 700, color: '#6366F1' }}
                    >
                      Crie sua conta grátis
                    </button>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Conta ────────────────────────────────────────── */}
          {isAuthenticated && (
            <>
              <SectionLabel text="Conta" textSub={textSub} />
              <MenuCard cardBg={cardBg} cardBorder={cardBorder} isDarkMode={isDarkMode}>
                {accountItems.map((item, i) => (
                  <MenuRow
                    key={item.id}
                    icon={item.icon} label={item.label}
                    iconColor={item.color} iconBg={item.bg}
                    onClick={() => handleAccountItem(item.id)}
                    divider={i < accountItems.length - 1}
                    dividerColor={divider} textMain={textMain} textSub={textSub} isDarkMode={isDarkMode}
                  />
                ))}
              </MenuCard>
            </>
          )}

          {/* ── Explorar ─────────────────────────────────────── */}
          <SectionLabel text="Explorar" textSub={textSub} />
          <MenuCard cardBg={cardBg} cardBorder={cardBorder} isDarkMode={isDarkMode}>
            <MenuRow
              icon={Home} label="Início"
              iconColor="#06B6D4" iconBg="rgba(6,182,212,0.15)"
              onClick={() => scrollTo('inicio')}
              divider
              dividerColor={divider} textMain={textMain} textSub={textSub} isDarkMode={isDarkMode}
            />
            {exploreItems.map((item, i) => (
              <MenuRow
                key={item.id}
                icon={item.icon} label={item.label}
                iconColor={item.color} iconBg={item.bg}
                onClick={() => scrollTo(item.id)}
                divider={i < exploreItems.length - 1}
                dividerColor={divider} textMain={textMain} textSub={textSub} isDarkMode={isDarkMode}
              />
            ))}
          </MenuCard>

          {/* ── Sistema ──────────────────────────────────────── */}
          <SectionLabel text="Sistema" textSub={textSub} />
          <MenuCard cardBg={cardBg} cardBorder={cardBorder} isDarkMode={isDarkMode}>
            {/* Dark mode toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', minHeight: 54 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isDarkMode ? <Moon size={16} color="#818CF8" /> : <Sun size={16} color="#6366F1" />}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: textMain }}>Modo Escuro</span>
              </div>
              <Switch checked={isDarkMode} onCheckedChange={v => setTheme(v ? 'dark' : 'light')} />
            </div>

            {showAdmin && (
              <>
                <div style={{ margin: '0 16px', height: 1, background: divider }} />
                <MenuRow
                  icon={Settings} label="Painel Admin"
                  iconColor="#8B5CF6" iconBg="rgba(139,92,246,0.15)"
                  onClick={handleAdmin}
                  divider={false}
                  dividerColor={divider} textMain={textMain} textSub={textSub} isDarkMode={isDarkMode}
                />
              </>
            )}

            {isAuthenticated && !clientModeActive && isDev() && (
              <>
                <div style={{ margin: '0 16px', height: 1, background: divider }} />
                <MenuRow
                  icon={Wrench} label="Painel Dev"
                  iconColor="#F59E0B" iconBg="rgba(245,158,11,0.15)"
                  onClick={() => { close(); navigate('/admin/devtools'); }}
                  divider={false}
                  dividerColor={divider} textMain={textMain} textSub={textSub} isDarkMode={isDarkMode}
                />
              </>
            )}
          </MenuCard>

          {/* ── Logout ───────────────────────────────────────── */}
          {isAuthenticated && (
            <div style={{ margin: '14px 16px 0' }}>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '13px', borderRadius: 16,
                  border: '1px solid rgba(239,68,68,0.22)',
                  background: 'rgba(239,68,68,0.07)',
                  color: '#EF4444', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 200ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.14)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.07)')}
              >
                <LogOut size={15} />
                Sair da conta
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

function SectionLabel({ text, textSub }: { text: string; textSub: string }) {
  return (
    <p style={{ padding: '18px 24px 8px', margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: textSub }}>
      {text}
    </p>
  );
}

function MenuCard({ children, cardBg, cardBorder, isDarkMode }: {
  children: React.ReactNode; cardBg: string; cardBorder: string; isDarkMode: boolean;
}) {
  return (
    <div style={{
      margin: '0 16px', borderRadius: 18, overflow: 'hidden',
      background: cardBg, border: `1px solid ${cardBorder}`,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      boxShadow: isDarkMode ? '0 2px 16px rgba(0,0,0,0.3)' : '0 2px 16px rgba(0,0,0,0.06)',
    }}>
      {children}
    </div>
  );
}

function MenuRow({
  icon: Icon, label, iconColor, iconBg, onClick, divider, dividerColor, textMain, textSub, isDarkMode,
}: {
  icon: React.ElementType; label: string; iconColor: string; iconBg: string;
  onClick: () => void; divider?: boolean; dividerColor: string;
  textMain: string; textSub: string; isDarkMode: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <>
      <button
        onClick={onClick}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px', minHeight: 54, border: 'none', cursor: 'pointer',
          background: pressed
            ? (isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)')
            : 'transparent',
          transition: 'background 150ms', textAlign: 'left',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          transform: pressed ? 'scale(0.88)' : 'scale(1)', transition: 'transform 150ms',
        }}>
          <Icon size={16} color={iconColor} />
        </div>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: textMain }}>{label}</span>
        <ChevronRight size={14} color={textSub} style={{ opacity: 0.55 }} />
      </button>
      {divider && <div style={{ margin: '0 16px 0 64px', height: 1, background: dividerColor }} />}
    </>
  );
}
