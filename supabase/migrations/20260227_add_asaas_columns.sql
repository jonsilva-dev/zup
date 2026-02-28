-- Add asaas_customer_id to clients
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'asaas_customer_id') THEN
        ALTER TABLE public.clients ADD COLUMN asaas_customer_id TEXT;
    END IF;
END $$;

-- Add charge_id to monthly_invoices
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monthly_invoices' AND column_name = 'charge_id') THEN
        ALTER TABLE public.monthly_invoices ADD COLUMN charge_id TEXT;
    END IF;
END $$;
