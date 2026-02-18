-- Add custom_prices column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'custom_prices') THEN
        ALTER TABLE public.clients ADD COLUMN custom_prices JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add delivery_schedule column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'delivery_schedule') THEN
        ALTER TABLE public.clients ADD COLUMN delivery_schedule JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
