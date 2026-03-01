import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { findAsaasCustomerByCpfCnpj, createAsaasCustomer, createAsaasPayment } from '@/lib/asaas'

/**
 * Calcula a próxima data de vencimento com base no dia do mês informado.
 * Se o dia já passou no mês atual, usa o mesmo dia no próximo mês.
 * Fallback: +5 dias a partir de hoje.
 */
function calculateDueDate(dueDay: number | null | undefined): string {
    if (!dueDay || dueDay < 1 || dueDay > 31) {
        const fallback = new Date()
        fallback.setDate(fallback.getDate() + 5)
        return fallback.toISOString().split('T')[0]
    }

    const today = new Date()
    const currentDay = today.getDate()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    let targetMonth = currentMonth
    let targetYear = currentYear

    // Se o dia de vencimento já passou este mês, vai para o próximo
    if (dueDay <= currentDay) {
        targetMonth += 1
        if (targetMonth > 11) {
            targetMonth = 0
            targetYear += 1
        }
    }

    // Garante que o dia é válido para o mês (ex: dia 31 em meses com 30 dias)
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
    const safeDay = Math.min(dueDay, daysInMonth)

    const dueDate = new Date(targetYear, targetMonth, safeDay)
    return dueDate.toISOString().split('T')[0]
}

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

        // 1. Buscar fatura e dados do cliente
        const { data: invoice, error: fetchError } = await supabase
            .from('monthly_invoices')
            .select(`
                status, 
                total,
                charge_id,
                clients (
                    id, name, document, email, whatsapp, asaas_customer_id, type, due_day
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

        if (invoice.total <= 0) {
            return NextResponse.json({ error: 'Fatura com valor zero não gera cobrança.' }, { status: 400 })
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clientData = invoice.clients as any

        // 2. Determinar forma de pagamento por tipo de pessoa
        // PF → PIX | PJ → BOLETO
        const billingType = clientData.type === 'PF' ? 'PIX' : 'BOLETO'

        // 3. Calcular data de vencimento pelo due_day do cliente
        const dueDate = calculateDueDate(clientData.due_day)

        // 4. Resolver o asaas_customer_id
        let asaasCustomerId = clientData.asaas_customer_id

        if (!asaasCustomerId) {
            // Busca por CPF/CNPJ primeiro para evitar duplicatas no Asaas
            const existingId = await findAsaasCustomerByCpfCnpj(clientData.document)

            if (existingId) {
                // Cliente já existe no Asaas, só salva o ID localmente
                asaasCustomerId = existingId
            } else {
                // Cria o cliente no Asaas
                const asaasCustomer = await createAsaasCustomer({
                    name: clientData.name,
                    cpfCnpj: clientData.document,
                    email: clientData.email || undefined,
                    mobilePhone: clientData.whatsapp || undefined
                })
                asaasCustomerId = asaasCustomer.id
            }

            // Persiste o ID do cliente Asaas no banco
            await supabase
                .from('clients')
                .update({ asaas_customer_id: asaasCustomerId })
                .eq('id', clientId)
        }

        // 5. Criar cobrança no Asaas
        const payment = await createAsaasPayment({
            customer: asaasCustomerId,
            billingType,
            value: invoice.total,
            dueDate,
            description: `Fatura referente a ${month}`
        })

        const chargeId = payment.id
        const invoiceUrl = payment.invoiceUrl || payment.bankSlipUrl || null

        // 6. Salvar charge_id na fatura
        const { error: updateError } = await supabase
            .from('monthly_invoices')
            .update({ charge_id: chargeId, invoice_url: invoiceUrl })
            .eq('client_id', clientId)
            .eq('month', month)

        if (updateError) {
            console.error('Erro ao salvar charge_id na fatura:', updateError)
            return NextResponse.json({ error: 'Erro ao registrar cobrança no banco de dados.' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data: {
                chargeId,
                billingType,
                dueDate,
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
