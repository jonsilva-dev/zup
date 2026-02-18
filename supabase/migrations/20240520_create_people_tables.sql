-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PF', 'PJ')),
    name TEXT NOT NULL,
    razao_social TEXT,
    document TEXT NOT NULL,
    ie TEXT,
    email TEXT,
    whatsapp TEXT,
    address_zip TEXT,
    address_street TEXT,
    address_number TEXT,
    address_district TEXT,
    address_city TEXT,
    address_state TEXT,
    delivery_schedule JSONB DEFAULT '{}'::jsonb,
    custom_prices JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access (for this stage of development)
CREATE POLICY "Enable all access for all users" ON public.clients
    FOR ALL USING (true) WITH CHECK (true);

-- Create app_users table (separate from auth.users for now as per form requirements)
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'deliverer')),
    password TEXT -- Storing plain/hashed password for simple app logic as requested
);

-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Enable all access for app_users" ON public.app_users
    FOR ALL USING (true) WITH CHECK (true);
