"use client" // Error components must be Client Components

import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
            <h2 className="text-2xl font-bold">Algo deu errado!</h2>
            <p className="text-muted-foreground">{error.message}</p>
            <button
                className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
            >
                Tentar novamente
            </button>
        </div>
    )
}
