'use client'

import { useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Products page error:', error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 text-center">
            <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
                <h2 className="text-xl font-semibold">Algo deu errado!</h2>
                <p className="text-muted-foreground max-w-[500px]">
                    Não foi possível carregar a lista de produtos.
                    {error.message && <span className="block mt-2 text-sm font-mono bg-muted p-2 rounded">{error.message}</span>}
                </p>
            </div>
            <Button onClick={() => reset()}>
                Tentar novamente
            </Button>
        </div>
    )
}
