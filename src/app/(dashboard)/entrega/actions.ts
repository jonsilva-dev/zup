'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function addClientCustomPrice(clientId: string, product: { id: string, price: number }) {
    const supabase = await createClient()

    // 1. Fetch current client data
    const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('custom_prices')
        .eq('id', clientId)
        .single()

    if (fetchError) {
        console.error("Error fetching client for price update", fetchError)
        throw new Error("Erro ao buscar cliente.")
    }

    // 2. Update custom_prices array
    let currentPrices = client.custom_prices || []
    if (!Array.isArray(currentPrices)) {
        currentPrices = []
    }

    // Remove existing if present (upsert logic)
    const otherPrices = currentPrices.filter((p: any) => p.id !== product.id)
    const newPrices = [...otherPrices, product]

    // 3. Save back to DB
    const { error: updateError } = await supabase
        .from('clients')
        .update({ custom_prices: newPrices })
        .eq('id', clientId)

    if (updateError) {
        console.error("Error updating client custom prices", updateError)
        throw new Error("Erro ao salvar preço personalizado.")
    }

    revalidatePath('/entrega')
    revalidatePath('/pessoas/cliente')
}

export type DeliveryItemInput = {
    clientId: string
    products: {
        id: string
        quantity: number
        price: number
    }[]
}

export async function saveDeliveryAction(deliveryData: DeliveryItemInput[]) {
    const supabase = await createClient()

    // 1. Get current user (Deliverer)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        throw new Error("Usuário não autenticado.")
    }

    // 2. Fetch all products to get cost price
    const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, cost_price')

    if (productsError) {
        throw new Error("Erro ao buscar produtos.")
    }

    const productCostMap = new Map(products.map(p => [p.id, p.cost_price || 0]))

    // 3. Calculate totals
    let totalSales = 0
    let totalCost = 0

    deliveryData.forEach(client => {
        client.products.forEach(p => {
            const cost = productCostMap.get(p.id) || 0
            totalSales += p.quantity * p.price
            totalCost += p.quantity * cost
        })
    })

    // 4. Insert into 'deliveries'
    const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
            // Use local date for Today instead of UTC to avoid "yesterday" issues late at night
            date: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-'), // "DD/MM/YYYY" -> "YYYY-MM-DD"
            deliverer_id: user.id,
            total_sales: totalSales,
            total_cost: totalCost,
            status: 'completed'
        })
        .select()
        .single()

    if (deliveryError) {
        console.error("Error creating delivery:", deliveryError)
        throw new Error("Erro ao criar registro de entrega.")
    }

    // 5. Prepare and insert 'delivery_items'
    const itemsToInsert = []

    for (const client of deliveryData) {
        for (const product of client.products) {
            itemsToInsert.push({
                delivery_id: delivery.id,
                client_id: client.clientId,
                product_id: product.id,
                quantity: product.quantity,
                unit_price: product.price,
                unit_cost: productCostMap.get(product.id) || 0
            })
        }
    }

    if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
            .from('delivery_items')
            .insert(itemsToInsert)

        if (itemsError) {
            console.error("Error creating delivery items:", itemsError)
            // ideally we would rollback here, but Supabase HTTP API doesn't support transactions easily without RPC.
            // For now, valid assumption is robust enough.
            throw new Error("Erro ao salvar itens da entrega.")
        }
    }

    revalidatePath('/')
    revalidatePath('/entrega')
}

export async function getDeliveryById(id: string | number) {
    const supabase = await createClient()

    // Fetch delivery metadata
    const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', id)
        .single()

    if (deliveryError || !delivery) {
        console.error("Error fetching delivery:", deliveryError)
        return null
    }

    // Fetch delivery items
    const { data: items, error: itemsError } = await supabase
        .from('delivery_items')
        .select(`
            *,
            products (
                name,
                unit
            ),
            clients (
                name,
                razao_social
            )
        `)
        .eq('delivery_id', id)
        .order('id')

    if (itemsError) {
        console.error("Error fetching delivery items:", itemsError)
        return null
    }

    // Group items by client to match ClientDelivery structure
    const clientMap = new Map<string, any>()

    items.forEach((item: any) => {
        const clientId = item.client_id
        if (!clientMap.has(clientId)) {
            clientMap.set(clientId, {
                clientId: clientId,
                clientName: item.clients?.name || item.clients?.razao_social || "Cliente sem nome",
                products: []
            })
        }

        const clientEntry = clientMap.get(clientId)
        clientEntry.products.push({
            id: item.product_id,
            name: item.products?.name || "Produto desconhecido",
            quantity: item.quantity,
            unit: item.products?.unit || "un",
            price: item.unit_price
        })
    })

    const formattedDeliveries = Array.from(clientMap.values())

    return {
        id: delivery.id,
        date: delivery.date,
        deliveries: formattedDeliveries
    }
}

export async function updateDeliveryAction(id: string | number, deliveryData: DeliveryItemInput[]) {
    const supabase = await createClient()

    // 1. Check if delivery exists
    const { data: existingDelivery, error: fetchError } = await supabase
        .from('deliveries')
        .select('id, date')
        .eq('id', id)
        .single()

    if (fetchError || !existingDelivery) {
        throw new Error("Entrega não encontrada.")
    }

    // 2. Fetch all products to get cost price
    const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, cost_price')

    if (productsError) {
        throw new Error("Erro ao buscar produtos.")
    }

    const productCostMap = new Map(products.map(p => [p.id, p.cost_price || 0]))

    // 3. Calculate new totals
    let totalSales = 0
    let totalCost = 0

    deliveryData.forEach(client => {
        client.products.forEach(p => {
            const cost = productCostMap.get(p.id) || 0
            totalSales += p.quantity * p.price
            totalCost += p.quantity * cost
        })
    })

    // 4. Update 'deliveries' table
    const { error: updateError } = await supabase
        .from('deliveries')
        .update({
            total_sales: totalSales,
            total_cost: totalCost
        })
        .eq('id', id)

    if (updateError) {
        console.error("Error updating delivery:", updateError)
        throw new Error("Erro ao atualizar entrega.")
    }

    // 5. Delete existing items
    const { error: deleteError } = await supabase
        .from('delivery_items')
        .delete()
        .eq('delivery_id', id)

    if (deleteError) {
        console.error("Error deleting old items:", deleteError)
        throw new Error("Erro ao atualizar itens da entrega.")
    }

    // 6. Insert new items
    const itemsToInsert = []

    for (const client of deliveryData) {
        for (const product of client.products) {
            itemsToInsert.push({
                delivery_id: id,
                client_id: client.clientId,
                product_id: product.id,
                quantity: product.quantity,
                unit_price: product.price,
                unit_cost: productCostMap.get(product.id) || 0
            })
        }
    }

    if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
            .from('delivery_items')
            .insert(itemsToInsert)

        if (itemsError) {
            console.error("Error creating delivery items:", itemsError)
            throw new Error("Erro ao salvar itens da entrega.")
        }
    }

    revalidatePath('/')
    revalidatePath('/entrega')
}

export async function deleteDeliveryAction(id: string | number) {
    const supabase = await createClient()

    // Delete the delivery (cascade should handle items, but if not set, we might need to delete items first)
    // Assuming cascade is ON for delivery_items.delivery_id foreign key.
    // If not, we should delete items first. Safe to assume or check?
    // Let's safe delete items first just in case.

    const { error: itemsError } = await supabase
        .from('delivery_items')
        .delete()
        .eq('delivery_id', id)

    if (itemsError) {
        console.error("Error deleting items:", itemsError)
        throw new Error("Erro ao excluir itens.")
    }

    const { error: deliveryError } = await supabase
        .from('deliveries')
        .delete()
        .eq('id', id)

    if (deliveryError) {
        console.error("Error deleting delivery:", deliveryError)
        throw new Error("Erro ao excluir entrega.")
    }

    revalidatePath('/')
    revalidatePath('/entrega')
}
