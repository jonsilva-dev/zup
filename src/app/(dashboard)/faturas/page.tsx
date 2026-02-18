'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react"

export default function FaturasPage() {
    // Mock data
    const summary = {
        sales: 45000,
        costs: 12500,
        profit: 32500
    }

    const clientsWithOpenInvoices = [
        { id: '1', name: 'Padaria do João', total: 1540.50, status: 'aberto' },
        { id: '2', name: 'Mercado Central', total: 3200.00, status: 'aberto' },
        { id: '3', name: 'Lanchonete da Esquina', total: 850.00, status: 'aberto' },
    ]

    return (
        <div className="pb-24 space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Faturas</h1>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vendas (Mês)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">R$ {summary.sales.toLocaleString('pt-BR')}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Custos</CardTitle>
                        <TrendingDown className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">R$ {summary.costs.toLocaleString('pt-BR')}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lucro</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">R$ {summary.profit.toLocaleString('pt-BR')}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Faturas em Aberto</h2>
                {clientsWithOpenInvoices.map((client) => (
                    <Link href={`/faturas/${client.id}`} key={client.id}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer mb-4">
                            <CardContent className="flex items-center justify-between p-4">
                                <div>
                                    <div className="font-semibold">{client.name}</div>
                                    <Badge variant="outline" className="mt-1">Em Aberto</Badge>
                                </div>
                                <div className="font-bold text-lg">
                                    R$ {client.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
