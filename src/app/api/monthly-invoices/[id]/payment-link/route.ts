import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: clientId } = await params
        const { searchParams } = new URL(request.url)
        const month = searchParams.get('month')

        if (!clientId || !month) {
            return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 })
        }

        const supabase = await createClient()

        const { data: invoice, error } = await supabase
            .from('monthly_invoices')
            .select('invoice_url')
            .eq('client_id', clientId)
            .eq('month', month)
            .single()

        if (error || !invoice?.invoice_url) {
            return NextResponse.json({ error: 'Link de pagamento não encontrado.' }, { status: 404 })
        }

        return NextResponse.json({ url: invoice.invoice_url })
    } catch (error: any) {
        console.error('Erro ao buscar link de pagamento:', error)
        return NextResponse.json({ error: error?.message || 'Erro interno.' }, { status: 500 })
    }
}
