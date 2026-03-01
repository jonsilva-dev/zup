
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronRight, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getInvoiceDetails, getClientInvoiceHistory } from "../actions"
import { ValidateButton } from "./validate-button"
import Link from "next/link"
import { formatCurrency } from "@/utils/format"

export default async function FaturaDetalhePage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { id } = await params
    const resolvedSearchParams = await searchParams

    const now = new Date()
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const selectedMonth = (resolvedSearchParams?.month as string) || currentMonthStr

    // Fetch Details & History in parallel
    const [details, history] = await Promise.all([
        getInvoiceDetails(id, selectedMonth),
        getClientInvoiceHistory(id)
    ])

    const { client, month, status, total, previousTotal, deliveries } = details

    // Format month for display
    const [y, m] = month.split('-')
    const dateObj = new Date(parseInt(y), parseInt(m) - 1)
    const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long' })
    const capitalizedMonth = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} - ${y}`

    let percentageChange = 0
    let isTrendUp = true

    if (previousTotal && previousTotal > 0) {
        percentageChange = ((total - previousTotal) / previousTotal) * 100
        isTrendUp = percentageChange >= 0
    } else if (total > 0 && (!previousTotal || previousTotal === 0)) {
        // Technically infinite growth from 0, but let's just show 100% or omit.
        percentageChange = 100
        isTrendUp = true
    }

    const absPercentage = Math.abs(percentageChange).toFixed(1)

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-4">
                    <div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 -ml-2 text-muted-foreground hover:text-foreground" asChild>
                            <Link href={`/faturas?month=${selectedMonth}`}>
                                <ArrowLeft className="size-6" strokeWidth={1.5} />
                                <span className="sr-only">Voltar</span>
                            </Link>
                        </Button>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={status === 'fechado' ? 'secondary' : 'outline'} className={status === 'validated' ? 'bg-blue-300 text-blue-950 border-transparent' : ''}>
                                Fatura {status === 'validated' ? 'Validada' : status === 'fechado' ? 'Fechada' : 'Em Aberto'}
                            </Badge>
                            <span className="text-sm text-muted-foreground capitalize">{capitalizedMonth}</span>
                        </div>
                    </div>
                </div>

                <ValidateButton
                    clientId={client.id}
                    month={month}
                    total={total}
                    status={status}
                    productSummary={details.productSummary || []}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-neutral-200 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden rounded-xl">
                    <div className="flex flex-col items-start w-full text-left gap-1 px-6 py-4">
                        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 font-sans">
                            Total
                        </span>
                        <div className="text-2xl font-bold flex flex-col justify-start w-full gap-1">
                            <span className="text-foreground">{formatCurrency(total)}</span>
                            {previousTotal !== undefined && (
                                <div className={`flex items-center text-xs font-medium ${isTrendUp ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                                    {isTrendUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                    <span>{absPercentage}% mês anterior</span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Entregas do Mês</h2>
                {deliveries.length === 0 ? (
                    <div className="text-muted-foreground text-sm border rounded-lg p-4 bg-card">
                        Nenhuma entrega registrada para este cliente neste mês.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {deliveries.map((delivery: any) => (
                            <Link href={`/entrega/${delivery.id}?clientId=${client.id}`} key={delivery.id} className="block hover:opacity-80 transition-opacity">
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{delivery.date}</p>
                                        <p className="text-sm text-muted-foreground">{delivery.deliverer}</p>
                                    </div>
                                    <div className="font-bold">
                                        {formatCurrency(delivery.total)}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Histórico de Faturas</h2>
                <div className="space-y-2">
                    {history.map((hist) => {
                        // Format history month
                        const [hy, hm] = hist.month.split('-')
                        const hDate = new Date(parseInt(hy), parseInt(hm) - 1)
                        const hMonthName = hDate.toLocaleDateString('pt-BR', { month: 'long' })
                        const hCapMonth = `${hMonthName.charAt(0).toUpperCase() + hMonthName.slice(1)} - ${hy}`
                        const isCurrent = hist.month === month

                        return (
                            <Link
                                href={`/faturas/${client.id}?month=${hist.month}`}
                                key={hist.month}
                                className={`flex items-start justify-between p-4 rounded-xl cursor-pointer transition-colors border ${isCurrent ? 'bg-neutral-200 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-800 shadow-sm' : 'hover:bg-muted/50 border-neutral-200/50 dark:border-neutral-800/50'}`}
                            >
                                <div className="space-y-1.5 flex-1">
                                    <div className="font-medium text-[15px] flex items-center">
                                        {hCapMonth}
                                        {isCurrent && <span className="ml-2 text-xs text-muted-foreground font-normal">(Visualizando)</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-base leading-none">
                                            {hist.isCalculated && hist.status === 'open'
                                                ? <Badge variant="outline" className="font-normal text-muted-foreground border-transparent px-0 h-auto">Em Aberto</Badge>
                                                : formatCurrency(hist.total)
                                            }
                                        </span>
                                        {(!hist.isCalculated || hist.status !== 'open') && (
                                            <Badge variant={hist.status === 'fechado' ? 'secondary' : 'outline'} className={`text-[10px] h-5 px-2 rounded-full font-medium${hist.status === 'validated' ? ' bg-blue-300 text-blue-950 border-transparent' : ''}`}>
                                                {hist.status === 'validated' ? 'Validada' : hist.status === 'fechado' ? 'Fechada' : 'Em Aberto'}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center pl-3">
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </Link>
                        )
                    })}
                    {history.length === 0 && (
                        <div className="text-muted-foreground text-sm">
                            Nenhum histórico disponível.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
