import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAsaasCustomer, createAsaasPayment } from '@/lib/asaas'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: clientId } = await params
        const body = await request.json()
        const { month, total } = body

        if (!clientId || !month || total === undefined) {
            return NextResponse.json(
                { error: 'Parâmetros inválidos. Necessário: id (clientId na URL), month e total no corpo.' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // 1. Check if invoice exists and is validated
        const { data: invoice, error: fetchError } = await supabase
            .from('monthly_invoices')
            .select(`
                status, 
                total,
                charge_id,
                clients (
                    id, name, document, email, whatsapp, asaas_customer_id
                )
            `)
            .eq('client_id', clientId)
            .eq('month', month)
            .single()

        if (fetchError || !invoice) {
            return NextResponse.json({ error: 'Fatura não encontrada.' }, { status: 404 })
        }

        if (invoice.status !== 'validated') {
            return NextResponse.json({ error: 'Fatura precisa estar validada para criar cobrança.' }, { status: 400 })
        }

        if (invoice.charge_id) {
            return NextResponse.json({ error: 'Fatura já possui uma cobrança gerada.' }, { status: 400 })
        }

        // 2. Prevent creating charge for total 0
        if (invoice.total <= 0) {
            return NextResponse.json({ error: 'Fatura com valor zero não gera cobrança.' }, { status: 400 })
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clientData = invoice.clients as any;

        // 3. Asaas Integration
        let asaasCustomerId = clientData.asaas_customer_id

        if (!asaasCustomerId) {
            // Create customer in Asaas
            const asaasCustomer = await createAsaasCustomer({
                name: clientData.name,
                cpfCnpj: clientData.document,
                email: clientData.email || undefined,
                mobilePhone: clientData.whatsapp || undefined
            });

            asaasCustomerId = asaasCustomer.id;

            // Save to supabase
            await supabase
                .from('clients')
                .update({ asaas_customer_id: asaasCustomerId })
                .eq('id', clientId);
        }

        // Create Payment in Asaas - due date usually 5 days from today
        const dueDateObj = new Date();
        dueDateObj.setDate(dueDateObj.getDate() + 5);
        const dueDate = dueDateObj.toISOString().split('T')[0];

        const payment = await createAsaasPayment({
            customer: asaasCustomerId,
            billingType: 'BOLETO', // Defaulting to BOLETO
            value: invoice.total,
            dueDate: dueDate,
            description: `Fatura referente a ${month}`
        });

        const chargeId = payment.id;

        // 4. Update the invoice to reflect it has a charge
        const { error: updateError } = await supabase
            .from('monthly_invoices')
            .update({
                charge_id: chargeId,
            })
            .eq('client_id', clientId)
            .eq('month', month)

        if (updateError) {
            console.error('Erro ao salvar charge_id na fatura:', updateError)
            return NextResponse.json({ error: 'Erro ao registrar cobrança no banco de dados.' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data: {
                chargeId: chargeId,
                message: 'Cobrança criada com sucesso.'
            }
        })

    } catch (error: any) {
        console.error('Erro ao criar cobrança:', error)
        return NextResponse.json(
            { error: error?.message || 'Erro interno do servidor.' },
            { status: 500 }
        )
    }
}
