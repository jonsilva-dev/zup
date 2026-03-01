
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MonthSelector } from "@/components/month-selector"
import { getInvoices } from "./actions"
import { getAvailableMonths } from "../actions"
import { formatCurrency } from "@/utils/format"
import { DollarSign, ChevronDown } from "lucide-react"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

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
    const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long' })
    const capitalizedMonth = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} - ${y}`

    // Calculate detailed totals
    const totalReceber = invoices
        .filter(i => ['open', 'fechado', 'validated'].includes(i.status))
        .reduce((acc, i) => acc + i.total, 0)

    // Asaas integration might use 'paid' or 'overdue' statuses in the future.
    const totalPago = invoices
        .filter(i => i.status === 'paid')
        .reduce((acc, i) => acc + i.total, 0)

    const totalVencido = invoices
        .filter(i => i.status === 'overdue')
        .reduce((acc, i) => acc + i.total, 0)

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold tracking-tight">Faturas</h1>
                </div>

                <div className="flex items-center justify-between">
                    <MonthSelector minMonth={safeMin} maxMonth={safeMax} />
                </div>

                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="summary" className="border-none rounded-xl bg-neutral-200 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                        <AccordionTrigger className="hover:no-underline px-6 py-4">
                            <div className="flex flex-col items-start w-full text-left gap-1">
                                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 font-sans">
                                    Total de Vendas ({capitalizedMonth})
                                </span>
                                <div className="text-2xl font-bold flex items-center justify-between w-full">
                                    <span className="text-foreground">{formatCurrency(totalSales)}</span>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-4 pt-1 border-t border-neutral-300 dark:border-neutral-700 mx-6">
                            <div className="flex flex-col space-y-3 pt-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-neutral-600 dark:text-neutral-400">Total à receber</span>
                                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency(totalReceber)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-neutral-600 dark:text-neutral-400">Total pago</span>
                                    <span className="font-semibold text-green-600 dark:text-green-500">{formatCurrency(totalPago)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-neutral-600 dark:text-neutral-400">Total vencido</span>
                                    <span className="font-semibold text-red-600 dark:text-red-500">{formatCurrency(totalVencido)}</span>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
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
                                            <Badge variant={invoice.status === 'validated' ? 'default' : invoice.status === 'fechado' ? 'secondary' : 'outline'}>
                                                {invoice.status === 'validated' ? 'Validado' : invoice.status === 'fechado' ? 'Fechada' : 'Em Aberto'}
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
