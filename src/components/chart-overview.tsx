"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

type ChartData = {
    name: string
    value: number
}

interface ChartOverviewProps {
    data: ChartData[]
}

// A vibrant, premium color palette for the donut slices
const COLORS = [
    '#0ea5e9', // Sky blue
    '#f43f5e', // Rose
    '#8b5cf6', // Violet
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#3b82f6', // Blue
    '#14b8a6', // Teal
    '#84cc16', // Lime
    '#6366f1', // Indigo
    '#94a3b8', // Slate (for 'Others' or empty)
]


export function ChartOverview({ data }: ChartOverviewProps) {
    const [mounted, setMounted] = useState(false)
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)

    useEffect(() => {
        setMounted(true)
        if (data && data.length > 0 && data[0].name !== "Sem dados") {
            setActiveIndex(0) // Default to first item
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data])

    if (!mounted) return <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground">Carregando gráfico...</div>

    const totalRevenue = data.reduce((acc, curr) => acc + (curr.name === "Sem dados" ? 0 : curr.value), 0)
    const activeItem = activeIndex !== null && data[activeIndex] ? data[activeIndex] : null
    const activePercentage = activeItem && totalRevenue > 0 ? ((activeItem.value / totalRevenue) * 100).toFixed(1) : "0.0"

    const onPieClick = (_: any, index: number) => {
        if (data[index].name !== "Sem dados") {
            setActiveIndex(index)
        }
    }

    // Touch handlers for swipe (carousel effect)
    const minSwipeDistance = 50

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null) // reset touch end
        setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX)
    }

    const onTouchEndHandler = () => {
        if (!touchStart || !touchEnd || activeIndex === null || data[0].name === "Sem dados") return
        const distance = touchStart - touchEnd
        const isLeftSwipe = distance > minSwipeDistance
        const isRightSwipe = distance < -minSwipeDistance

        if (isLeftSwipe && activeIndex < data.length - 1) {
            // Swipe left (next item)
            setActiveIndex(activeIndex + 1)
        }
        if (isRightSwipe && activeIndex > 0) {
            // Swipe right (prev item)
            setActiveIndex(activeIndex - 1)
        }
    }

    return (
        <div
            className="flex flex-col items-center select-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEndHandler}
        >
            <div className="h-[220px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={2}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                            onClick={onPieClick}
                            className="cursor-pointer outline-none"
                            // @ts-expect-error recharts ActiveIndex type mismatch
                            activeIndex={activeIndex ?? undefined}
                            onMouseEnter={onPieClick} // Make hover and click share the same logic
                        >
                            {data.map((entry, index) => {
                                const isActive = activeIndex === index;
                                return (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.name === "Sem dados" ? '#e2e8f0' : COLORS[index % COLORS.length]}
                                        stroke={isActive ? COLORS[index % COLORS.length] : 'none'}
                                        strokeWidth={isActive ? 2 : 0}
                                        opacity={activeIndex === null || isActive ? 1 : 0.4}
                                        style={{ transition: 'all 0.3s ease' }}
                                    />
                                )
                            })}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Selected item details below the chart */}
            <div className="mt-4 h-[80px] flex flex-col items-center justify-center text-center px-4 w-full">
                {activeItem && activeItem.name !== "Sem dados" ? (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <p className="text-sm font-medium text-muted-foreground mb-1">{activeItem.name}</p>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-2xl font-bold">R$ {activeItem.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                {activePercentage}%
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="text-muted-foreground text-sm">
                        {data[0]?.name === "Sem dados" ? "Nenhum dado para o período" : "Toque ou deslize em uma fatia para ver os detalhes"}
                    </div>
                )}
            </div>

            {data.length > 1 && data[0]?.name !== "Sem dados" && (
                <div className="flex gap-1 mt-2">
                    {data.map((_, idx) => (
                        <div
                            key={`dot-${idx}`}
                            className={`h-1.5 rounded-full transition-all duration-300 ${activeIndex === idx ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
