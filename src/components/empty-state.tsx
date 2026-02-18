"use client"

interface EmptyStateProps {
    title: string
}

export function EmptyState({ title }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground border rounded-lg bg-muted/10">
            <p>{title}</p>
        </div>
    )
}
