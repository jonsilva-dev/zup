"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getRecentDeliveries } from "@/app/(dashboard)/actions"
import { formatCurrency } from "@/lib/utils"

type Delivery = {
    id: string | number
    date: string
    deliverer: string
    total: number
}

interface RecentDeliveriesListProps {
    initialDeliveries: Delivery[]
    initialHasMore: boolean
    selectedMonth: string
    isCurrentMonth: boolean
}

export function RecentDeliveriesList({ initialDeliveries, initialHasMore, selectedMonth, isCurrentMonth }: RecentDeliveriesListProps) {
    // Reset state when selectedMonth changes
    // This requires a useEffect or key-based reset in parent (better to use key in parent, but let's handle here for safety)
    // Actually, passing 'key={selectedMonth}' in parent is the React way to reset state.

    const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries)
    const [hasMore, setHasMore] = useState(initialHasMore)
    const [offset, setOffset] = useState(initialDeliveries.length)
    const [loading, setLoading] = useState(false)

    // Ensure state sync with props if parent doesn't remount
    // (But usage of key={selectedMonth} in parent is better practice)
    if (deliveries !== initialDeliveries && offset === initialDeliveries.length) {
        // This is tricky. Let's rely on parent passing key.
    }

    const loadMore = async () => {
        setLoading(true)
        try {
            const result = await getRecentDeliveries(offset, 10, selectedMonth)
            setDeliveries(prev => [...prev, ...result.deliveries])
            setHasMore(result.hasMore)
            setOffset(prev => prev + result.deliveries.length)
        } catch (error) {
            console.error(error)
            // Could add toast here
        } finally {
            setLoading(false)
        }
    }

    const title = isCurrentMonth ? "Últimas Entregas" : "Entregas Realizadas"

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            <div className="space-y-4">
                {deliveries.map((delivery) => (
                    <Link href={`/entrega/${delivery.id}`} key={delivery.id} className="block hover:opacity-80 transition-opacity">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">{delivery.date}</p>
                                <p className="text-sm text-muted-foreground">{delivery.deliverer}</p>
                            </div>
                            <div className="font-bold">
                                R$ {formatCurrency(delivery.total)}
                            </div>
                        </div>
                    </Link>
                ))}

                {deliveries.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">Nenhuma entrega encontrada.</p>
                )}

                {hasMore && (
                    <Button
                        onClick={loadMore}
                        variant="outline"
                        className="w-full"
                        disabled={loading}
                    >
                        {loading ? "Carregando..." : "Carregar mais"}
                    </Button>
                )}
            </div>
        </div>
    )
}
