import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { motion, AnimatePresence } from 'framer-motion';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TermsModal } from '@/components/modals/TermsModal';
import { PrivacyModal } from '@/components/modals/PrivacyModal';
import { 
  ArrowLeft, Mail, User, PawPrint, Pencil, Plus, Trash2, 
  ArrowRight, Phone, Search, Loader2, CheckCircle2
} from 'lucide-react';
import { isValidPhone, formatPhone, toE164 } from '@/lib/phoneUtils';
import { supabase } from '@/integrations/supabase/client';
import logoPetDefault from '@/assets/logopet.webp';
import petTexture from '@/assets/pet-texture-gray.webp';
import authDogImage from '@/assets/auth-dog.webp';
import { cn } from '@/lib/utils';

const BREEDS = [
  'SRD', 'Poodle', 'Shih Tzu', 'Yorkshire', 'Spitz Alemão', 'Golden Retriever',
  'Labrador', 'Bulldog Francês', 'Pinscher', 'Dachshund', 'Beagle',
  'Past. Alemão', 'Border Collie',
];

interface PetForm {
  id?: string;
  name: string;
  breed: string;
  customBreed: string;
  size: string;
}

const emptyPet = (): PetForm => ({ name: '', breed: '', customBreed: '', size: '' });

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { branding } = useBranding();
  const { isAuthenticated, loginByPhone, login, loginWithGoogle, register } = useAuth();
  
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const isLogin = mode === 'login';

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [loginTab, setLoginTab] = useState<'phone' | 'email'>('phone');
  const [phoneStep, setPhoneStep] = useState<1 | 2>(1);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPhonePw, setLoginPhonePw] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginEmailPw, setLoginEmailPw] = useState('');

  const [regStep, setRegStep] = useState<0 | 1 | 2>(0);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPw, setRegPw] = useState('');
  const [regPwConfirm, setRegPwConfirm] = useState('');
  const [regPets, setRegPets] = useState<PetForm[]>([emptyPet()]);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  // Pre-registration state
  const [isPreRegistered, setIsPreRegistered] = useState(false);
  const [phoneSearching, setPhoneSearching] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const toggleMode = () => {
    const newMode = mode === 'login' ? 'register' : 'login';
    setMode(newMode);
    setError('');
    setRegStep(0);
    setRegName(''); setRegEmail(''); setRegPhone('');
    setRegPw(''); setRegPwConfirm('');
    setRegPets([emptyPet()]); setLgpdAccepted(false);
    setIsPreRegistered(false); setPhoneExists(false);
    setSearchParams({ mode: newMode }, { replace: true });
  };

  const handlePhoneLookup = async () => {
    setError('');
    if (!isValidPhone(regPhone)) { setError('Telefone inválido. Use DDD + número.'); return; }
    setPhoneSearching(true);
    setPhoneExists(false);
    setIsPreRegistered(false);
    const e164 = toE164(regPhone)!;
    const { data: lookup } = await supabase.rpc('lookup_account_by_phone', { phone_input: e164 });
    setPhoneSearching(false);
    if (lookup && lookup.length > 0) {
      const account = lookup[0];
      if (account.has_password) {
        setPhoneExists(true);
        return;
      }
      // Pre-registered by petshop
      setIsPreRegistered(true);
      const { data: profile } = await supabase.from('profiles').select('name, user_id').eq('phone', e164).maybeSingle();
      if (profile) {
        setRegName(profile.name || '');
        const { data: existingPets } = await supabase.from('pets').select('id, name, breed, size').eq('owner_id', profile.user_id);
        if (existingPets && existingPets.length > 0) {
          setRegPets(existingPets.map(p => ({ id: p.id, name: p.name, breed: p.breed || '', customBreed: '', size: p.size || '' })));
        }
      }
    }
    setRegStep(1);
  };

  const handlePhoneContinue = () => {
    setError('');
    if (!isValidPhone(loginPhone)) { setError('Telefone inválido.'); return; }
    setPhoneStep(2);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = loginTab === 'phone' 
      ? await loginByPhone(loginPhone, loginPhonePw)
      : await login(loginEmail.trim(), loginEmailPw);
    setLoading(false);
    if (!res.success) setError(res.error || 'Erro ao entrar.');
  };

  const handleRegContinue = () => {
    setError('');
    if (!regName.trim()) { setError('Informe seu nome.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) { setError('E-mail inválido.'); return; }
    if (regPw.length < 8) { setError('Senha curta (mín. 8).'); return; }
    if (regPw !== regPwConfirm) { setError('Senhas não conferem.'); return; }
    setRegStep(2);
  };

  const handleRegisterFinish = async () => {
    setError('');
    if (!regPets[0].name.trim()) { setError('Informe o nome do pet.'); return; }
    if (!lgpdAccepted) { setError('Aceite os termos.'); return; }
    setLoading(true);

    if (isPreRegistered) {
      const petsPayload = regPets.filter(p => p.name.trim()).map(p => ({
        id: p.id,
        name: p.name.trim(),
        size: (p.size || 'medio').toLowerCase(),
        breed: p.breed === 'Outros' ? p.customBreed : (p.breed || ''),
      }));
      const { data, error: fnError } = await supabase.functions.invoke('complete-registration', {
        body: { phone_e164: toE164(regPhone), password: regPw, email: regEmail.trim(), pets: petsPayload }
      });
      setLoading(false);
      if (fnError || (data && data.error)) { setError(data?.error || fnError?.message || 'Erro ao completar cadastro.'); return; }
      // Auto-login
      await supabase.auth.signInWithPassword({ email: regEmail.trim(), password: regPw });
      return;
    }

    const res = await register({
      name: regName.trim(), phone: regPhone, email: regEmail.trim(), password: regPw,
      petName: regPets[0].name.trim(), petSize: (regPets[0].size || 'medio').toLowerCase(),
      petBreed: regPets[0].breed === 'Outros' ? regPets[0].customBreed : (regPets[0].breed || ''),
      extraPets: regPets.slice(1).filter(p => p.name.trim()).map(p => ({
        name: p.name.trim(), size: (p.size || 'medio').toLowerCase(),
        breed: p.breed === 'Outros' ? p.customBreed : (p.breed || ''),
      }))
    });
    setLoading(false);
    if (!res.success) { setError(res.error || 'Erro ao criar conta.'); }
  };

  const handleGoogle = async () => {
    setError(''); setGoogleLoading(true);
    const res = await loginWithGoogle();
    setGoogleLoading(false);
    if (res && 'error' in res && res.error) setError('Erro com Google.');
  };

  const logoSrc = branding.logoUrl || logoPetDefault;

  return (
    <div className="min-h-screen flex flex-col md:items-center md:justify-center bg-primary md:bg-transparent md:p-4 md:bg-gradient-to-br md:from-primary/[0.04] md:via-background md:to-muted/30 dark:md:from-background dark:md:via-background dark:md:to-primary/[0.06] relative overflow-hidden">
      
      {/* Mobile background gradient */}
      <div className="absolute inset-0 md:hidden bg-gradient-to-br from-[#4AA0FF] to-[hsl(var(--petcao-blue-dark))] pointer-events-none z-0" />
      
      {/* Desktop texture overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: `url(${petTexture})`, backgroundSize: '400px' }} />

      {/* Mobile Top Controls (Top of the screen) */}
      <div className="md:hidden absolute top-6 left-6 right-6 z-50 flex items-center justify-between pointer-events-none">
        {isLogin ? (
          <Link to="/" className="pointer-events-auto flex items-center gap-2 px-4 py-2 h-10 bg-white/20 backdrop-blur-md border border-white/10 rounded-full text-white text-sm font-medium hover:bg-white/30 transition-all shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar para o site
          </Link>
        ) : (
          <button onClick={() => setMode('login')} className="pointer-events-auto flex items-center gap-2 px-4 py-2 h-10 bg-white/20 backdrop-blur-md border border-white/10 rounded-full text-white text-sm font-medium hover:bg-white/30 transition-all shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar para o login
          </button>
        )}
        <div className="pointer-events-auto flex items-center justify-center h-10 w-10 bg-white/20 backdrop-blur-md border border-white/10 rounded-full text-white shadow-sm hover:bg-white/30 transition-all [&>button]:bg-transparent [&>button]:hover:bg-transparent dark:[&>button]:bg-transparent dark:[&>button]:hover:bg-transparent [&_svg]:text-white dark:[&_svg]:text-white [&>button]:w-full [&>button]:h-full">
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile Header (Only visible on Mobile) */}
      <div className={cn(
        "md:hidden relative w-full flex flex-col items-start justify-start px-8 z-20 pointer-events-none transition-all duration-500",
        isLogin ? "h-[35vh] pt-[12vh]" : "h-[15vh] pt-[10vh]"
      )}>
        {isLogin && (
          <div className="w-full flex flex-col items-start animate-in fade-in slide-in-from-left-4 duration-500">
            <h1 className="text-[32px] font-bold tracking-tight text-white drop-shadow-sm leading-tight max-w-[60%]">
              Bem-vindo ao PetCão!
            </h1>
            <p className="text-white/90 text-[13px] font-medium mt-2 max-w-[55%] leading-relaxed">
              Acesse sua conta para gerenciar seus pets.
            </p>
          </div>
        )}
        {isLogin && (
          <div className="absolute bottom-0 -right-4 translate-y-[32%] w-48 h-48 z-30 pointer-events-auto">
            <OptimizedImage src={authDogImage} alt="Dog" className="w-full h-full object-contain drop-shadow-2xl" />
          </div>
        )}
      </div>

      {/* Main Card (Bottom Sheet on Mobile, Centered on Desktop) */}
      <div className="relative z-10 w-full flex-1 md:flex-none md:max-w-[1000px] md:h-[640px] bg-card md:bg-card/90 backdrop-blur-xl rounded-t-[40px] md:rounded-[40px] border-t md:border border-border/40 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-[0_32px_80px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] dark:md:shadow-[0_32px_80px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col md:flex-row">
        
        {/* Top Controls inside the Card (Desktop Only) */}
        <div className="hidden md:flex absolute top-6 left-6 right-6 z-50 items-center justify-between pointer-events-none">
          {isLogin ? (
            <Link to="/" className="pointer-events-auto flex items-center gap-2 px-4 py-2 h-10 bg-muted/50 backdrop-blur-md border border-border/40 rounded-full text-foreground text-sm font-medium hover:bg-muted transition-all shadow-sm">
              <ArrowLeft className="w-4 h-4" /> Voltar para o site
            </Link>
          ) : (
            <button onClick={() => setMode('login')} className="pointer-events-auto flex items-center gap-2 px-4 py-2 h-10 bg-muted/50 backdrop-blur-md border border-border/40 rounded-full text-foreground text-sm font-medium hover:bg-muted transition-all shadow-sm">
              <ArrowLeft className="w-4 h-4" /> Voltar para o login
            </button>
          )}
          <div className="pointer-events-auto flex items-center justify-center h-10 w-10 bg-muted/50 backdrop-blur-md border border-border/40 rounded-full shadow-sm hover:bg-muted transition-all [&>button]:bg-transparent [&>button]:hover:bg-transparent dark:[&>button]:bg-transparent dark:[&>button]:hover:bg-transparent [&_svg]:text-foreground dark:[&_svg]:text-white [&>button]:w-full [&>button]:h-full">
            <ThemeToggle />
          </div>
        </div>
        
        {/* Overlay Panel (Desktop Only) */}
        <motion.div 
          className="hidden md:flex absolute top-0 left-0 w-1/2 h-full z-20 bg-primary overflow-hidden pointer-events-auto"
          initial={false}
          animate={{ x: isLogin ? '100%' : '0%' }}
          transition={{ type: 'spring', stiffness: 180, damping: 24 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#4AA0FF] to-[hsl(var(--petcao-blue-dark))] flex flex-col items-center justify-center text-primary-foreground p-12 text-center overflow-hidden">
             
             {/* Subtle Decorative Background */}
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
             <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-black/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />
             
             {/* Pattern Overlay */}
             <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: `url(${petTexture})`, backgroundSize: '300px' }} />

             <AnimatePresence mode="wait">
               <motion.div
                 key={mode}
                 initial={{ opacity: 0, x: isLogin ? 40 : -40 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: isLogin ? -40 : 40 }}
                 transition={{ duration: 0.4 }}
                 className="relative z-10 w-full flex flex-col items-center"
               >
                  <div className="w-48 h-48 mx-auto flex items-center justify-center mb-2">
                    <OptimizedImage src={authDogImage} alt="Mascote PetCão" className="w-full h-full object-contain drop-shadow-2xl" />
                  </div>
                  
                  {isLogin ? (
                    <>
                      <h2 className="text-4xl font-bold tracking-tight mb-4 drop-shadow-sm text-white">Bem-vindo ao PetCão!</h2>
                      <p className="text-lg font-medium text-white max-w-[280px] mx-auto leading-relaxed mb-10">
                        Ainda não tem conta? Junte-se a nós hoje mesmo!
                      </p>
                      <button 
                        onClick={toggleMode} 
                        className="px-12 py-4 bg-transparent border-2 border-white/40 text-white rounded-full text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-primary transition-all duration-300 active:scale-95"
                      >
                        Criar Conta
                      </button>
                    </>
                  ) : (
                    <>
                      <h2 className="text-4xl font-bold tracking-tight mb-4 drop-shadow-sm text-white">Olá, Aumigo!</h2>
                      <p className="text-lg font-medium text-white max-w-[280px] mx-auto leading-relaxed mb-10">
                        Se já possui uma conta, entre agora mesmo.
                      </p>
                      <button 
                        onClick={toggleMode} 
                        className="px-12 py-4 bg-transparent border-2 border-white/40 text-white rounded-full text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-primary transition-all duration-300 active:scale-95"
                      >
                        Já tenho conta
                      </button>
                    </>
                  )}
               </motion.div>
             </AnimatePresence>
          </div>
        </motion.div>

        {/* LEFT COLUMN: LOGIN (Desktop) or BOTH (Mobile) */}
        <div className={cn(
          "w-full md:w-1/2 h-full p-6 sm:p-10 md:p-12 flex flex-col justify-center transition-opacity duration-500",
          !isLogin ? "hidden md:flex md:opacity-0 md:pointer-events-none" : "flex"
        )}>
          {isLogin && (
            <div className="space-y-5 md:space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
               <div className="space-y-1">
                 <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">Entrar no PetCão</h1>
                 <p className="text-muted-foreground dark:text-white/80 text-xs">Acesse sua conta para gerenciar seus pets.</p>
               </div>
               <div className="flex p-1 bg-muted/50 dark:bg-white/5 rounded-xl border border-transparent dark:border-white/10">
                 <button onClick={() => setLoginTab('phone')} className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all", loginTab === 'phone' ? "bg-card dark:bg-white/10 text-primary dark:text-white shadow-sm" : "text-muted-foreground dark:text-white/50 hover:text-foreground")}>TELEFONE</button>
                 <button onClick={() => setLoginTab('email')} className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all", loginTab === 'email' ? "bg-card dark:bg-white/10 text-primary dark:text-white shadow-sm" : "text-muted-foreground dark:text-white/50 hover:text-foreground")}>E-MAIL</button>
               </div>
               <form onSubmit={handleLogin} className="space-y-4">
                 {loginTab === 'phone' ? (
                   phoneStep === 1 ? (
                     <div className="space-y-3">
                       <div className="space-y-1"><Label className="text-xs">Telefone</Label><PhoneInput value={loginPhone} onChange={setLoginPhone} /></div>
                       <Button type="button" onClick={handlePhoneContinue} className="w-full h-12 rounded-xl font-bold dark:text-white">Continuar</Button>
                     </div>
                   ) : (
                     <div className="space-y-3">
                       <div className="flex items-center gap-2 bg-muted/40 dark:bg-white/5 p-2.5 rounded-xl border border-border/30 dark:border-white/10">
                         <span className="text-xs font-medium flex-1 dark:text-white/90">{formatPhone(loginPhone)}</span>
                         <button type="button" onClick={() => setPhoneStep(1)} className="text-primary dark:text-blue-400 p-1 hover:bg-white/10 rounded-md transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                       </div>
                       <div className="space-y-1"><Label className="text-xs">Sua Senha</Label><PasswordInput value={loginPhonePw} onChange={setLoginPhonePw} /></div>
                       <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-bold dark:text-white">{loading ? 'Entrando...' : 'Entrar Agora'}</Button>
                     </div>
                   )
                 ) : (
                   <div className="space-y-3">
                     <div className="space-y-1"><Label className="text-xs dark:text-white/70">E-mail</Label><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-white/40" /><Input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="exemplo@petcao.app" className="pl-12 h-12 rounded-xl text-sm dark:bg-white/5 dark:border-white/10 dark:placeholder:text-white/30 dark:text-white" /></div></div>
                     <div className="space-y-1"><Label className="text-xs dark:text-white/70">Sua Senha</Label><PasswordInput value={loginEmailPw} onChange={setLoginEmailPw} /></div>
                     <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-bold dark:text-white">{loading ? 'Entrando...' : 'Entrar Agora'}</Button>
                   </div>
                 )}
                 {error && <p className="text-xs text-destructive text-center font-medium">{error}</p>}
                 <div className="text-center"><Link to="/auth/forgot" className="text-[10px] font-semibold text-primary hover:underline uppercase tracking-wider">Esqueci minha senha</Link></div>
                 <div className="relative flex items-center gap-4 py-1"><div className="h-px bg-border flex-1" /><span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">OU</span><div className="h-px bg-border flex-1" /></div>
                 <GoogleButton onClick={handleGoogle} loading={googleLoading} />
                 <p className="md:hidden text-center text-xs text-muted-foreground mt-4">Novo por aqui? <button type="button" onClick={toggleMode} className="text-primary font-bold hover:underline">Criar uma conta</button></p>
               </form>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: REGISTER */}
        <div className={cn(
          "w-full md:w-1/2 h-full p-6 sm:p-10 md:p-12 flex flex-col transition-opacity duration-500 overflow-y-auto custom-scrollbar",
          isLogin ? "hidden md:flex md:opacity-0 md:pointer-events-none" : "flex",
          "justify-start md:justify-center pt-8 md:pt-12"
        )}>
           {!isLogin && (
             <div className="space-y-5 py-2 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="space-y-0.5">
                 <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">Criar Conta</h1>
                 <p className="text-muted-foreground dark:text-white/80 text-xs">
                   {regStep === 0 ? 'Verifique seu número para começar.' : regStep === 1 ? 'Seus dados pessoais.' : 'Dados do seu pet.'}
                 </p>
               </div>
               {/* 3-step progress bar */}
               <div className="flex gap-2 mb-1">
                 <div className={cn("h-1 flex-1 rounded-full transition-all duration-500", regStep >= 1 ? "bg-primary" : "bg-muted")} />
                 <div className={cn("h-1 flex-1 rounded-full transition-all duration-500", regStep >= 2 ? "bg-primary" : "bg-muted")} />
               </div>

               {/* STEP 0 — Phone */}
               {regStep === 0 && (
                 <div className="space-y-4">
                   <div className="space-y-2">
                     <Label className="text-xs dark:text-white/70 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Seu telefone (WhatsApp)</Label>
                     <PhoneInput value={regPhone} onChange={v => { setRegPhone(v); setPhoneExists(false); setError(''); }} />
                     {phoneExists && (
                       <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                         <CheckCircle2 className="w-4 h-4 shrink-0" />
                         <span>Este número já tem conta. <button type="button" onClick={toggleMode} className="font-bold underline">Faça login.</button></span>
                       </div>
                     )}
                   </div>
                   {error && <p className="text-xs text-destructive font-medium">{error}</p>}
                   <Button onClick={handlePhoneLookup} disabled={phoneSearching} className="w-full h-12 rounded-xl font-bold gap-2 dark:text-white">
                     {phoneSearching ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</> : <><Search className="w-4 h-4" /> Verificar e continuar</>}
                   </Button>
                   <div className="relative flex items-center gap-4 py-1"><div className="h-px bg-border flex-1" /><span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">OU</span><div className="h-px bg-border flex-1" /></div>
                   <GoogleButton onClick={handleGoogle} loading={googleLoading} />
                   <p className="md:hidden text-center text-xs text-muted-foreground mt-2">Já tem conta? <button type="button" onClick={toggleMode} className="text-primary font-bold hover:underline">Entrar</button></p>
                 </div>
               )}

               {/* STEP 1 — Personal Data */}
               {regStep === 1 && (
                 <div className="space-y-3">
                   <button onClick={() => { setRegStep(0); setError(''); }} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground dark:text-white/50 dark:hover:text-white"><ArrowLeft className="w-3.5 h-3.5" /> Mudar número</button>

                   {/* Phone tag */}
                   <div className="flex items-center gap-2 bg-muted/40 dark:bg-white/5 px-3 py-2 rounded-xl border border-border/30 dark:border-white/10">
                     <Phone className="w-3.5 h-3.5 text-muted-foreground dark:text-white/40 shrink-0" />
                     <span className="text-xs font-medium flex-1 dark:text-white/80">{formatPhone(regPhone)}</span>
                     <button type="button" onClick={() => { setRegStep(0); setError(''); }} className="text-primary dark:text-blue-400 p-1 hover:bg-white/10 rounded-md"><Pencil className="w-3 h-3" /></button>
                   </div>

                   {isPreRegistered && (
                     <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                       <CheckCircle2 className="w-4 h-4 shrink-0" />
                       <span>Encontramos seu pré-cadastro! Confirme os dados e crie sua senha.</span>
                     </div>
                   )}

                   <div className="space-y-1"><Label className="text-xs dark:text-white/70">Nome Completo</Label><div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground dark:text-white/40" /><Input value={regName} onChange={e => setRegName(e.target.value)} placeholder="Seu nome" readOnly={isPreRegistered} className={cn("pl-11 h-11 rounded-xl text-sm dark:bg-white/5 dark:border-white/10 dark:placeholder:text-white/30 dark:text-white", isPreRegistered && "opacity-70")} /></div></div>
                   <div className="space-y-1"><Label className="text-xs dark:text-white/70">E-mail</Label><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground dark:text-white/40" /><Input value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="exemplo@email.com" className="pl-11 h-11 rounded-xl text-sm dark:bg-white/5 dark:border-white/10 dark:placeholder:text-white/30 dark:text-white" /></div></div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     <div className="space-y-1"><Label className="text-xs dark:text-white/70">Senha</Label><PasswordInput value={regPw} onChange={setRegPw} /></div>
                     <div className="space-y-1"><Label className="text-xs dark:text-white/70">Confirmar</Label><PasswordInput value={regPwConfirm} onChange={setRegPwConfirm} /></div>
                   </div>
                   {error && <p className="text-xs text-destructive font-medium">{error}</p>}
                   <Button onClick={handleRegContinue} className="w-full h-12 rounded-xl font-bold gap-2 dark:text-white">Próximo Passo <ArrowRight className="w-4 h-4" /></Button>
                   {!isPreRegistered && (
                     <>
                       <div className="relative flex items-center gap-4 py-1"><div className="h-px bg-border flex-1" /><span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">OU</span><div className="h-px bg-border flex-1" /></div>
                       <GoogleButton onClick={handleGoogle} loading={googleLoading} />
                     </>
                   )}
                   <p className="md:hidden text-center text-xs text-muted-foreground mt-2">Já tem conta? <button type="button" onClick={toggleMode} className="text-primary font-bold hover:underline">Entrar</button></p>
                 </div>
               )}

               {/* STEP 2 — Pets */}
               {regStep === 2 && (
                 <div className="space-y-4">
                   <button onClick={() => { setRegStep(1); setError(''); }} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground dark:text-white/50 dark:hover:text-white"><ArrowLeft className="w-3.5 h-3.5" /> Voltar</button>
                   <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                     {regPets.map((pet, idx) => (
                       <div key={idx} className="p-4 rounded-2xl border border-border/40 bg-muted/20 relative space-y-3">
                         <div className="flex items-center justify-between">
                           <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                             <PawPrint className="w-3.5 h-3.5 text-primary" /> Pet {idx + 1}
                             {isPreRegistered && pet.id && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 normal-case tracking-normal">Pré-cadastrado</span>}
                           </span>
                           {regPets.length > 1 && (<button onClick={() => setRegPets(prev => prev.filter((_, i) => i !== idx))} className="text-destructive p-1 hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>)}
                         </div>
                         <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label className="text-[10px]">Nome</Label><Input value={pet.name} onChange={e => setRegPets(p => p.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder="Ex: Mel" className="h-10 rounded-lg" /></div><div className="space-y-1"><Label className="text-[10px]">Porte</Label><Select value={pet.size} onValueChange={v => setRegPets(p => p.map((item, i) => i === idx ? { ...item, size: v } : item))}><SelectTrigger className="h-10 rounded-lg text-xs"><SelectValue placeholder="Porte" /></SelectTrigger><SelectContent><SelectItem value="pequeno">Pequeno</SelectItem><SelectItem value="medio">Médio</SelectItem><SelectItem value="grande">Grande</SelectItem></SelectContent></Select></div></div>
                         <div className="space-y-1"><Label className="text-[10px]">Raça</Label><Select value={pet.breed} onValueChange={v => setRegPets(p => p.map((item, i) => i === idx ? { ...item, breed: v } : item))}><SelectTrigger className="h-10 rounded-lg text-xs"><SelectValue placeholder="Raça" /></SelectTrigger><SelectContent>{BREEDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}<SelectItem value="Outros">Outros</SelectItem></SelectContent></Select>{pet.breed === 'Outros' && (<Input value={pet.customBreed} onChange={e => setRegPets(p => p.map((item, i) => i === idx ? { ...item, customBreed: e.target.value } : item))} placeholder="Qual a raça?" className="h-10 rounded-lg mt-2" />)}</div>
                       </div>
                     ))}
                   </div>
                   {regPets.length < 3 && (<Button variant="ghost" size="sm" onClick={() => setRegPets(prev => [...prev, emptyPet()])} className="w-full border-2 border-dashed border-border/60 dark:border-white/10 dark:text-white/70 rounded-xl py-6 hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-white/5"><Plus className="w-4 h-4 mr-2" /> Adicionar outro pet</Button>)}
                   <div className="flex items-start gap-3 p-3 bg-muted/30 dark:bg-white/5 rounded-xl border border-border/40 dark:border-white/10"><Checkbox id="auth-lgpd" checked={lgpdAccepted} onCheckedChange={v => setLgpdAccepted(v === true)} className="mt-1 dark:border-white/30" /><label htmlFor="auth-lgpd" className="text-[11px] leading-relaxed text-muted-foreground dark:text-white/70 cursor-pointer">Concordo com os <button type="button" onClick={() => setTermsOpen(true)} className="text-primary dark:text-blue-400 font-bold">Termos</button> e <button type="button" onClick={() => setPrivacyOpen(true)} className="text-primary dark:text-blue-400 font-bold">Privacidade</button>.</label></div>
                   {error && <p className="text-xs text-destructive font-medium text-center">{error}</p>}
                   <Button onClick={handleRegisterFinish} disabled={loading || !lgpdAccepted} className="w-full h-14 rounded-2xl font-bold shadow-lg shadow-primary/20 dark:text-white gap-2">
                     {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {isPreRegistered ? 'Completando...' : 'Criando...'}</> : isPreRegistered ? '✅ Completar meu cadastro' : 'Finalizar Cadastro'}
                   </Button>
                 </div>
               )}
             </div>
           )}
        </div>
      </div>

      <TermsModal open={termsOpen} onOpenChange={setTermsOpen} />
      <PrivacyModal open={privacyOpen} onOpenChange={setPrivacyOpen} />

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }
      ` }} />
    </div>
  );
}
