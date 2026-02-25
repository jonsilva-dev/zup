"use client"

interface EmptyStateProps {
    title: string
    action?: React.ReactNode
}

export function EmptyState({ title, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/10 gap-4">
            <p className="text-muted-foreground">{title}</p>
            {action && action}
        </div>
    )
}
