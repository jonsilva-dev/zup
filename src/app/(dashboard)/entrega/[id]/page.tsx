import { createClient } from "@/utils/supabase/server"
import { DeliveryList, ClientDelivery } from "../delivery-list"
import { getDeliveryById } from "../actions"
import Link from "next/link"
import { redirect } from "next/navigation"

interface EditDeliveryPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function EditDeliveryPage({ params }: EditDeliveryPageProps) {
    const paramsAwaited = await params
    const { id } = paramsAwaited

    // We treat ID as string mainly, but it could be number-like string.
    // Since our components now handle string | number, we can just pass it.
    // However, we should check if it's not empty or weird.

    if (!id || id === 'undefined') {
        return (
            <div className="p-8 text-center text-red-500">
                <h1 className="text-xl font-bold">Erro: ID Inválido</h1>
                <Link href="/" className="underline text-blue-500 mt-4 block">Voltar</Link>
            </div>
        )
    }

    const supabase = await createClient()

    // Fetch delivery data
    const deliveryData = await getDeliveryById(id)

    if (!deliveryData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
                <h1 className="text-xl font-bold mb-2">Entrega não encontrada</h1>
                <p className="text-muted-foreground mb-4">Não foi possível localizar o registro solicitado.</p>
                <Link href="/" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90">
                    Voltar para o Início
                </Link>
            </div>
        )
    }

    // Fetch all products for reference
    const { data: allProducts } = await supabase.from('products').select('*')

    // Fetch all clients
    const { data: clients } = await supabase.from('clients').select('*')

    if (!clients || !allProducts) {
        return <div>Erro ao carregar dados.</div>
    }

    return (
        <DeliveryList
            initialDeliveries={deliveryData.deliveries}
            allProducts={allProducts}
            allClients={clients}
            deliveryId={id}
            initialDate={deliveryData.date}
        />
    )
}
