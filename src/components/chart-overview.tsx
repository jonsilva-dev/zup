"use client"

import { useEffect, useState } from "react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type ChartData = {
    name: string
    sales: number
    cost: number
}

interface ChartOverviewProps {
    data: ChartData[]
}

export function ChartOverview({ data }: ChartOverviewProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground">Carregando gráfico...</div>

    return (
        <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                <Tooltip
                    formatter={(value: number | undefined) => [`R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, undefined]}
                    labelStyle={{ color: 'black' }}
                />
                <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} name="Vendas" />
                <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} name="Custos" />
            </LineChart>
        </ResponsiveContainer>
    )
}
