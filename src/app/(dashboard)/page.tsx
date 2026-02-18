import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp } from "lucide-react"
import { ChartOverview } from "@/components/chart-overview"

import { getRecentDeliveries, getDashboardStats, getCurrentUser, getAvailableMonths } from "./actions"
import { RecentDeliveriesList } from "@/components/recent-deliveries-list"
import { MonthSelector } from "@/components/month-selector"
import { formatCurrency } from "@/lib/utils"

export default async function DashboardPage({
    searchParams,
}: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    // Await params in Next.js 15+ / 16 (if applicable, ensuring safety)
    const params = await searchParams
    const monthParam = (params?.month as string) || undefined

    // Determine "Current Month" for UI logic
    const now = new Date()
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const selectedMonth = monthParam || currentMonthStr

    // Fetch dashboard stats, user, and range (Parallel fetching)
    const [recentData, statsData, user, allowedMonths] = await Promise.all([
        getRecentDeliveries(0, 10, selectedMonth),
        getDashboardStats(selectedMonth),
        getCurrentUser(),
        getAvailableMonths()
    ])

    const { deliveries, hasMore } = recentData
    const { summary, chartData } = statsData

    // Ensure current month is covered in allowed range if it has no data yet
    // simple logic: max(maxMonth, currentMonthStr)
    const safeMax = allowedMonths.max > currentMonthStr ? allowedMonths.max : currentMonthStr
    const safeMin = allowedMonths.min < currentMonthStr ? allowedMonths.min : currentMonthStr

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Bem-vindo, {user?.name || 'Usuário'}</h1>
                </div>

                <MonthSelector minMonth={safeMin} maxMonth={safeMax} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Custos</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">R$ {formatCurrency(summary.costs)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vendas</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">R$ {formatCurrency(summary.sales)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Resultado</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${summary.result >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {formatCurrency(summary.result)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Desempenho diário</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <ChartOverview data={chartData} />
                </CardContent>
            </Card>

            <RecentDeliveriesList
                key={selectedMonth} // Helper to reset internal state when month changes
                initialDeliveries={deliveries}
                initialHasMore={hasMore}
                selectedMonth={selectedMonth}
                isCurrentMonth={selectedMonth === currentMonthStr}
            />
        </div>
    )
}
