'use client'

import { Button } from "@/components/ui/button"
import { validateInvoice } from "../actions"
import { toast } from "sonner"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrency } from "@/utils/format"

interface ProductSummary {
    name: string
    quantity: number
    total: number
}

interface ValidateButtonProps {
    clientId: string
    month: string
    total: number
    status: string
    productSummary: ProductSummary[]
    disabled?: boolean
}

export function ValidateButton({ clientId, month, total, status, productSummary, disabled }: ValidateButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    // Check if current date is past the month end
    // month is "YYYY-MM"
    const [year, monthNum] = month.split('-').map(Number)
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-12

    // Closing logic: 
    // Button enabled ONLY if current date > last day of invoice month.
    // Effectively, current month > invoice month (handling year rollover)
    // Example: Invoice 2024-02. Current 2024-02-15 -> Disabled. Current 2024-03-01 -> Enabled.

    let isPastClosing = false
    if (currentYear > year) {
        isPastClosing = true
    } else if (currentYear === year && currentMonth > monthNum) {
        isPastClosing = true
    }

    // Force disabled if not past closing, unless specifically overriden (e.g. for testing, though user didn't ask)
    const isButtonDisabled = disabled || !isPastClosing || status === 'validated' || isLoading

    const handleValidate = async () => {
        setIsLoading(true)
        try {
            // 1. Atualiza status no banco via server action
            await validateInvoice(clientId, month, total)

            // 2. Chama a API para criar a cobrança
            if (total > 0) {
                const response = await fetch(`/api/monthly-invoices/${clientId}/create-charge`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ month, total })
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'Erro ao criar cobrança')
                }
            }

            toast.success("Fatura validada com sucesso!", {
                description: total > 0
                    ? "O status foi atualizado para validado e a cobrança foi gerada."
                    : "O status foi atualizado para validado."
            })
            setIsOpen(false)
        } catch (error: any) {
            toast.error("Erro na validação da fatura", {
                description: error.message || "Não foi possível concluir."
            })
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    if (status === 'validated') {
        return (
            <Button variant="secondary" disabled className="w-full md:w-auto">
                Fatura Validada
            </Button>
        )
    }

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <div className="tooltip-container inline-block">
                    <Button
                        disabled={isButtonDisabled}
                        className="w-full md:w-auto font-bold"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Validar Fatura
                    </Button>
                    {!isPastClosing && (
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                            Validar após fechamento
                        </p>
                    )}
                </div>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] sm:h-auto sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Validar Fatura - {month}</SheetTitle>
                    <SheetDescription>
                        Confira o resumo dos produtos antes de validar o fechamento desta fatura.
                        Esta ação não pode ser desfeita.
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="max-h-[60vh] py-4">
                    <div className="space-y-4">
                        <div className="rounded-lg border p-3 bg-muted/20">
                            <h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">Resumo por Produto</h3>
                            <div className="space-y-2">
                                {productSummary.map((prod, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <div className="flex-1">
                                            <span className="font-medium">{prod.name}</span>
                                            <span className="text-xs text-muted-foreground ml-2">x{prod.quantity}</span>
                                        </div>
                                        <div className="font-mono">
                                            {formatCurrency(prod.total)}
                                        </div>
                                    </div>
                                ))}
                                {productSummary.length === 0 && (
                                    <div className="text-sm text-muted-foreground italic">Nenhum produto registrado.</div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                            <span className="font-bold text-lg">Total Geral</span>
                            <span className="font-bold text-2xl text-primary">
                                {formatCurrency(total)}
                            </span>
                        </div>
                    </div>
                </ScrollArea>

                <SheetFooter className="mt-4 gap-2">
                    <SheetClose asChild>
                        <Button variant="ghost">Cancelar</Button>
                    </SheetClose>
                    <Button onClick={handleValidate} disabled={isLoading} className="w-full sm:w-auto font-bold bg-green-600 hover:bg-green-700">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar e Validar
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
