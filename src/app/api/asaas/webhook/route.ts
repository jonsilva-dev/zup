import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    try {
        // 1. Validar o Token do Webhook
        const asaasToken = request.headers.get('asaas-access-token');
        const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

        if (!expectedToken) {
            console.error('ASAAS_WEBHOOK_TOKEN não configurado no .env');
            return NextResponse.json({ error: 'Webhook token not configured' }, { status: 500 });
        }

        if (asaasToken !== expectedToken) {
            console.warn('Webhook token inválido recebido');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Extrair o corpo da requisição
        const body = await request.json();

        // O Asaas envia os dados do evento na chave "event" e os dados do pagamento em "payment"
        const { event, payment } = body;

        if (!event || !payment || !payment.id) {
            return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
        }

        console.log(`[Asaas Webhook] Recebido evento: ${event} para cobrança: ${payment.id}`);

        // 3. Determinar o novo status com base no evento
        let newStatus = null;

        switch (event) {
            case 'PAYMENT_RECEIVED':
            case 'PAYMENT_CONFIRMED':
                newStatus = 'paid';
                break;
            case 'PAYMENT_OVERDUE':
                newStatus = 'overdue';
                break;
            case 'PAYMENT_DELETED':
            case 'PAYMENT_REFUNDED':
                newStatus = 'cancelled';
                break;
            case 'PAYMENT_RESTORED':
                newStatus = 'validated'; // Se foi restaurado, volta pra aguardando pagamento
                break;
            default:
                // Outros eventos (gerados, visualizados, etc.) não precisam alterar o status atual
                console.log(`[Asaas Webhook] Evento ignorado: ${event}`);
                return NextResponse.json({ received: true });
        }

        if (newStatus) {
            // 4. Utilizar Service Role Key para ignorar RLS (já que webhooks não têm sessão de usuário)
            // IMPORTANTE: Aqui usamos o cliente do @supabase/supabase-js puro, pois o helper do SSR
            // do next.js requer cookies que não temos num webhook
            const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
            const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

            // 5. Atualizar a fatura
            const { error: updateError } = await supabase
                .from('monthly_invoices')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('charge_id', payment.id);

            if (updateError) {
                console.error(`[Asaas Webhook] Erro ao atualizar fatura para charge_id: ${payment.id}:`, updateError);
                return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
            }

            console.log(`[Asaas Webhook] Fatura com charge_id ${payment.id} atualizada para o status: ${newStatus}`);
        }

        return NextResponse.json({ received: true, status: newStatus || 'ignored' });

    } catch (error: any) {
        console.error('[Asaas Webhook] Erro ao processar webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
