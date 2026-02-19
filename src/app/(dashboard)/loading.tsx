export default function Loading() {
    return (
        <div className="space-y-4 pb-32">
            <div className="flex items-center justify-between">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-9 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>

            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-4 bg-card text-card-foreground shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <div className="h-5 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                            </div>
                            <div className="h-9 w-9 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
