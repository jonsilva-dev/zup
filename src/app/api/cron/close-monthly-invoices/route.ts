import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    // 0. Parse Search Params
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'
    const queryMonth = searchParams.get('month') // Expected format YYYY-MM

    // 1. Validate Cron Secret
    const authHeader = request.headers.get("Authorization")
    // If not local env, we strictly enforce CRON_SECRET. (In dev, process.env.CRON_SECRET might be undefined)
    const expectedToken = process.env.CRON_SECRET || 'dev-secret'
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 })
    } else if (process.env.NODE_ENV !== 'production' && authHeader !== `Bearer ${expectedToken}`) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    // 2. Check if today is the last day of the month (BRT Timezone)
    // We get current date in UTC, then convert to BRT (UTC-3).
    // The vercel cron runs at 23:59 BRT which can be 02:59 UTC of the next day.
    // So to be exact, we should form a Date object explicitly for BRT.
    const now = new Date()
    // To get BRT date components, we can use Intl.DateTimeFormat
    const formatter = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "numeric",
        day: "numeric",
    })

    // formatter.format(now) returns "DD/MM/YYYY"
    const parts = formatter.format(now).split("/")
    let currentDayBRT = parseInt(parts[0], 10)
    let currentMonthBRT = parseInt(parts[1], 10)
    let currentYearBRT = parseInt(parts[2], 10)

    // Check what is the last day of this month in BRT
    // Month in JS Date is 0-indexed, so currentMonthBRT (which is 1-12) used as month index gives the NEXT month.
    // Day 0 of next month is the last day of current month.
    let lastDayOfMonth = new Date(currentYearBRT, currentMonthBRT, 0).getDate()

    // If queryMonth is provided with force, override the month parameters for manual execution
    if (force && queryMonth) {
        const [qy, qm] = queryMonth.split('-')
        currentYearBRT = parseInt(qy, 10)
        currentMonthBRT = parseInt(qm, 10)
        lastDayOfMonth = new Date(currentYearBRT, currentMonthBRT, 0).getDate()
    }

    if (!force && currentDayBRT !== lastDayOfMonth) {
        return NextResponse.json({
            message: "Not the last day of the month. Skipped.",
            day: currentDayBRT,
            lastDay: lastDayOfMonth
        })
    }

    // 3. Process the Invoices Snapshot
    // Create Supabase Admin client to bypass RLS (since this is an automated task)
    // We use service role key for cron jobs. If not available, fallback to anon key (which might fail if RLS is strict).
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const monthStr = `${currentYearBRT}-${String(currentMonthBRT).padStart(2, '0')}` // e.g., "2026-02"
    const startDate = `${monthStr}-01`
    const endDate = `${monthStr}-${String(lastDayOfMonth).padStart(2, '0')}`

    // Fetch all clients
    const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')

    if (clientsError || !clients) {
        console.error("Error fetching clients:", clientsError)
        return NextResponse.json({ error: "Db Error: " + clientsError?.message }, { status: 500 })
    }

    // Fetch delivery items for this month
    const { data: items, error: itemsError } = await supabase
        .from('delivery_items')
        .select(`
            client_id,
            quantity,
            unit_price,
            deliveries!inner(date)
        `)
        .gte('deliveries.date', startDate)
        .lte('deliveries.date', endDate)

    if (itemsError) {
        console.error("Error fetching delivery items:", itemsError)
        return NextResponse.json({ error: "Db Error: " + itemsError.message }, { status: 500 })
    }

    // Fetch existing invoice statuses for the month
    const { data: existingInvoices, error: statusError } = await supabase
        .from('monthly_invoices')
        .select('client_id, status')
        .eq('month', monthStr)

    if (statusError) {
        console.error("Error fetching statuses:", statusError)
        return NextResponse.json({ error: "Db Error: " + statusError.message }, { status: 500 })
    }

    // Aggregate Data
    const clientTotals = new Map<string, number>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items?.forEach((item: any) => {
        const price = Number(item.unit_price) || 0
        const qty = Number(item.quantity) || 0
        const total = price * qty

        clientTotals.set(item.client_id, (clientTotals.get(item.client_id) || 0) + total)
    })

    const upserts = []

    for (const client of clients) {
        const total = clientTotals.get(client.id) || 0
        const existingInvoice = existingInvoices?.find(inv => inv.client_id === client.id)

        // If the client had no deliveries and doesn't have an invoice record, we can skip them
        if (total === 0 && !existingInvoice) {
            continue
        }

        // We only change the status to 'fechado' if it's currently 'aberto' or 'open' or doesn't exist
        // If it's already 'validated' or 'fechado' or 'paid', we keep its current status.
        // Actually, the user requirement: "setar status 'Fechada' para todas que estiverem 'Aberto' ou não existirem"
        let newStatus = 'fechado'
        if (existingInvoice && existingInvoice.status !== 'open' && existingInvoice.status !== 'aberto') {
            newStatus = existingInvoice.status // Keep existing (e.g., 'validated')
        }

        upserts.push({
            client_id: client.id,
            month: monthStr,
            total: total,
            status: newStatus,
            updated_at: new Date().toISOString()
        })
    }

    if (upserts.length > 0) {
        const { error: upsertError } = await supabase
            .from('monthly_invoices')
            .upsert(upserts, { onConflict: 'client_id, month' })

        if (upsertError) {
            console.error("Error upserting invoices:", upsertError)
            return NextResponse.json({ error: "Upsert Error: " + upsertError.message }, { status: 500 })
        }
    }

    return NextResponse.json({
        message: "Successfully closed invoices.",
        month: monthStr,
        processedCount: upserts.length
    })
}
