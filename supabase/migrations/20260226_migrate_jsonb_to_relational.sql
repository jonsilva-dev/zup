-- ============================================
-- MIGRATION (revisada): JSONB -> tabelas normalizadas
-- - custom_prices (jsonb array) -> client_product_prices
-- - delivery_schedule (jsonb object) -> delivery_schedules
-- Inclui segurança: UNIQUE + ON CONFLICT (idempotente)
-- ============================================

-- 0) Segurança: garante unicidade para evitar duplicação ao reexecutar
create unique index if not exists delivery_schedules_uniq
on public.delivery_schedules (client_id, product_id, day_of_week);

-- 1) Transferir dados de 'custom_prices' JSONB para 'client_product_prices'
DO $$
DECLARE
    client_rec RECORD;
    price_rec  RECORD;
BEGIN
    FOR client_rec IN
        SELECT id, custom_prices
        FROM public.clients
        WHERE custom_prices IS NOT NULL
          AND jsonb_typeof(custom_prices) = 'array'
    LOOP
        FOR price_rec IN
            SELECT *
            FROM jsonb_to_recordset(client_rec.custom_prices) AS x(id UUID, price NUMERIC)
        LOOP
            -- Verifica se o produto ainda existe para não violar a FK
            IF EXISTS (SELECT 1 FROM public.products WHERE id = price_rec.id) THEN
                INSERT INTO public.client_product_prices (client_id, product_id, price)
                VALUES (client_rec.id, price_rec.id, price_rec.price)
                ON CONFLICT (client_id, product_id)
                DO UPDATE SET price = EXCLUDED.price;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- 2) Transferir dados de 'delivery_schedule' JSONB (Formato Record<int, Record<uuid, int>>) para 'delivery_schedules'
DO $$
DECLARE
    client_rec   RECORD;
    day_key      TEXT;
    product_key  TEXT;
    quantity_val NUMERIC;
BEGIN
    FOR client_rec IN
        SELECT id, delivery_schedule
        FROM public.clients
        WHERE delivery_schedule IS NOT NULL
          AND jsonb_typeof(delivery_schedule) = 'object'
    LOOP
        -- Itera pelas chaves do dia (0 a 6)
        FOR day_key IN
            SELECT jsonb_object_keys(client_rec.delivery_schedule)
        LOOP
            -- Itera pelas chaves de produtos dentro do objeto do dia
            IF jsonb_typeof(client_rec.delivery_schedule->day_key) = 'object' THEN
                FOR product_key IN
                    SELECT jsonb_object_keys(client_rec.delivery_schedule->day_key)
                LOOP
                    -- Extrai a quantidade inserida (parse para numeric)
                    quantity_val := (client_rec.delivery_schedule->day_key->>product_key)::NUMERIC;

                    -- Verifica se o produto ainda existe para não violar a FK
                    IF EXISTS (SELECT 1 FROM public.products WHERE id = product_key::UUID) THEN
                        INSERT INTO public.delivery_schedules (client_id, product_id, day_of_week, quantity)
                        VALUES (
                            client_rec.id,
                            product_key::UUID,
                            day_key::INTEGER,
                            quantity_val
                        )
                        ON CONFLICT (client_id, product_id, day_of_week)
                        DO UPDATE SET quantity = EXCLUDED.quantity;
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;
END $$;