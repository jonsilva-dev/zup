'use client'

import { usePathname } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'
import { Header } from '@/components/header'

const HIDDEN_NAV_ROUTES = [
    '/produtos/novo',
    '/entrega',
    // Matches /produtos/[id] but not /produtos
    /^\/produtos\/[^/]+$/,
    // Matches /entrega/[id]
    /^\/entrega\/[^/]+$/,
    // Matches /pessoas/cliente/* and /pessoas/usuario/*
    /^\/pessoas\/cliente\/.*$/,
    /^\/pessoas\/usuario\/.*$/
]

const HIDDEN_HEADER_ROUTES = [
    '/faturas',
    // Matches /faturas/[id]
    /^\/faturas\/[^/]+$/
]

interface DashboardContentProps {
    children: React.ReactNode
    user?: { name?: string | null } | null
}

export function DashboardContent({ children, user }: DashboardContentProps) {
    const pathname = usePathname()

    const shouldHideNav = HIDDEN_NAV_ROUTES.some(route => {
        if (typeof route === 'string') {
            return pathname === route
        }
        return route.test(pathname)
    })

    const shouldHideHeader = shouldHideNav || HIDDEN_HEADER_ROUTES.some(route => {
        if (typeof route === 'string') {
            return pathname === route
        }
        return route.test(pathname)
    })

    return (
        <div suppressHydrationWarning className={`min-h-screen w-full bg-neutral-50 dark:bg-neutral-950 ${shouldHideNav ? '' : 'pb-28'}`}>
            {!shouldHideHeader && <Header userName={user?.name} />}
            <main className="flex-1 overflow-auto">
                <div className="p-6">
                    {children}
                </div>
            </main>
            {!shouldHideNav && <BottomNav />}
        </div>
    )
}
