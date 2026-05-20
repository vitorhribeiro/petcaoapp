import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, User, PawPrint, ArrowLeft, Plus, Trash2, Phone, Search, CheckCircle2, Loader2 } from 'lucide-react';
import { isValidPhone, toE164 } from '@/lib/phoneUtils';
import { Checkbox } from '@/components/ui/checkbox';
import { TermsModal } from '@/components/modals/TermsModal';
import { PrivacyModal } from '@/components/modals/PrivacyModal';
import { supabase } from '@/integrations/supabase/client';

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

type Step = 0 | 1 | 2;
type PhoneState = 'idle' | 'searching' | 'new' | 'preregistered' | 'exists';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, register, loginWithGoogle } = useAuth();

  const [step, setStep] = useState<Step>(0);
  const [phoneState, setPhoneState] = useState<PhoneState>('idle');

  // Step 0 — Phone lookup
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Pre-registration data (loaded from DB if pre-registered)
  const [isPreRegistered, setIsPreRegistered] = useState(false);
  const [preRegisteredId, setPreRegisteredId] = useState<string | null>(null);

  // Step 1 fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 fields — multiple pets
  const [pets, setPets] = useState<PetForm[]>([emptyPet()]);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const updatePet = (index: number, field: keyof PetForm, value: string) => {
    setPets(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const addPet = () => {
    if (pets.length < 5) setPets(prev => [...prev, emptyPet()]);
  };

  const removePet = (index: number) => {
    if (pets.length > 1) setPets(prev => prev.filter((_, i) => i !== index));
  };

  // Step 0 — Search by phone
  const handlePhoneSearch = async () => {
    setPhoneError('');
    if (!isValidPhone(phone)) {
      setPhoneError('Telefone inválido. Use DDD + número (10 ou 11 dígitos).');
      return;
    }

    setPhoneState('searching');
    const e164 = toE164(phone)!;

    const { data: lookup } = await supabase.rpc('lookup_account_by_phone', { phone_input: e164 });

    if (lookup && lookup.length > 0) {
      const account = lookup[0];
      // Has full password = already registered
      if (account.has_password) {
        setPhoneState('exists');
        return;
      }
      // No password = pre-registered by the petshop
      setPhoneState('preregistered');
      setIsPreRegistered(true);

      // Load their pre-registered data
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, user_id')
        .eq('phone', e164)
        .maybeSingle();

      if (profile) {
        setName(profile.name || '');
        setPreRegisteredId(profile.user_id);

        // Load their pets
        const { data: existingPets } = await supabase
          .from('pets')
          .select('id, name, breed, size')
          .eq('owner_id', profile.user_id);

        if (existingPets && existingPets.length > 0) {
          setPets(existingPets.map(p => ({
            id: p.id,
            name: p.name,
            breed: p.breed || '',
            customBreed: '',
            size: p.size || '',
          })));
        }
      }
      setStep(1);
      return;
    }

    // Not found — new user
    setPhoneState('new');
    setIsPreRegistered(false);
    setStep(1);
  };

  // Step 1 validation
  const handleContinue = () => {
    setError('');
    if (!name.trim()) { setError('Informe seu nome completo.'); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Informe um e-mail válido.'); return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.'); return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('A senha deve conter letras e números.'); return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não conferem.'); return;
    }
    setStep(2);
  };

  // Final submit
  const handleFinish = async () => {
    setError('');
    if (!pets[0].name.trim()) { setError('Informe o nome do pet.'); return; }
    if (!lgpdAccepted) { setError('Você precisa aceitar os termos para continuar.'); return; }

    setLoading(true);

    if (isPreRegistered && preRegisteredId) {
      // Complete pre-registration via edge function
      const petsPayload = pets
        .filter(p => p.name.trim())
        .map(p => ({
          id: p.id,
          name: p.name.trim(),
          size: (p.size || 'medio').toLowerCase(),
          breed: p.breed === 'Outros' ? p.customBreed : (p.breed || ''),
        }));

      const { data, error: fnError } = await supabase.functions.invoke('complete-registration', {
        body: {
          phone_e164: toE164(phone),
          password,
          email: email.trim(),
          pets: petsPayload,
        }
      });

      setLoading(false);

      if (fnError || (data && data.error)) {
        setError(data?.error || fnError?.message || 'Erro ao completar cadastro.');
        return;
      }

      // Now login with email
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        // Try with virtual email as fallback
        const e164 = toE164(phone)!;
        const digits = e164.replace(/\D/g, '');
        await supabase.auth.signInWithPassword({
          email: `${digits}@phone.petcao.app`,
          password,
        });
      }

      return;
    }

    // Brand new user — use the standard register flow
    const firstPet = pets[0];
    const firstBreed = firstPet.breed === 'Outros' ? firstPet.customBreed : firstPet.breed;

    const extraPets = pets.slice(1)
      .filter(p => p.name.trim())
      .map(p => ({
        name: p.name.trim(),
        size: (p.size || 'medio').toLowerCase(),
        breed: p.breed === 'Outros' ? p.customBreed : (p.breed || ''),
      }));

    const result = await register({
      name: name.trim(),
      phone,
      email: email.trim(),
      password,
      petName: firstPet.name.trim(),
      petSize: (firstPet.size || 'medio').toLowerCase(),
      petBreed: firstBreed || '',
      extraPets: extraPets.length > 0 ? extraPets : undefined,
    });
    setLoading(false);

    if (!result.success) {
      if (result.error?.includes('já cadastrado') || result.error?.includes('already registered')) {
        setStep(0);
      }
      setError(result.error || 'Erro ao criar conta.');
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    const result = await loginWithGoogle();
    setGoogleLoading(false);
    if (result && 'error' in result && result.error) {
      setError('Erro ao criar conta com Google. Tente novamente.');
    }
  };

  // ---- Subtitle & progress ----
  const stepSubtitles: Record<number, string> = {
    0: 'Verificar seu telefone',
    1: 'Seus dados pessoais',
    2: `Dados do${pets.length > 1 ? 's' : ''} seu${pets.length > 1 ? 's' : ''} pet${pets.length > 1 ? 's' : ''}`,
  };

  const progressWidth = step === 0 ? '0%' : step === 1 ? '50%' : '100%';

  return (
    <AuthLayout
      title="Criar conta"
      subtitle={stepSubtitles[step]}
    >
      {/* Progress stepper — only show from step 1 */}
      {step > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                transition-all duration-500 ease-out
                ${step === 1 ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110' : 'bg-primary text-primary-foreground'}
              `}>
                {step === 2 ? '✓' : '1'}
              </div>
              <span className={`text-xs font-medium transition-colors duration-300 ${step === 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                Seus dados
              </span>
            </div>

            <div className="flex-1 h-0.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                style={{ width: step === 2 ? '100%' : '0%' }}
              />
            </div>

            <div className="flex items-center gap-2 flex-1 justify-end">
              <span className={`text-xs font-medium transition-colors duration-300 ${step === 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                Seu{pets.length > 1 ? 's' : ''} pet{pets.length > 1 ? 's' : ''}
              </span>
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                transition-all duration-500 ease-out
                ${step === 2 ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110' : 'bg-muted text-muted-foreground'}
              `}>
                2
              </div>
            </div>
          </div>

          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700 ease-out"
              style={{ width: progressWidth }}
            />
          </div>
        </div>
      )}

      {/* Step 0 — Phone search */}
      {step === 0 && (
        <div className="space-y-5">
          <div className="space-y-2 text-center pb-1">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shadow-sm">
              <Phone className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Digite seu telefone para verificar se já temos um cadastro iniciado pra você.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="step0-phone" className="text-sm font-medium">Seu telefone (WhatsApp)</Label>
            <PhoneInput id="step0-phone" value={phone} onChange={v => { setPhone(v); setPhoneState('idle'); setPhoneError(''); }} />
            {phoneError && <p className="text-sm text-destructive">{phoneError}</p>}

            {phoneState === 'exists' && (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mt-1">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Este número já tem uma conta. <Link to="/auth/login" className="font-semibold underline">Faça login aqui.</Link></span>
              </div>
            )}
          </div>

          <Button
            type="button"
            className="w-full h-[52px] rounded-[14px] text-base font-semibold gap-2"
            onClick={handlePhoneSearch}
            disabled={phoneState === 'searching'}
          >
            {phoneState === 'searching'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
              : <><Search className="w-4 h-4" /> Verificar e continuar</>
            }
          </Button>

          <AuthDivider />
          <GoogleButton onClick={handleGoogle} loading={googleLoading} />

          <p className="text-center text-sm text-muted-foreground pt-2">
            Já tem conta?{' '}
            <Link to="/auth/login" className="text-primary hover:underline font-medium">Entrar</Link>
          </p>
        </div>
      )}

      {/* Steps 1 and 2 */}
      {step > 0 && (
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: step === 2 ? 'translateX(-100%)' : 'translateX(0)' }}
          >
            {/* Step 1 */}
            <div className="w-full shrink-0 space-y-4" style={{ visibility: step === 1 ? 'visible' : 'hidden' }}>
              <button
                type="button"
                onClick={() => { setStep(0); setError(''); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Mudar número
              </button>

              {isPreRegistered && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Encontramos um pré-cadastro! Seus dados foram carregados. Agora só confirme e-mail e senha.</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="reg-name" className="text-sm font-medium">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="reg-name"
                    placeholder="Seu nome"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    readOnly={isPreRegistered}
                    className={`pl-11 h-[52px] rounded-[14px] text-base border-border/60 ${isPreRegistered ? 'bg-muted/50 text-muted-foreground' : ''}`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-email" className="text-sm font-medium">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input id="reg-email" type="email" placeholder="email@dominio.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-11 h-[52px] rounded-[14px] text-base border-border/60" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-pw" className="text-sm font-medium">Senha</Label>
                <PasswordInput id="reg-pw" value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres (letras + números)" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-pw2" className="text-sm font-medium">Confirmar senha</Label>
                <PasswordInput id="reg-pw2" value={confirmPassword} onChange={setConfirmPassword} />
              </div>

              {error && step === 1 && <p className="text-sm text-destructive text-center">{error}</p>}

              <Button type="button" className="w-full h-[52px] rounded-[14px] text-base font-semibold" onClick={handleContinue}>
                Continuar
              </Button>

              {!isPreRegistered && (
                <>
                  <AuthDivider />
                  <GoogleButton onClick={handleGoogle} loading={googleLoading} />
                  <p className="text-center text-sm text-muted-foreground pt-2">
                    Já tem conta?{' '}
                    <Link to="/auth/login" className="text-primary hover:underline font-medium">Entrar</Link>
                  </p>
                </>
              )}
            </div>

            {/* Step 2 */}
            <div className="w-full shrink-0 space-y-4" style={{ visibility: step === 2 ? 'visible' : 'hidden' }}>
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar para dados pessoais
              </button>

              {/* Pet cards */}
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {pets.map((pet, idx) => (
                  <div key={idx} className="relative space-y-3 p-4 rounded-2xl border border-border/60 bg-muted/30">
                    {/* Pet header */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <PawPrint className="w-3.5 h-3.5 text-primary" />
                        {pets.length > 1 ? `Pet ${idx + 1}` : 'Seu pet'}
                        {isPreRegistered && pet.id && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Pré-cadastrado
                          </span>
                        )}
                      </span>
                      {pets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePet(idx)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Pet name */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome do pet {idx === 0 && '*'}</Label>
                      <Input
                        value={pet.name}
                        onChange={e => updatePet(idx, 'name', e.target.value)}
                        placeholder="Ex: Rex, Luna..."
                        className="h-[48px] rounded-xl text-base border-border/60"
                      />
                    </div>

                    {/* Breed */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Raça</Label>
                      <Select value={pet.breed} onValueChange={v => updatePet(idx, 'breed', v)}>
                        <SelectTrigger className="h-[48px] rounded-xl text-base">
                          <SelectValue placeholder="Selecione a raça" />
                        </SelectTrigger>
                        <SelectContent>
                          {BREEDS.map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                          <SelectItem value="Outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                      {pet.breed === 'Outros' && (
                        <Input
                          value={pet.customBreed}
                          onChange={e => updatePet(idx, 'customBreed', e.target.value)}
                          placeholder="Digite a raça"
                          className="h-[44px] rounded-xl mt-1.5"
                        />
                      )}
                    </div>

                    {/* Size */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Porte</Label>
                      <Select value={pet.size} onValueChange={v => updatePet(idx, 'size', v)}>
                        <SelectTrigger className="h-[48px] rounded-xl text-base">
                          <SelectValue placeholder="Selecione o porte" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pequeno">Pequeno</SelectItem>
                          <SelectItem value="medio">Médio</SelectItem>
                          <SelectItem value="grande">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add pet button */}
              {pets.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 rounded-xl border-dashed border-border hover:border-primary/50"
                  onClick={addPet}
                >
                  <Plus className="w-4 h-4" /> Adicionar outro pet
                </Button>
              )}

              {/* LGPD consent */}
              <div className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                <Checkbox
                  id="lgpd"
                  checked={lgpdAccepted}
                  onCheckedChange={(v) => setLgpdAccepted(v === true)}
                  className="mt-0.5"
                />
                <label htmlFor="lgpd" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  Li e concordo com os{' '}
                  <a href="#termos" className="text-primary hover:underline font-medium" onClick={e => { e.preventDefault(); setTermsOpen(true); }}>
                    Termos de Uso
                  </a>{' '}
                  e{' '}
                  <a href="#privacidade" className="text-primary hover:underline font-medium" onClick={e => { e.preventDefault(); setPrivacyOpen(true); }}>
                    Política de Privacidade (LGPD)
                  </a>.
                </label>
              </div>

              {error && step === 2 && <p className="text-sm text-destructive text-center">{error}</p>}

              <Button
                type="button"
                className="w-full h-[52px] rounded-[14px] text-base font-semibold gap-2"
                onClick={handleFinish}
                disabled={loading || !lgpdAccepted}
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {isPreRegistered ? 'Completando cadastro...' : 'Criando conta...'}</>
                  : isPreRegistered ? '✅ Completar meu cadastro' : 'Finalizar cadastro'
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      <TermsModal open={termsOpen} onOpenChange={setTermsOpen} />
      <PrivacyModal open={privacyOpen} onOpenChange={setPrivacyOpen} />
    </AuthLayout>
  );
}
