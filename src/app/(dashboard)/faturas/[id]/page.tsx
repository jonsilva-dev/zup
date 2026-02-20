
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronRight, ArrowLeft } from "lucide-react"
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

    const { client, month, status, total, deliveries } = details

    // Format month for display
    const [y, m] = month.split('-')
    const dateObj = new Date(parseInt(y), parseInt(m) - 1)
    const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long' })
    const capitalizedMonth = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} - ${y}`

    return (
        <div className="pb-24 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link href="/faturas">
                            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Voltar</span>
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={status === 'validated' ? 'secondary' : 'outline'}>
                            Fatura {status === 'validated' ? 'Validada' : 'Em Aberto'}
                        </Badge>
                        <span className="text-sm text-muted-foreground capitalize">{capitalizedMonth}</span>
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
                <Card className={`border-primary/20 ${status === 'validated' ? 'bg-secondary/10' : 'bg-primary/5'}`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total ({capitalizedMonth})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">
                            {formatCurrency(total)}
                        </div>
                    </CardContent>
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
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-card shadow-sm hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <div className="bg-muted p-2 rounded-full hidden sm:block">
                                            <Calendar className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{delivery.date}</div>
                                            <div className="text-xs text-muted-foreground">Entregador: {delivery.deliverer}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-sm">{formatCurrency(delivery.total)}</div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-4 pt-4 border-t">
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
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border ${isCurrent ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50 border-transparent'}`}
                            >
                                <div className="font-medium">
                                    {hCapMonth}
                                    {isCurrent && <span className="ml-2 text-xs text-muted-foreground">(Visualizando)</span>}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <span className="font-bold text-sm block">
                                            {hist.isCalculated && hist.status === 'open'
                                                ? <Badge variant="outline" className="font-normal">Em Aberto</Badge>
                                                : formatCurrency(hist.total)
                                            }
                                        </span>
                                        {(!hist.isCalculated || hist.status !== 'open') && (
                                            <Badge variant={hist.status === 'validated' ? 'secondary' : 'outline'} className="text-[10px] h-5 px-1.5">
                                                {hist.status === 'validated' ? 'Validado' : 'Em Aberto'}
                                            </Badge>
                                        )}
                                    </div>
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
