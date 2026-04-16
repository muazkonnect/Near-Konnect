-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('customer', 'worker', 'admin');

CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  city TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories viewable by everyone" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.service_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profession TEXT NOT NULL,
  experience INTEGER NOT NULL DEFAULT 0,
  cnic TEXT,
  description TEXT DEFAULT '',
  service_areas TEXT[] DEFAULT '{}',
  available BOOLEAN NOT NULL DEFAULT true,
  verified BOOLEAN NOT NULL DEFAULT false,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workers viewable by everyone" ON public.workers FOR SELECT USING (true);
CREATE POLICY "Workers can insert own record" ON public.workers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Workers can update own record" ON public.workers FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON public.workers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customers can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Customers can delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = customer_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='workers') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.workers';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='reviews') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews';
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']);
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');

CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  service_description TEXT NOT NULL DEFAULT '',
  booking_date DATE NOT NULL,
  booking_time TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can create bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = (SELECT user_id FROM public.workers WHERE id = worker_id));
CREATE POLICY "Workers can update booking status" ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = (SELECT user_id FROM public.workers WHERE id = worker_id));
CREATE POLICY "Customers can update own bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Customers can delete pending bookings" ON public.bookings FOR DELETE TO authenticated USING (auth.uid() = customer_id AND status = 'pending');
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='bookings') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema='public' AND table_name='workers' AND constraint_name='workers_user_id_fkey_profiles') THEN
    ALTER TABLE public.workers ADD CONSTRAINT workers_user_id_fkey_profiles FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema='public' AND table_name='bookings' AND constraint_name='bookings_customer_id_fkey_profiles') THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_customer_id_fkey_profiles FOREIGN KEY (customer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema='public' AND table_name='reviews' AND constraint_name='reviews_customer_id_fkey_profiles') THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_customer_id_fkey_profiles FOREIGN KEY (customer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE public.chatbot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.chatbot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversations" ON public.chatbot_conversations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own conversations" ON public.chatbot_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.chatbot_conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.chatbot_conversations FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own messages" ON public.chatbot_messages FOR SELECT TO authenticated USING (conversation_id IN (SELECT id FROM public.chatbot_conversations WHERE user_id = auth.uid()));
CREATE POLICY "Users can create own messages" ON public.chatbot_messages FOR INSERT TO authenticated WITH CHECK (conversation_id IN (SELECT id FROM public.chatbot_conversations WHERE user_id = auth.uid()));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blood_group text DEFAULT NULL;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blood_donor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS donor_status text NOT NULL DEFAULT 'inactive';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='profiles') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_experience integer;
  v_service_area text;
  v_is_blood_donor boolean;
BEGIN
  v_role := CASE WHEN NEW.raw_user_meta_data->>'role' IN ('customer','worker','admin')
    THEN (NEW.raw_user_meta_data->>'role')::public.app_role ELSE 'customer'::public.app_role END;
  v_experience := CASE WHEN COALESCE(NEW.raw_user_meta_data->>'experience','') ~ '^[0-9]+$'
    THEN (NEW.raw_user_meta_data->>'experience')::integer ELSE 0 END;
  v_service_area := COALESCE(NULLIF(NEW.raw_user_meta_data->>'service_area',''), NULLIF(NEW.raw_user_meta_data->>'service_areas',''));
  v_is_blood_donor := COALESCE((NEW.raw_user_meta_data->>'is_blood_donor')::boolean, false);

  INSERT INTO public.profiles (user_id, full_name, phone, city, avatar_url, blood_group, is_blood_donor, donor_status)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(COALESCE(NEW.email,''),'@',1), 'User'),
    NULLIF(NEW.raw_user_meta_data->>'phone',''),
    NULLIF(NEW.raw_user_meta_data->>'city',''),
    NULLIF(NEW.raw_user_meta_data->>'avatar_url',''),
    NULLIF(NEW.raw_user_meta_data->>'blood_group',''),
    v_is_blood_donor,
    CASE WHEN v_is_blood_donor THEN 'active' ELSE 'inactive' END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    city = COALESCE(EXCLUDED.city, public.profiles.city),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    blood_group = COALESCE(EXCLUDED.blood_group, public.profiles.blood_group),
    is_blood_donor = EXCLUDED.is_blood_donor,
    donor_status = EXCLUDED.donor_status,
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_role = 'worker' THEN
    INSERT INTO public.workers (user_id, profession, experience, cnic, city, service_areas, available)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'profession',''), 'General Service'),
      v_experience,
      NULLIF(NEW.raw_user_meta_data->>'cnic',''),
      NULLIF(NEW.raw_user_meta_data->>'city',''),
      CASE WHEN v_service_area IS NOT NULL
        THEN regexp_split_to_array(regexp_replace(v_service_area, '\s*,\s*', ',', 'g'), ',')
        ELSE '{}'::text[] END,
      true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      profession = EXCLUDED.profession,
      experience = EXCLUDED.experience,
      cnic = COALESCE(EXCLUDED.cnic, public.workers.cnic),
      city = COALESCE(EXCLUDED.city, public.workers.city),
      service_areas = CASE WHEN array_length(EXCLUDED.service_areas, 1) IS NOT NULL THEN EXCLUDED.service_areas ELSE public.workers.service_areas END,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.blood_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  blood_group TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal',
  message TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view blood requests" ON public.blood_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create blood requests" ON public.blood_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update own blood requests" ON public.blood_requests FOR UPDATE TO authenticated USING (auth.uid() = requester_id);
CREATE POLICY "Users can delete own blood requests" ON public.blood_requests FOR DELETE TO authenticated USING (auth.uid() = requester_id);
CREATE TRIGGER update_blood_requests_updated_at BEFORE UPDATE ON public.blood_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='blood_requests') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_requests';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='boost_type') THEN CREATE TYPE public.boost_type AS ENUM ('featured_listing','priority_ranking','urgent_boost'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='boost_status') THEN CREATE TYPE public.boost_status AS ENUM ('pending','active','expired','rejected'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='analytics_event_type') THEN CREATE TYPE public.analytics_event_type AS ENUM ('profile_view','contact_click','message_received','conversion'); END IF;
END $$;

-- Add canonical (_role,_user_id) overload of has_role
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = _role);
$$;

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role('admin', auth.uid())) WITH CHECK (public.has_role('admin', auth.uid()));
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role('admin', auth.uid()));
DROP POLICY IF EXISTS "Users can create own basic role" ON public.user_roles;
CREATE POLICY "Users can create own basic role" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role IN ('customer','worker'));

CREATE TABLE IF NOT EXISTS public.featured_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL,
  owner_user_id UUID,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  rotation_seed INTEGER NOT NULL DEFAULT floor(random()*1000000)::INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.featured_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active featured services" ON public.featured_services FOR SELECT TO anon, authenticated
  USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
CREATE POLICY "Admins can manage featured services" ON public.featured_services FOR ALL TO authenticated
  USING (public.has_role('admin', auth.uid())) WITH CHECK (public.has_role('admin', auth.uid()));
CREATE INDEX IF NOT EXISTS idx_featured_services_active ON public.featured_services (is_active, starts_at, ends_at, priority DESC);
CREATE INDEX IF NOT EXISTS idx_featured_services_service_id ON public.featured_services (service_id);
CREATE TRIGGER trg_featured_services_updated_at BEFORE UPDATE ON public.featured_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.native_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_type TEXT NOT NULL DEFAULT 'in_feed',
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cta_label TEXT NOT NULL DEFAULT 'Learn more',
  cta_url TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'discover_feed',
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  priority INTEGER NOT NULL DEFAULT 100,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.native_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active native ads" ON public.native_ads FOR SELECT TO anon, authenticated
  USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
CREATE POLICY "Admins can manage native ads" ON public.native_ads FOR ALL TO authenticated
  USING (public.has_role('admin', auth.uid())) WITH CHECK (public.has_role('admin', auth.uid()));
CREATE INDEX IF NOT EXISTS idx_native_ads_lookup ON public.native_ads (placement, is_active, starts_at, ends_at, priority DESC);
CREATE TRIGGER trg_native_ads_updated_at BEFORE UPDATE ON public.native_ads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ad_placement_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_key TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  frequency_min INTEGER NOT NULL DEFAULT 4,
  frequency_max INTEGER NOT NULL DEFAULT 6,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_placement_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view enabled placement settings" ON public.ad_placement_settings FOR SELECT TO anon, authenticated
  USING (enabled = true OR public.has_role('admin', auth.uid()));
CREATE POLICY "Admins can manage placement settings" ON public.ad_placement_settings FOR ALL TO authenticated
  USING (public.has_role('admin', auth.uid())) WITH CHECK (public.has_role('admin', auth.uid()));
CREATE TRIGGER trg_ad_placement_settings_updated_at BEFORE UPDATE ON public.ad_placement_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.ad_placement_settings (placement_key, enabled, frequency_min, frequency_max) VALUES
  ('home_banner', true, 1, 1), ('home_feed', true, 4, 6), ('discover_feed', true, 4, 6),
  ('category_feed', true, 4, 6), ('search_results', true, 4, 6)
ON CONFLICT (placement_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.service_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL,
  owner_user_id UUID NOT NULL,
  boost_type public.boost_type NOT NULL,
  status public.boost_status NOT NULL DEFAULT 'pending',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  price_cents INTEGER,
  visibility_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and admins can view boosts" ON public.service_boosts FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role('admin', auth.uid()));
CREATE POLICY "Owners and admins can create boosts" ON public.service_boosts FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid() OR public.has_role('admin', auth.uid()));
CREATE POLICY "Owners and admins can update boosts" ON public.service_boosts FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role('admin', auth.uid()))
  WITH CHECK (owner_user_id = auth.uid() OR public.has_role('admin', auth.uid()));
CREATE POLICY "Admins can delete boosts" ON public.service_boosts FOR DELETE TO authenticated
  USING (public.has_role('admin', auth.uid()));
CREATE POLICY "Public can view active boosts" ON public.service_boosts FOR SELECT TO anon, authenticated
  USING (status = 'active' AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
CREATE INDEX IF NOT EXISTS idx_service_boosts_owner_status ON public.service_boosts (owner_user_id, status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_service_boosts_service_id ON public.service_boosts (service_id);
CREATE TRIGGER trg_service_boosts_updated_at BEFORE UPDATE ON public.service_boosts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.service_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL,
  owner_user_id UUID,
  event_type public.analytics_event_type NOT NULL,
  source TEXT NOT NULL DEFAULT 'app',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create analytics events" ON public.service_analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (service_id IS NOT NULL AND event_type IN ('profile_view','contact_click','message_received','conversion') AND length(coalesce(source,'')) > 0);
CREATE POLICY "Owners and admins can view analytics events" ON public.service_analytics_events FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role('admin', auth.uid()));
CREATE INDEX IF NOT EXISTS idx_service_analytics_events_service ON public.service_analytics_events (service_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_analytics_events_owner ON public.service_analytics_events (owner_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_service_analytics_summary(_service_id UUID, _owner_user_id UUID, _days INTEGER DEFAULT 30)
RETURNS TABLE (profile_views BIGINT, contact_clicks BIGINT, messages_received BIGINT, conversions BIGINT, conversion_rate NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH events AS (
    SELECT event_type FROM public.service_analytics_events
    WHERE service_id = _service_id AND owner_user_id = _owner_user_id
      AND created_at >= now() - make_interval(days => GREATEST(_days, 1))
  )
  SELECT
    COUNT(*) FILTER (WHERE event_type='profile_view'),
    COUNT(*) FILTER (WHERE event_type='contact_click'),
    COUNT(*) FILTER (WHERE event_type='message_received'),
    COUNT(*) FILTER (WHERE event_type='conversion'),
    CASE WHEN COUNT(*) FILTER (WHERE event_type='contact_click') = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE event_type='conversion')::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE event_type='contact_click')::NUMERIC, 0)) * 100, 2) END
  FROM events;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname='message_status' AND n.nspname='public') THEN
    CREATE TYPE public.message_status AS ENUM ('sent','delivered','seen','failed');
  END IF;
END $$;

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  status public.message_status NOT NULL DEFAULT 'sent',
  delivered_at TIMESTAMPTZ,
  seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  conversation_key TEXT GENERATED ALWAYS AS (
    LEAST(sender_id::text, receiver_id::text) || ':' || GREATEST(sender_id::text, receiver_id::text)
  ) STORED
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users can send own messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND sender_id <> receiver_id AND length(trim(message_text)) > 0);
CREATE POLICY "Conversation participants can update status" ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid()) WITH CHECK (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Admins can manage messages" ON public.messages FOR ALL TO authenticated
  USING (public.has_role('admin', auth.uid())) WITH CHECK (public.has_role('admin', auth.uid()));
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver_created_at ON public.messages (sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender_created_at ON public.messages (receiver_id, sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON public.messages (conversation_key, created_at DESC);
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema='public' AND table_name='messages' AND constraint_name='messages_sender_id_fkey_profiles') THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey_profiles FOREIGN KEY (sender_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema='public' AND table_name='messages' AND constraint_name='messages_receiver_id_fkey_profiles') THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_receiver_id_fkey_profiles FOREIGN KEY (receiver_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS main_category text,
  ADD COLUMN IF NOT EXISTS sub_category text;
ALTER TABLE public.workers DROP CONSTRAINT IF EXISTS workers_main_category_allowed;
ALTER TABLE public.workers ADD CONSTRAINT workers_main_category_allowed CHECK (
  main_category IS NULL OR main_category IN (
    'Home & Local Services','Automotive & Transport','Shops, Food & Daily Needs',
    'Professional & Business Services','Health, Education & Community','Events & Lifestyle'
  )
);
ALTER TABLE public.workers DROP CONSTRAINT IF EXISTS workers_sub_category_allowed;
ALTER TABLE public.workers ADD CONSTRAINT workers_sub_category_allowed CHECK (
  sub_category IS NULL OR sub_category IN (
    'Electrician','Plumber','Carpenter','Painter','Handyman','Cleaning','Pest Control','CCTV','Solar','Repair',
    'Car/Bike/Truck Repair','Tire','Oil Change','Car Wash','Driver','Taxi','Rental','Towing',
    'Grocery','Restaurant','Cafe','Bakery','Pharmacy','Clothing','Electronics','Pet Store',
    'Web/App Dev','Design','SEO','Marketing','IT Support','Accounting','Legal','Real Estate',
    'Doctor','Clinic','Dentist','Tutor','Coaching','Blood Donor','Ambulance',
    'Event Planner','Wedding','Photographer','Videographer','DJ','Makeup'
  )
);
CREATE INDEX IF NOT EXISTS idx_workers_main_sub_category ON public.workers (main_category, sub_category);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema='public' AND table_name='blood_requests' AND constraint_name='blood_requests_requester_id_fkey_profiles') THEN
    ALTER TABLE public.blood_requests ADD CONSTRAINT blood_requests_requester_id_fkey_profiles FOREIGN KEY (requester_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_blood_requests_status_created_at ON public.blood_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blood_requests_city_status_created_at ON public.blood_requests (city, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blood_requests_requester_created_at ON public.blood_requests (requester_id, created_at DESC);