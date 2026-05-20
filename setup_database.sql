
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('dev', 'admin', 'midia', 'cliente');

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone authenticated can read (needed for admin views)
CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Create user_roles table (separate from profiles per security best practice)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read roles (needed for permission checks)
CREATE POLICY "Authenticated users can read roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- 4. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon, authenticated;

-- 5. Only devs can insert/update/delete roles
CREATE POLICY "Devs can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'dev'))
  WITH CHECK (public.has_role(auth.uid(), 'dev'));

-- 6. Only devs can insert/update/delete other profiles
CREATE POLICY "Devs can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'dev'))
  WITH CHECK (public.has_role(auth.uid(), 'dev'));

-- 7. Create page_access_matrix table
CREATE TABLE public.page_access_matrix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  page_key TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (role, page_key)
);

ALTER TABLE public.page_access_matrix ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read permissions
CREATE POLICY "Authenticated can read page access"
  ON public.page_access_matrix FOR SELECT
  TO authenticated
  USING (true);

-- Only devs can manage page access
CREATE POLICY "Devs can manage page access"
  ON public.page_access_matrix FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'dev'))
  WITH CHECK (public.has_role(auth.uid(), 'dev'));

-- 8. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_page_access_updated_at
  BEFORE UPDATE ON public.page_access_matrix
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );
  -- Default role: cliente
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cliente');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Seed default page access matrix
INSERT INTO public.page_access_matrix (role, page_key, allowed) VALUES
  ('admin', 'dashboard', true),
  ('admin', 'agendamentos', true),
  ('admin', 'clientes', true),
  ('admin', 'pacotes', true),
  ('admin', 'valores', true),
  ('admin', 'moderacao', true),
  ('admin', 'configuracoes', true),
  ('admin', 'servicos', false),
  ('midia', 'dashboard', false),
  ('midia', 'agendamentos', false),
  ('midia', 'clientes', false),
  ('midia', 'pacotes', false),
  ('midia', 'valores', false),
  ('midia', 'moderacao', true),
  ('midia', 'configuracoes', false),
  ('midia', 'servicos', false),
  ('cliente', 'perfil', true),
  ('cliente', 'area_cliente', true);

-- ========================================================
-- V2 PASSO 2: CRIAR TODAS AS TABELAS
-- ========================================================

-- 1. PETSHOPS
CREATE TABLE public.petshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  phone text,
  address text,
  latitude double precision,
  longitude double precision,
  theme text DEFAULT 'light',
  logo_url text,
  hours text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.petshops ENABLE ROW LEVEL SECURITY;

-- SEED THE DEFAULT PETSHOP
INSERT INTO public.petshops (id, name, slug) 
VALUES ('a0000000-0000-0000-0000-000000000001', 'Petcão App', 'petcao')
ON CONFLICT (id) DO NOTHING;

-- 2. ADD petshop_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS petshop_id uuid REFERENCES public.petshops(id);

-- 3. PETS
CREATE TABLE public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  petshop_id uuid REFERENCES public.petshops(id),
  name text NOT NULL,
  size text NOT NULL CHECK (size IN ('pequeno','medio','grande')),
  breed text DEFAULT '',
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- 4. SERVICES
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  petshop_id uuid NOT NULL REFERENCES public.petshops(id),
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL CHECK (category IN ('banho','tosa','combo','outro')),
  icon text DEFAULT 'scissors',
  duration_minutes integer DEFAULT 60,
  price_pequeno numeric(10,2) DEFAULT 0,
  price_medio numeric(10,2) DEFAULT 0,
  price_grande numeric(10,2) DEFAULT 0,
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- 5. PACKAGES
CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  petshop_id uuid NOT NULL REFERENCES public.petshops(id),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('SEMANAL','QUINZENAL')),
  description text DEFAULT '',
  interval_days integer NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- 6. CUSTOMER_PACKAGES
CREATE TABLE public.customer_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  petshop_id uuid NOT NULL REFERENCES public.petshops(id),
  customer_id uuid NOT NULL,
  pet_id uuid REFERENCES public.pets(id),
  package_id uuid REFERENCES public.packages(id),
  status text NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','DESATIVADO','EXPIRADO')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  observation text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_packages ENABLE ROW LEVEL SECURITY;

-- 7. APPOINTMENTS
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  petshop_id uuid NOT NULL REFERENCES public.petshops(id),
  customer_id uuid NOT NULL,
  service_id uuid REFERENCES public.services(id),
  service_name text NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','confirmado','realizado','cancelado','remarcado')),
  price numeric(10,2) DEFAULT 0,
  payment_status text DEFAULT 'nao_cobrado' CHECK (payment_status IN ('pago','pendente','nao_cobrado')),
  payment_method text CHECK (payment_method IN ('pix','dinheiro','cartao')),
  payment_amount numeric(10,2),
  cancel_reason text,
  completed_at timestamptz,
  origin text DEFAULT 'sistema' CHECK (origin IN ('whatsapp','admin','sistema','pacote')),
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 8. APPOINTMENT_PETS (many-to-many)
CREATE TABLE public.appointment_pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id),
  pet_name text NOT NULL,
  pet_size text,
  pet_breed text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.appointment_pets ENABLE ROW LEVEL SECURITY;

-- 9. GALLERY_PHOTOS
CREATE TABLE public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  petshop_id uuid NOT NULL REFERENCES public.petshops(id),
  url text NOT NULL,
  alt text DEFAULT '',
  caption text DEFAULT '',
  category text CHECK (category IN ('ambiente','antes-depois','pets','outro')),
  moderation_status text NOT NULL DEFAULT 'pendente' CHECK (moderation_status IN ('pendente','aprovado','rejeitado')),
  source text DEFAULT 'PETSHOP' CHECK (source IN ('CLIENTE','PETSHOP')),
  submitted_by_user_id uuid,
  submitted_by_name text,
  pet_name text,
  owner_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

-- 10. REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  petshop_id uuid NOT NULL REFERENCES public.petshops(id),
  user_id uuid,
  name text NOT NULL,
  pet_name text DEFAULT '',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text DEFAULT '',
  comment text DEFAULT '',
  moderation_status text NOT NULL DEFAULT 'pendente' CHECK (moderation_status IN ('pendente','aprovado','rejeitado')),
  shop_response text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 11. REVIEW_PHOTOS
CREATE TABLE public.review_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.review_photos ENABLE ROW LEVEL SECURITY;

-- 12. FEATURE_FLAGS
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  petshop_id uuid REFERENCES public.petshops(id),
  key text NOT NULL,
  enabled boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(petshop_id, key)
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- UPDATE TRIGGERS
-- ========================================================
CREATE TRIGGER set_updated_at_petshops BEFORE UPDATE ON public.petshops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_pets BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_services BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_packages BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_customer_packages BEFORE UPDATE ON public.customer_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_appointments BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_feature_flags BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- RLS POLICIES
-- ========================================================

-- PETSHOPS: anyone can read, dev can manage
CREATE POLICY "Anyone can read petshops" ON public.petshops FOR SELECT USING (true);
CREATE POLICY "Devs can manage petshops" ON public.petshops FOR ALL USING (has_role(auth.uid(), 'dev')) WITH CHECK (has_role(auth.uid(), 'dev'));

-- PETS: owners can CRUD own, dev/admin can read all
CREATE POLICY "Owners can manage own pets" ON public.pets FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Devs can manage all pets" ON public.pets FOR ALL USING (has_role(auth.uid(), 'dev')) WITH CHECK (has_role(auth.uid(), 'dev'));
CREATE POLICY "Admins can read all pets" ON public.pets FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- SERVICES: anyone can read, dev/admin can manage
CREATE POLICY "Anyone can read services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Devs can manage services" ON public.services FOR ALL USING (has_role(auth.uid(), 'dev')) WITH CHECK (has_role(auth.uid(), 'dev'));
CREATE POLICY "Admins can manage services" ON public.services FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- PACKAGES: anyone can read, dev/admin can manage
CREATE POLICY "Anyone can read packages" ON public.packages FOR SELECT USING (true);
CREATE POLICY "Devs can manage packages" ON public.packages FOR ALL USING (has_role(auth.uid(), 'dev')) WITH CHECK (has_role(auth.uid(), 'dev'));
CREATE POLICY "Admins can manage packages" ON public.packages FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- CUSTOMER_PACKAGES: owner can read own, dev/admin can manage all
CREATE POLICY "Owners can read own customer_packages" ON public.customer_packages FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Devs can manage customer_packages" ON public.customer_packages FOR ALL USING (has_role(auth.uid(), 'dev')) WITH CHECK (has_role(auth.uid(), 'dev'));
CREATE POLICY "Admins can manage customer_packages" ON public.customer_packages FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- APPOINTMENTS: owner can read own, dev/admin can manage all
CREATE POLICY "Owners can read own appointments" ON public.appointments FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Owners can insert own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Devs can manage appointments" ON public.appointments FOR ALL USING (has_role(auth.uid(), 'dev')) WITH CHECK (has_role(auth.uid(), 'dev'));
CREATE POLICY "Admins can manage appointments" ON public.appointments FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- APPOINTMENT_PETS: follow appointment access
CREATE POLICY "Users can read own appointment_pets" ON public.appointment_pets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.customer_id = auth.uid())
);
CREATE POLICY "Users can insert own appointment_pets" ON public.appointment_pets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.customer_id = auth.uid())
);
CREATE POLICY "Devs can manage appointment_pets" ON public.appointment_pets FOR ALL USING (has_role(auth.uid(), 'dev')) WITH CHECK (has_role(auth.uid(), 'dev'));
CREATE POLICY "Admins can manage appointment_pets" ON public.appointment_pets FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- GALLERY_PHOTOS: public can read approved, dev/admin/midia can manage
CREATE POLICY "Anyone can read approved photos" ON public.gallery_photos FOR SELECT USING (moderation_status = 'aprovado');
CREATE POLICY "Authenticated can insert photos" ON public.gallery_photos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Devs can manage gallery" ON public.gallery_photos FOR ALL USING (has_role(auth.uid(), 'dev')) WITH CHECK (has_role(auth.uid(), 'dev'));
CREATE POLICY "Admins can manage gallery" ON public.gallery_photos FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Midia can manage gallery" ON public.gallery_photos FOR ALL USING (has_role(auth.uid(), 'midia')) WITH CHECK (has_role(auth.uid(), 'midia'));

-- REVIEWS: public can read approved, owner can manage own, dev/admin/midia can manage
CREATE POLICY "Anyone can read approved reviews" ON public.reviews FOR SELECT USING (moderation_status = 'aprovado');
CREATE POLICY "Users can insert own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own reviews" ON public.reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Devs can manage reviews" ON public.reviews FOR ALL USING (has_role(auth.uid(), 'dev')) WITH CHECK (has_role(auth.uid(), 'dev'));
CREATE POLICY "Admins can manage reviews" ON public.reviews FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Midia can manage reviews" ON public.reviews FOR ALL USING (has_role(auth.uid(), 'midia')) WITH CHECK (has_role(auth.uid(), 'midia'));

-- REVIEW_PHOTOS: follow review access
CREATE POLICY "Anyone can read approved review photos" ON public.review_photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.moderation_status = 'aprovado')
);
CREATE POLICY "Users can insert own review photos" ON public.review_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.user_id = auth.uid())
);
CREATE POLICY "Devs can manage review_photos" ON public.review_photos FOR ALL USING (has_role(auth.uid(), 'dev')) WITH CHECK (has_role(auth.uid(), 'dev'));
CREATE POLICY "Admins can manage review_photos" ON public.review_photos FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Midia can manage review_photos" ON public.review_photos FOR ALL USING (has_role(auth.uid(), 'midia')) WITH CHECK (has_role(auth.uid(), 'midia'));

-- FEATURE_FLAGS: authenticated can read, dev can manage
CREATE POLICY "Authenticated can read feature_flags" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "Devs can manage feature_flags" ON public.feature_flags FOR ALL USING (has_role(auth.uid(), 'dev')) WITH CHECK (has_role(auth.uid(), 'dev'));

-- ========================================================
-- STORAGE BUCKETS
-- ========================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars-users', 'avatars-users', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars-pets', 'avatars-pets', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('review-photos', 'review-photos', true);

-- Storage RLS policies
CREATE POLICY "Anyone can read logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Devs can upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND public.has_role(auth.uid(), 'dev'));

CREATE POLICY "Anyone can read user avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars-users');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars-users' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars-users' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can read pet avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars-pets');
CREATE POLICY "Users can upload pet avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars-pets' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update pet avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars-pets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can read gallery" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
CREATE POLICY "Authenticated can upload gallery" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery' AND auth.uid() IS NOT NULL);
CREATE POLICY "Devs can delete gallery" ON storage.objects FOR DELETE USING (bucket_id = 'gallery' AND public.has_role(auth.uid(), 'dev'));
CREATE POLICY "Admins can delete gallery" ON storage.objects FOR DELETE USING (bucket_id = 'gallery' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read review photos" ON storage.objects FOR SELECT USING (bucket_id = 'review-photos');
CREATE POLICY "Authenticated can upload review photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'review-photos' AND auth.uid() IS NOT NULL);
ALTER TABLE public.petshops ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique ON public.profiles (phone) WHERE phone IS NOT NULL AND phone != '';
-- 1) Helpers de normalizaÃ§Ã£o
CREATE OR REPLACE FUNCTION public.to_br_e164(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  digits text;
BEGIN
  digits := regexp_replace(COALESCE(raw, ''), '\D', '', 'g');
  IF digits = '' THEN
    RETURN NULL;
  END IF;

  -- Entrada com DDI 55 (12 ou 13 dÃ­gitos totais)
  IF left(digits, 2) = '55' AND length(digits) IN (12, 13) THEN
    digits := substring(digits FROM 3);
  END IF;

  -- BR nacional com DDD: 10 ou 11
  IF length(digits) NOT IN (10, 11) THEN
    RETURN NULL;
  END IF;

  RETURN '+55' || digits;
END;
$$;

-- 2) Tabela Ãºnica de contas para lookup consistente
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  phone_e164 text NULL,
  email text NULL,
  password_hash text NULL,
  auth_provider text NOT NULL DEFAULT 'local',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_accounts_auth_provider_check CHECK (auth_provider IN ('local', 'google'))
);

CREATE UNIQUE INDEX IF NOT EXISTS user_accounts_phone_e164_key
  ON public.user_accounts (phone_e164)
  WHERE phone_e164 IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_accounts_email_lower_key
  ON public.user_accounts ((lower(email)))
  WHERE email IS NOT NULL;

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_accounts'
      AND policyname = 'Users can read own user_accounts'
  ) THEN
    CREATE POLICY "Users can read own user_accounts"
      ON public.user_accounts
      FOR SELECT
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_accounts'
      AND policyname = 'Users can insert own user_accounts'
  ) THEN
    CREATE POLICY "Users can insert own user_accounts"
      ON public.user_accounts
      FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_accounts'
      AND policyname = 'Users can update own user_accounts'
  ) THEN
    CREATE POLICY "Users can update own user_accounts"
      ON public.user_accounts
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_accounts'
      AND policyname = 'Devs can manage user_accounts'
  ) THEN
    CREATE POLICY "Devs can manage user_accounts"
      ON public.user_accounts
      FOR ALL
      USING (public.has_role(auth.uid(), 'dev'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'dev'::public.app_role));
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_user_accounts_updated_at ON public.user_accounts;
CREATE TRIGGER update_user_accounts_updated_at
BEFORE UPDATE ON public.user_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3) FunÃ§Ãµes de lookup para login/cadastro sem expor tabela inteira
CREATE OR REPLACE FUNCTION public.lookup_account_by_phone(phone_input text)
RETURNS TABLE (
  id uuid,
  full_name text,
  phone_e164 text,
  email text,
  auth_provider text,
  password_hash text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ua.id, ua.full_name, ua.phone_e164, ua.email, ua.auth_provider, ua.password_hash
  FROM public.user_accounts ua
  WHERE ua.phone_e164 = public.to_br_e164(phone_input)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.lookup_account_by_email(email_input text)
RETURNS TABLE (
  id uuid,
  full_name text,
  phone_e164 text,
  email text,
  auth_provider text,
  password_hash text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ua.id, ua.full_name, ua.phone_e164, ua.email, ua.auth_provider, ua.password_hash
  FROM public.user_accounts ua
  WHERE lower(ua.email) = lower(trim(email_input))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_account_by_phone(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_account_by_email(text) TO anon, authenticated;

-- 4) Atualiza trigger de novos usuÃ¡rios para manter profile/roles/accounts consistentes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name text;
  v_email text;
  v_phone_e164 text;
  v_provider text;
BEGIN
  v_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'UsuÃ¡rio');
  v_email := lower(NEW.email);

  v_phone_e164 := public.to_br_e164(
    COALESCE(
      NEW.raw_user_meta_data->>'phone_e164',
      NEW.raw_user_meta_data->>'phone'
    )
  );

  IF v_phone_e164 IS NULL
     AND v_email ~ '^[0-9]{10,13}@(phone\\.petcao\\.app|petcao\\.local)$' THEN
    v_phone_e164 := public.to_br_e164(split_part(v_email, '@', 1));
  END IF;

  IF COALESCE(NEW.raw_app_meta_data->'providers', '[]'::jsonb) ? 'google'
     AND NOT (COALESCE(NEW.raw_app_meta_data->'providers', '[]'::jsonb) ? 'email') THEN
    v_provider := 'google';
  ELSE
    v_provider := 'local';
  END IF;

  INSERT INTO public.profiles (user_id, name, phone)
  VALUES (NEW.id, v_name, v_phone_e164)
  ON CONFLICT (user_id) DO UPDATE
  SET
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = now();

  IF NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'cliente'::public.app_role);
  END IF;

  INSERT INTO public.user_accounts (id, full_name, phone_e164, email, password_hash, auth_provider)
  VALUES (NEW.id, v_name, v_phone_e164, v_email, NULL, v_provider)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.user_accounts.full_name),
    phone_e164 = COALESCE(EXCLUDED.phone_e164, public.user_accounts.phone_e164),
    email = COALESCE(EXCLUDED.email, public.user_accounts.email),
    auth_provider = CASE
      WHEN public.user_accounts.auth_provider = 'local' THEN 'local'
      ELSE EXCLUDED.auth_provider
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND t.tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

-- 5) Backfill de dados jÃ¡ existentes para evitar contradiÃ§Ã£o Login x Cadastro
UPDATE public.profiles
SET phone = public.to_br_e164(phone)
WHERE phone IS NOT NULL
  AND trim(phone) <> '';

INSERT INTO public.profiles (user_id, name, phone)
SELECT
  u.id,
  COALESCE(NULLIF(trim(u.raw_user_meta_data->>'name'), ''), split_part(COALESCE(u.email, ''), '@', 1), 'UsuÃ¡rio'),
  public.to_br_e164(
    COALESCE(
      u.raw_user_meta_data->>'phone_e164',
      u.raw_user_meta_data->>'phone',
      CASE
        WHEN lower(COALESCE(u.email, '')) ~ '^[0-9]{10,13}@(phone\\.petcao\\.app|petcao\\.local)$'
          THEN split_part(lower(u.email), '@', 1)
        ELSE NULL
      END
    )
  )
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'cliente'::public.app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
);

INSERT INTO public.user_accounts (id, full_name, phone_e164, email, password_hash, auth_provider, created_at, updated_at)
SELECT
  u.id,
  COALESCE(NULLIF(trim(u.raw_user_meta_data->>'name'), ''), split_part(COALESCE(u.email, ''), '@', 1), 'UsuÃ¡rio'),
  public.to_br_e164(
    COALESCE(
      u.raw_user_meta_data->>'phone_e164',
      u.raw_user_meta_data->>'phone',
      CASE
        WHEN lower(COALESCE(u.email, '')) ~ '^[0-9]{10,13}@(phone\\.petcao\\.app|petcao\\.local)$'
          THEN split_part(lower(u.email), '@', 1)
        ELSE NULL
      END
    )
  ),
  lower(u.email),
  NULL,
  CASE
    WHEN COALESCE(u.raw_app_meta_data->'providers', '[]'::jsonb) ? 'google'
      AND NOT (COALESCE(u.raw_app_meta_data->'providers', '[]'::jsonb) ? 'email')
      THEN 'google'
    ELSE 'local'
  END,
  COALESCE(u.created_at, now()),
  now()
FROM auth.users u
ON CONFLICT (id) DO UPDATE
SET
  full_name = COALESCE(EXCLUDED.full_name, public.user_accounts.full_name),
  phone_e164 = COALESCE(EXCLUDED.phone_e164, public.user_accounts.phone_e164),
  email = COALESCE(EXCLUDED.email, public.user_accounts.email),
  auth_provider = CASE
    WHEN public.user_accounts.auth_provider = 'local' THEN 'local'
    ELSE EXCLUDED.auth_provider
  END,
  updated_at = now();

-- Audit log for destructive actions
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Devs can manage audit_log" ON public.audit_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'dev'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'dev'::app_role));

-- Add profile_completed to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

CREATE TABLE public.gallery_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  petshop_id uuid NOT NULL REFERENCES public.petshops(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  max_photos integer NOT NULL DEFAULT 10,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.gallery_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read categories
CREATE POLICY "Anyone can read gallery_categories"
  ON public.gallery_categories FOR SELECT
  USING (true);

-- Devs can manage
CREATE POLICY "Devs can manage gallery_categories"
  ON public.gallery_categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'dev'))
  WITH CHECK (public.has_role(auth.uid(), 'dev'));

-- Admins can manage
CREATE POLICY "Admins can manage gallery_categories"
  ON public.gallery_categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default categories
INSERT INTO public.gallery_categories (petshop_id, name, slug, max_photos, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Pets', 'pets', 10, 1),
  ('a0000000-0000-0000-0000-000000000001', 'Ambiente', 'ambiente', 10, 2),
  ('a0000000-0000-0000-0000-000000000001', 'Antes e Depois', 'antes-depois', 10, 3);
-- 1) Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'sistema',
  status text NOT NULL DEFAULT 'info',
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Devs can manage notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'dev'::app_role))
  WITH CHECK (has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role));

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read_at) WHERE read_at IS NULL;

-- 2) Expand audit_log with new columns
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS entity text,
  ADD COLUMN IF NOT EXISTS field text,
  ADD COLUMN IF NOT EXISTS old_value text,
  ADD COLUMN IF NOT EXISTS new_value text;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- Add LGPD consent fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS lgpd_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lgpd_accepted_at timestamptz;

-- Add admin manage policy for audit_log
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage audit_log' AND tablename = 'audit_log'
  ) THEN
    CREATE POLICY "Admins can manage audit_log" ON public.audit_log FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Expenses table for tracking petshop expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  petshop_id UUID NOT NULL REFERENCES public.petshops(id),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'geral',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Devs can manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'dev'::app_role))
  WITH CHECK (has_role(auth.uid(), 'dev'::app_role));

-- Dashboard preferences table
CREATE TABLE public.dashboard_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  modules JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dashboard prefs" ON public.dashboard_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_prefs_updated_at BEFORE UPDATE ON public.dashboard_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- pet_notes table for pet prontuÃ¡rio
CREATE TABLE public.pet_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_notes ENABLE ROW LEVEL SECURITY;

-- RLS: devs full access
CREATE POLICY "Devs can manage pet_notes"
  ON public.pet_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'dev'))
  WITH CHECK (public.has_role(auth.uid(), 'dev'));

-- RLS: admins full access
CREATE POLICY "Admins can manage pet_notes"
  ON public.pet_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: pet owners can read own pet notes
CREATE POLICY "Owners can read own pet_notes"
  ON public.pet_notes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pets p WHERE p.id = pet_notes.pet_id AND p.owner_id = auth.uid()
  ));
ALTER TABLE public.gallery_categories ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true;
-- Create user_subscriptions table to track PRO status
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  is_pro BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow DEV users to manage all subscriptions
CREATE POLICY "DEV users can manage all subscriptions"
ON public.user_subscriptions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'dev'))
WITH CHECK (public.has_role(auth.uid(), 'dev'));

-- Allow users to read their own subscription
CREATE POLICY "Users can read own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS temp_password_expires_at timestamptz DEFAULT NULL;

-- Add extended pet profile fields
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS age text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS weight text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS behavior text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS allergies text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS coat_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS observations text DEFAULT NULL;

-- Create inventory table for PRO stock control
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  petshop_id uuid NOT NULL REFERENCES public.petshops(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 0,
  purchase_price numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  supplier text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage inventory" ON public.inventory FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Devs can manage inventory" ON public.inventory FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'dev'::app_role))
  WITH CHECK (has_role(auth.uid(), 'dev'::app_role));

-- Fix 1: Restrict profiles SELECT to own record + admin/dev
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;

CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Restrict user_accounts UPDATE to safe columns only (exclude password_hash)
DROP POLICY IF EXISTS "Users can update own user_accounts" ON public.user_accounts;

CREATE POLICY "Users can update own user_accounts safe fields"
ON public.user_accounts FOR UPDATE TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Revoke direct UPDATE on password_hash from anon and authenticated roles
REVOKE UPDATE (password_hash) ON public.user_accounts FROM anon, authenticated;

-- Fix 3: Restrict user_roles SELECT to own roles + admin/dev
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.user_roles;

CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 1: Restrict user_accounts UPDATE to safe columns only
REVOKE UPDATE ON public.user_accounts FROM anon, authenticated;
GRANT UPDATE (full_name, phone_e164) ON public.user_accounts TO authenticated;

-- Fix 2: Restrict profiles UPDATE to safe columns only
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (name, phone, avatar_url, profile_completed, lgpd_accepted, lgpd_accepted_at, notifications_enabled, updated_at) ON public.profiles TO authenticated;

-- Fix 3: Restrict feature_flags read to authenticated only
DROP POLICY IF EXISTS "Authenticated can read feature_flags" ON public.feature_flags;
CREATE POLICY "Authenticated can read feature_flags"
ON public.feature_flags FOR SELECT TO authenticated
USING (true);

-- Fix 1: Restrict gallery_photos INSERT to enforce pending moderation
DROP POLICY IF EXISTS "Authenticated can insert photos" ON public.gallery_photos;
CREATE POLICY "Authenticated can insert photos pending moderation"
ON public.gallery_photos FOR INSERT TO public
WITH CHECK (
  auth.uid() IS NOT NULL
  AND moderation_status = 'pendente'
  AND source = 'CLIENTE'
);

-- Fix 2: Restrict reviews INSERT to enforce pending moderation
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews;
CREATE POLICY "Users can insert own reviews pending moderation"
ON public.reviews FOR INSERT TO public
WITH CHECK (
  auth.uid() = user_id
  AND moderation_status = 'pendente'
);

-- Fix 3: Remove direct user_accounts UPDATE for regular users entirely
-- They should only update via edge functions / admin
DROP POLICY IF EXISTS "Users can update own user_accounts safe fields" ON public.user_accounts;
-- Re-grant full UPDATE to service_role (edge functions use this)
-- Regular users cannot update user_accounts at all now

-- Revoke SELECT on password_hash from regular users
REVOKE SELECT ON public.user_accounts FROM anon, authenticated;
GRANT SELECT (id, email, full_name, phone_e164, auth_provider, created_at, updated_at) ON public.user_accounts TO authenticated;
GRANT SELECT (id, email, full_name, phone_e164, auth_provider, created_at, updated_at) ON public.user_accounts TO anon;

-- Drop and recreate lookup functions with new return type (no password_hash)
DROP FUNCTION IF EXISTS public.lookup_account_by_phone(text);
DROP FUNCTION IF EXISTS public.lookup_account_by_email(text);

CREATE FUNCTION public.lookup_account_by_phone(phone_input text)
RETURNS TABLE(id uuid, full_name text, phone_e164 text, email text, auth_provider text, has_password boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ua.id, ua.full_name, ua.phone_e164, ua.email, ua.auth_provider, false AS has_password
  FROM public.user_accounts ua
  WHERE ua.phone_e164 = public.to_br_e164(phone_input)
  LIMIT 1;
$$;

CREATE FUNCTION public.lookup_account_by_email(email_input text)
RETURNS TABLE(id uuid, full_name text, phone_e164 text, email text, auth_provider text, has_password boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ua.id, ua.full_name, ua.phone_e164, ua.email, ua.auth_provider, false AS has_password
  FROM public.user_accounts ua
  WHERE lower(ua.email) = lower(trim(email_input))
  LIMIT 1;
$$;

-- Fix 1: Gallery photo INSERT must enforce submitted_by_user_id = auth.uid()
DROP POLICY IF EXISTS "Authenticated can insert photos pending moderation" ON public.gallery_photos;
CREATE POLICY "Authenticated can insert photos pending moderation"
ON public.gallery_photos FOR INSERT TO public
WITH CHECK (
  auth.uid() IS NOT NULL
  AND moderation_status = 'pendente'
  AND source = 'CLIENTE'
  AND (submitted_by_user_id = auth.uid() OR submitted_by_user_id IS NULL)
);

-- Fix 2: Restrict has_role EXECUTE to authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Drop password_hash column (the previous attempt failed due to function conflict, now resolved)
ALTER TABLE public.user_accounts DROP COLUMN IF EXISTS password_hash;

-- Update handle_new_user to not reference password_hash
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
  v_email text;
  v_phone_e164 text;
  v_provider text;
BEGIN
  v_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'UsuÃ¡rio');
  v_email := lower(NEW.email);

  v_phone_e164 := public.to_br_e164(
    COALESCE(
      NEW.raw_user_meta_data->>'phone_e164',
      NEW.raw_user_meta_data->>'phone'
    )
  );

  IF v_phone_e164 IS NULL
     AND v_email ~ '^[0-9]{10,13}@(phone\.petcao\.app|petcao\.local)$' THEN
    v_phone_e164 := public.to_br_e164(split_part(v_email, '@', 1));
  END IF;

  IF COALESCE(NEW.raw_app_meta_data->'providers', '[]'::jsonb) ? 'google'
     AND NOT (COALESCE(NEW.raw_app_meta_data->'providers', '[]'::jsonb) ? 'email') THEN
    v_provider := 'google';
  ELSE
    v_provider := 'local';
  END IF;

  INSERT INTO public.profiles (user_id, name, phone)
  VALUES (NEW.id, v_name, v_phone_e164)
  ON CONFLICT (user_id) DO UPDATE
  SET
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = now();

  IF NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'cliente'::public.app_role);
  END IF;

  INSERT INTO public.user_accounts (id, full_name, phone_e164, email, auth_provider)
  VALUES (NEW.id, v_name, v_phone_e164, v_email, v_provider)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.user_accounts.full_name),
    phone_e164 = COALESCE(EXCLUDED.phone_e164, public.user_accounts.phone_e164),
    email = COALESCE(EXCLUDED.email, public.user_accounts.email),
    auth_provider = CASE
      WHEN public.user_accounts.auth_provider = 'local' THEN 'local'
      ELSE EXCLUDED.auth_provider
    END,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- Also fix has_role: revoke direct RPC access from all, keep it usable only within RLS policies
-- RLS policies execute as the table owner, so they can still call has_role
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;

-- Create gallery_likes table
CREATE TABLE public.gallery_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id uuid NOT NULL REFERENCES public.gallery_photos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(photo_id, user_id)
);

-- Enable RLS
ALTER TABLE public.gallery_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can read like counts (public gallery)
CREATE POLICY "Anyone can read gallery likes"
ON public.gallery_likes FOR SELECT TO public
USING (true);

-- Authenticated users can insert their own likes
CREATE POLICY "Authenticated can insert own likes"
ON public.gallery_likes FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can delete their own likes (unlike)
CREATE POLICY "Users can delete own likes"
ON public.gallery_likes FOR DELETE TO public
USING (auth.uid() = user_id);

-- Admins can manage all likes
CREATE POLICY "Admins can manage gallery likes"
ON public.gallery_likes FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Devs can manage all likes
CREATE POLICY "Devs can manage gallery likes"
ON public.gallery_likes FOR ALL TO public
USING (has_role(auth.uid(), 'dev'::app_role))
WITH CHECK (has_role(auth.uid(), 'dev'::app_role));

-- Add index for fast count queries
CREATE INDEX idx_gallery_likes_photo_id ON public.gallery_likes(photo_id);
CREATE INDEX idx_gallery_likes_user_id ON public.gallery_likes(user_id);

-- Fix: Re-grant EXECUTE on has_role to authenticated users.
-- has_role is SECURITY DEFINER so it safely bypasses RLS internally.
-- Authenticated users MUST be able to call it for RLS policies to work.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Gallery comments table
CREATE TABLE public.gallery_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.gallery_photos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  user_avatar_url text,
  comment_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gallery_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments on approved photos
CREATE POLICY "Anyone can read comments on approved photos"
ON public.gallery_comments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.gallery_photos gp
  WHERE gp.id = gallery_comments.photo_id
  AND gp.moderation_status = 'aprovado'
));

-- Authenticated users can insert own comments
CREATE POLICY "Authenticated can insert own comments"
ON public.gallery_comments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can delete own comments
CREATE POLICY "Users can delete own comments"
ON public.gallery_comments FOR DELETE
USING (auth.uid() = user_id);

-- Admins can manage all comments
CREATE POLICY "Admins can manage comments"
ON public.gallery_comments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Devs can manage all comments
CREATE POLICY "Devs can manage comments"
ON public.gallery_comments FOR ALL
USING (has_role(auth.uid(), 'dev'::app_role))
WITH CHECK (has_role(auth.uid(), 'dev'::app_role));

CREATE INDEX idx_gallery_comments_photo_id ON public.gallery_comments(photo_id);
CREATE INDEX idx_gallery_comments_created_at ON public.gallery_comments(created_at DESC);

DROP FUNCTION IF EXISTS public.lookup_account_by_phone(text);
DROP FUNCTION IF EXISTS public.lookup_account_by_email(text);

CREATE FUNCTION public.lookup_account_by_phone(phone_input text)
 RETURNS TABLE(auth_provider text, has_password boolean, email text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ua.auth_provider, COALESCE(p.profile_completed, false) AS has_password, ua.email
  FROM public.user_accounts ua
  LEFT JOIN public.profiles p ON p.user_id = ua.id
  WHERE ua.phone_e164 = public.to_br_e164(phone_input)
  LIMIT 1;
$function$;

CREATE FUNCTION public.lookup_account_by_email(email_input text)
 RETURNS TABLE(auth_provider text, has_password boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ua.auth_provider, false AS has_password
  FROM public.user_accounts ua
  WHERE lower(ua.email) = lower(trim(email_input))
  LIMIT 1;
$function$;

CREATE POLICY "Admins can read user_accounts"
ON public.user_accounts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Drop old permissive policies for avatar buckets
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload pet avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update pet avatar" ON storage.objects;

-- Recreate with path isolation: uploads must go into user's own folder
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars-users'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars-users'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload pet avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars-pets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update pet avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars-pets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
ALTER TABLE public.services DROP CONSTRAINT services_category_check;
ALTER TABLE public.services ADD CONSTRAINT services_category_check CHECK (category = ANY (ARRAY['banho'::text, 'tosa'::text, 'combo'::text, 'estetica'::text, 'tratamento'::text, 'extra'::text, 'outro'::text]));
ALTER TABLE public.services DROP CONSTRAINT services_category_check;
