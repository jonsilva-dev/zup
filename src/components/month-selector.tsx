'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface MonthSelectorProps {
    minMonth: string // "YYYY-MM"
    maxMonth: string // "YYYY-MM"
}

export function MonthSelector({ minMonth, maxMonth }: MonthSelectorProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Default to current month if not in params
    const currentParam = searchParams.get('month')
    const now = new Date()
    const currentMonth = currentParam || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const [year, month] = currentMonth.split('-').map(Number)
    const date = new Date(year, month - 1)

    const monthName = date.toLocaleDateString('pt-BR', { month: 'long' })
    const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1)
    const formattedDate = `${capitalizedMonthName} - ${year}`

    const handlePrevious = () => {
        const prevDate = new Date(year, month - 2) // month is 1-based, so -2 gives prev month 0-based index
        const newMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
        router.push(`/?month=${newMonth}`)
    }

    const handleNext = () => {
        const nextDate = new Date(year, month) // month is 1-based, so this gives next month 0-based index
        const newMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
        router.push(`/?month=${newMonth}`)
    }

    // Constraints logic
    // We can go back if current > min
    const canGoBack = currentMonth > minMonth
    // We can go forward if current < max
    // Also, usually we don't want to go into future beyond current real month? 
    // User content implies "months of front (if there is registry)"
    // So we strictly follow maxMonth from valid data, usually today or latest delivery.
    // If maxMonth is today, we can't go to next month.
    const canGoNext = currentMonth < maxMonth

    return (
        <div className="flex items-center justify-between w-full gap-4">
            <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                disabled={!canGoBack}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium capitalize text-center flex-1">
                {formattedDate}
            </span>
            <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={!canGoNext}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    )
}
