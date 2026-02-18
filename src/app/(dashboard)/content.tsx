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

    return (
        <div className={`min-h-screen w-full bg-gray-50 dark:bg-gray-950 ${shouldHideNav ? '' : 'pb-32'}`}>
            {!shouldHideNav && <Header userName={user?.name} />}
            <main className="flex-1 overflow-auto pb-20 md:pb-0">
                <div className="p-6">
                    {children}
                </div>
            </main>
            {!shouldHideNav && <BottomNav />}
        </div>
    )
}
