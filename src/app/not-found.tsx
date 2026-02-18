"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-950">
            <h2 className="text-4xl font-bold tracking-tight">404</h2>
            <p className="text-lg text-muted-foreground">Página não encontrada</p>
            <p className="text-sm text-gray-500">A página que você está procurando não existe.</p>
            <Button asChild>
                <Link href="/">
                    Voltar para o Início
                </Link>
            </Button>
        </div>
    )
}
