
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MonthSelector } from "@/components/month-selector"
import { getInvoices } from "./actions"
import { getAvailableMonths } from "../actions"
import { formatCurrency } from "@/utils/format"
import { DollarSign } from "lucide-react"

export default async function FaturasPage({
    searchParams,
}: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    // Await params
    const params = await searchParams
    const monthParam = (params?.month as string) || undefined

    // Determine "Current Month" logic
    const now = new Date()
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Get available range
    const allowedMonths = await getAvailableMonths()
    const safeMax = allowedMonths.max > currentMonthStr ? allowedMonths.max : currentMonthStr
    const safeMin = allowedMonths.min < currentMonthStr ? allowedMonths.min : currentMonthStr

    // Determine selected month (default to current if not provided)
    const selectedMonth = monthParam || currentMonthStr

    // Fetch Invoices
    const invoices = await getInvoices(selectedMonth)

    // Calculate Total Sales for the month
    const totalSales = invoices.reduce((acc, invoice) => acc + invoice.total, 0)

    // Format month name for display
    const [y, m] = selectedMonth.split('-')
    const dateObj = new Date(parseInt(y), parseInt(m) - 1)
    const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)

    return (
        <div className="pb-24 space-y-6">
            <div className="space-y-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight">Faturas</h1>
                    <p className="text-muted-foreground text-sm">
                        Gerencie os fechamentos mensais por cliente.
                    </p>
                </div>

                <div className="flex items-center justify-between">
                    <MonthSelector minMonth={safeMin} maxMonth={safeMax} />
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Vendas ({capitalizedMonth})</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                {invoices.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        Nenhuma entrega registrada neste mês.
                    </div>
                ) : (
                    invoices.map((invoice) => (
                        <Link href={`/faturas/${invoice.id}?month=${selectedMonth}`} key={invoice.id}>
                            <Card className="hover:bg-muted/50 transition-colors cursor-pointer mb-4">
                                <CardContent className="flex items-center justify-between p-4">
                                    <div>
                                        <div className="font-semibold text-lg">{invoice.name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant={invoice.status === 'validated' ? 'secondary' : 'outline'}>
                                                {invoice.status === 'validated' ? 'Validado' : 'Em Aberto'}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {invoice.deliveryCount} entregas
                                            </span>
                                        </div>
                                    </div>
                                    <div className="font-bold text-xl">
                                        {formatCurrency(invoice.total)}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
