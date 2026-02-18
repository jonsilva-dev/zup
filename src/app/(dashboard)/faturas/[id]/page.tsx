'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronRight } from "lucide-react"

export default async function FaturaDetalhePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    // Mock fetch based on ID
    const client = {
        id: params.id,
        name: 'Padaria do João',
        currentMonth: {
            month: 'Fevereiro 2026',
            sales: 1540.50,
            costs: 450.20,
            profit: 1090.30,
            status: 'aberto'
        },
        deliveries: [
            { id: '1', date: '15/02/2026', deliverer: 'João', total: 250.00 },
            { id: '2', date: '14/02/2026', deliverer: 'Maria', total: 320.50 },
            { id: '3', date: '13/02/2026', deliverer: 'Pedro', total: 180.00 },
        ],
        history: [
            { month: 'Janeiro 2026', total: 4200.00, status: 'fechado' },
            { month: 'Dezembro 2025', total: 5100.00, status: 'fechado' },
        ]
    }

    return (
        <div className="pb-24 space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
                <Badge variant={client.currentMonth.status === 'aberto' ? 'outline' : 'secondary'}>
                    Fatura {client.currentMonth.status === 'aberto' ? 'Aberta' : 'Fechada'}
                </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total a Pagar ({client.currentMonth.month})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">
                            R$ {client.currentMonth.sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Entregas do Mês</h2>
                <div className="space-y-2">
                    {client.deliveries.map((delivery) => (
                        <div key={delivery.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                            <div className="flex items-center space-x-4">
                                <div className="bg-muted p-2 rounded-full">
                                    <Calendar className="h-4 w-4" />
                                </div>
                                <div>
                                    <div className="font-medium">{delivery.date}</div>
                                    <div className="text-xs text-muted-foreground">Entregador: {delivery.deliverer}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-sm">R$ {delivery.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                {/* Edit logic would go here, maybe linking to delivery edit */}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
                <h2 className="text-lg font-semibold">Histórico</h2>
                <div className="space-y-2">
                    {client.history.map((hist, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer">
                            <div className="font-medium">{hist.month}</div>
                            <div className="flex items-center space-x-2">
                                <span className="font-bold text-muted-foreground">R$ {hist.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
