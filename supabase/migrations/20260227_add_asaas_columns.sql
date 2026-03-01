-- Add charge_id and invoice_url to monthly_invoices
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monthly_invoices' AND column_name = 'charge_id') THEN
        ALTER TABLE public.monthly_invoices ADD COLUMN charge_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monthly_invoices' AND column_name = 'invoice_url') THEN
        ALTER TABLE public.monthly_invoices ADD COLUMN invoice_url TEXT;
    END IF;
END $$;
