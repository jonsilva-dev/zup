import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ErrorPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center space-y-4 text-center">
            <h1 className="text-4xl font-bold">Oops! Algo deu errado.</h1>
            <p className="text-muted-foreground">
                Não conseguimos processar sua solicitação. Por favor, tente novamente.
            </p>
            <Link href="/login">
                <Button>Voltar para o Login</Button>
            </Link>
        </div>
    )
}
