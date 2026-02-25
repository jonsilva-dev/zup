'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Plus, Package, FileText, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
    const pathname = usePathname()

    const links = [
        { href: '/', icon: Home, label: 'Início' },
        { href: '/pessoas', icon: Users, label: 'Pessoas' },
        { href: '/entrega', icon: Truck, label: 'Entrega', highlight: true },
        { href: '/produtos', icon: Package, label: 'Produtos' },
        { href: '/faturas', icon: FileText, label: 'Faturas' },
    ]

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-white/30 backdrop-blur-md shadow-xl dark:bg-gray-800/30 border dark:border-gray-700">
            <nav className="flex justify-center items-center gap-4 p-2">
                {links.map((link) => {
                    const Icon = link.icon
                    const isActive = pathname === link.href

                    if (link.highlight) {
                        // Special handling for highlighted link (Entrega) - now inline but colored
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-lg transition-colors bg-primary text-primary-foreground shadow-md",
                                    isActive
                                        ? "opacity-100"
                                        : "opacity-90 hover:opacity-100"
                                )}
                            >
                                <Icon className="h-6 w-6" />
                            </Link>
                        )
                    }

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-lg transition-colors",
                                isActive
                                    ? "text-black dark:text-white"
                                    : "text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-100"
                            )}
                        >
                            <Icon className="h-6 w-6" />
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
