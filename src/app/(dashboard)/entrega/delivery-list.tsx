'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Plus, Trash, Check, Truck, ArrowLeft, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from "@/components/ui/drawer"
import { addClientCustomPrice, saveDeliveryAction, updateDeliveryAction, deleteDeliveryAction } from "./actions"
import { DeleteConfirmationDrawer } from "@/components/delete-confirmation-drawer"
import { Trash2, Calendar } from "lucide-react"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"
import Link from "next/link"

export interface DeliveryProduct {
    id: string
    name: string
    quantity: number
    unit: string
    price: number
}

export interface ClientDelivery {
    clientId: string
    clientName: string
    products: DeliveryProduct[]
}

export interface Product {
    id: string
    name: string
    unit: string
    cost_price: number | null
}

// Add Client Interface
interface Client {
    id: string
    name: string
    // other fields...
}

interface DeliveryListProps {
    initialDeliveries: ClientDelivery[]
    allProducts: Product[]
    allClients: Client[]
    deliveryId?: string | number // Optional: For Edit Mode
    initialDate?: string // Optional: Original date of delivery
}

export function DeliveryList({ initialDeliveries, allProducts, allClients, deliveryId, initialDate }: DeliveryListProps) {

    const [deliveries, setDeliveries] = useState<ClientDelivery[]>(initialDeliveries)
    const [confirmationOpen, setConfirmationOpen] = useState(false)
    const router = useRouter()

    // State for "Add Product"
    const [selectedClientIdForProduct, setSelectedClientIdForProduct] = useState<string | null>(null)
    const [productToAdd, setProductToAdd] = useState<string>("")
    const [addProductOpen, setAddProductOpen] = useState(false)
    const [priceToAdd, setPriceToAdd] = useState<number>(0)
    const [isPriceMissing, setIsPriceMissing] = useState(false)

    const [isSavingPrice, setIsSavingPrice] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)


    // State for "Add Client"
    const [addClientOpen, setAddClientOpen] = useState(false)
    const [clientToAdd, setClientToAdd] = useState<string>("")

    // Helper to get formatted date string
    const today = initialDate
        ? new Date(initialDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
        : new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })


    // Check for changes to show "Save" button
    const hasChanges = JSON.stringify(deliveries) !== JSON.stringify(initialDeliveries)



    const handleQuantityChange = (clientId: string, productId: string, qty: number) => {
        setDeliveries(prev => prev.map(d => {
            if (d.clientId !== clientId) return d
            return {
                ...d,
                products: d.products.map(p => {
                    if (p.id !== productId) return p
                    return { ...p, quantity: qty }
                })
            }
        }))
    }

    const removeProduct = (clientId: string, productId: string) => {
        setDeliveries(prev => prev.map(d => {
            if (d.clientId !== clientId) return d
            return {
                ...d,
                products: d.products.filter(p => p.id !== productId)
            }
        }))
    }

    const removeClient = (clientId: string) => {
        setDeliveries(prev => prev.filter(d => d.clientId !== clientId))
    }

    // Effect to check price when product changes
    const onProductSelect = (productId: string) => {
        setProductToAdd(productId)
        if (!selectedClientIdForProduct) return

        const product = allProducts.find(p => p.id === productId)
        if (!product) return

        // In the relational refactor, if we want to know right here on the client side 
        // if they have a custom price, we would need to pass `client_product_prices` 
        // array for all clients. Since it's an "add extra product" rare flow, 
        // we prompt the user with the base product price, and they can edit it.
        // It will upsert on save.
        setPriceToAdd(product.cost_price || 0)
        setIsPriceMissing(true) // Always prompt to confirm the entered price for extra products
    }

    const handleAddProduct = async () => {
        if (!selectedClientIdForProduct || !productToAdd) return

        const product = allProducts.find(p => p.id === productToAdd)
        if (!product) return

        // If price was missing and user acted, we must save it (as per requirement)
        if (isPriceMissing) {
            setIsSavingPrice(true)
            try {
                await addClientCustomPrice(selectedClientIdForProduct, {
                    id: product.id,
                    price: priceToAdd
                })
            } catch (error) {
                console.error(error)
                alert("Erro ao salvar preço do cliente.")
                setIsSavingPrice(false)
                return
            }
            setIsSavingPrice(false)
        }

        setDeliveries(prev => prev.map(d => {
            if (d.clientId !== selectedClientIdForProduct) return d

            // Check if already exists
            if (d.products.find(p => p.id === product.id)) return d

            return {
                ...d,
                products: [...d.products, {
                    id: product.id,
                    name: product.name,
                    quantity: 1,
                    unit: product.unit,
                    price: priceToAdd
                }]
            }
        }))

        setAddProductOpen(false)
        setProductToAdd("")
        setSelectedClientIdForProduct(null)
        setPriceToAdd(0)
        setIsPriceMissing(false)
    }

    const handleAddClient = () => {
        if (!clientToAdd) return

        const client = allClients.find(c => c.id === clientToAdd)
        if (!client) return

        // Check if already in delivery list
        if (deliveries.find(d => d.clientId === client.id)) {
            setAddClientOpen(false)
            setClientToAdd("")
            return
        }

        setDeliveries(prev => [...prev, {
            clientId: client.id,
            clientName: client.name,
            products: []
        }])

        setAddClientOpen(false)
        setClientToAdd("")
    }

    // Total calculation
    const totalValue = deliveries.reduce((acc, client) => {
        return acc + client.products.reduce((cAcc, p) => cAcc + (p.quantity * p.price), 0)
    }, 0)

    const handleConfirmDelivery = async () => {
        setIsSavingPrice(true)
        try {
            // Transform deliveries to match Input type
            const inputData = deliveries.map(d => ({
                clientId: d.clientId,
                products: d.products.map(p => ({
                    id: p.id,
                    quantity: p.quantity,
                    price: p.price
                }))
            })).filter(d => d.products.length > 0)

            if (inputData.length === 0) {
                toast.error("Não há produtos para salvar.")
                setIsSavingPrice(false)
                return
            }

            if (deliveryId) {
                await updateDeliveryAction(deliveryId, inputData)
                toast.success("Entrega atualizada com sucesso!")
            } else {
                await saveDeliveryAction(inputData)
                toast.success("Entrega confirmada e salva com sucesso!")
            }

            setConfirmationOpen(false)
            router.push('/') // Redirect to home/dashboard
        } catch (error) {
            console.error(error)
            toast.error(deliveryId ? "Erro ao atualizar entrega." : "Erro ao salvar entrega. Tente novamente.")
        } finally {
            setIsSavingPrice(false)
        }
    }

    const handleDeleteDelivery = async () => {
        if (!deliveryId) return
        setIsDeleting(true)
        try {
            await deleteDeliveryAction(deliveryId)
            toast.success("Entrega removida com sucesso!")
            router.push('/')
        } catch (error) {
            console.error(error)
            toast.error("Erro ao remover entrega.")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="pb-32 space-y-6">
            <div className="space-y-4">
                <div className="flex flex-col gap-4">
                    <div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => router.back()}>
                            <ArrowLeft className="size-6" strokeWidth={1.5} />
                        </Button>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{deliveryId ? "Editar Entrega" : "Registro de Entrega"}</h1>
                            <p className="text-sm text-muted-foreground capitalize flex items-center gap-1 mt-1">
                                <Calendar className="h-3 w-3" /> {today}
                            </p>
                        </div>

                        {deliveryId && (
                            <DeleteConfirmationDrawer
                                title="Excluir Entrega"
                                description="Tem certeza que deseja excluir esta entrega permanentemente? Esta ação não pode ser desfeita."
                                onConfirm={handleDeleteDelivery}
                                isPending={isDeleting}
                                trigger={
                                    <Button variant="destructive" size="icon">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                }
                            />
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {deliveries.length === 0 ? (
                    <EmptyState
                        title="Todas as entregas agendadas para hoje já foram realizadas."
                        action={
                            <Button onClick={() => setAddClientOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Adicionar Cliente
                            </Button>
                        }
                    />
                ) : (
                    deliveries.map((delivery) => (
                        <Card key={delivery.clientId} className="overflow-hidden">
                            <div className="bg-muted p-4 border-b flex justify-between items-center">
                                <div className="font-semibold">{delivery.clientName}</div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">{delivery.products.length} itens</Badge>
                                    <DeleteConfirmationDrawer
                                        title="Remover Cliente"
                                        description={`Tem certeza que deseja remover ${delivery.clientName} da entrega de hoje?`}
                                        onConfirm={() => removeClient(delivery.clientId)}
                                        isPending={false}
                                        trigger={
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        }
                                    />
                                </div>
                            </div>
                            <CardContent className="p-4 space-y-4">
                                {delivery.products.map((product) => (
                                    <div key={product.id} className="flex items-center space-x-4">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium">{product.name}</div>
                                            <div className="text-xs text-muted-foreground">{product.unit} - R$ {(product.price || 0).toFixed(2)}</div>
                                        </div>
                                        <div className="w-16">
                                            <Input
                                                type="number"
                                                value={product.quantity}
                                                onChange={(e) => handleQuantityChange(delivery.clientId, product.id, parseFloat(e.target.value))}
                                                className="h-8 text-center"
                                                min="0"
                                            />
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeProduct(delivery.clientId, product.id)}>
                                            <X className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}

                                <div className="flex justify-center pt-2">
                                    <Drawer shouldScaleBackground={false} open={addProductOpen && selectedClientIdForProduct === delivery.clientId} onOpenChange={(open) => {
                                        setAddProductOpen(open)
                                        if (!open) setSelectedClientIdForProduct(null)
                                        else setSelectedClientIdForProduct(delivery.clientId)
                                    }}>
                                        <DrawerTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full h-8 border-dashed text-muted-foreground hover:text-foreground"
                                                onClick={() => {
                                                    setSelectedClientIdForProduct(delivery.clientId)
                                                    setAddProductOpen(true)
                                                }}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </DrawerTrigger>
                                        <DrawerContent>
                                            <div className="mx-auto w-full max-w-sm">
                                                <DrawerHeader>
                                                    <DrawerTitle>Adicionar Produto</DrawerTitle>
                                                </DrawerHeader>
                                                <div className="p-4 space-y-4">
                                                    <Select onValueChange={onProductSelect} value={productToAdd}>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Selecione um produto" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {allProducts.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>
                                                                    {p.name} ({p.unit})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    {isPriceMissing && (
                                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                            <p className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                                                                Este produto não tem preço definido para este cliente. Informe o valor para salvar.
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium w-16">Preço: R$</span>
                                                                <Input
                                                                    type="number"
                                                                    value={priceToAdd}
                                                                    onChange={e => setPriceToAdd(parseFloat(e.target.value))}
                                                                    className="flex-1"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <Button className="w-full" onClick={handleAddProduct} disabled={!productToAdd || isSavingPrice}>
                                                        {isSavingPrice ? "Salvando..." : "Adicionar"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </DrawerContent>
                                    </Drawer>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}

                {deliveries.length > 0 && (
                    <Button variant="outline" className="w-full border-dashed" onClick={() => setAddClientOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Cliente Extra
                    </Button>
                )}

                <Drawer shouldScaleBackground={false} open={addClientOpen} onOpenChange={setAddClientOpen}>
                    <DrawerContent>
                        <div className="mx-auto w-full max-w-sm">
                            <DrawerHeader>
                                <DrawerTitle>Adicionar Cliente</DrawerTitle>
                            </DrawerHeader>
                            <div className="p-4 space-y-4">
                                <Select onValueChange={setClientToAdd} value={clientToAdd}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecione um cliente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allClients
                                            .filter(c => !deliveries.find(d => d.clientId === c.id))
                                            .map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name}
                                                </SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                                <Button className="w-full" onClick={handleAddClient} disabled={!clientToAdd}>
                                    Adicionar
                                </Button>
                            </div>
                        </div>
                    </DrawerContent>
                </Drawer>
            </div>

            {/* Confirmation Sheet / FAB */}
            {/* Confirmation Sheet / FAB - Hide FAB in edit mode unless we want to reuse it? 
                User said "remover o botão de 'Confirmar entrega' flutuante".
                And show "Salvar alterações" button when changes identified.
            */}

            {!deliveryId && deliveries.length > 0 && (
                <Sheet open={confirmationOpen} onOpenChange={setConfirmationOpen}>
                    <SheetTrigger asChild>
                        <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none">
                            <Button
                                className="h-14 px-8 rounded-full shadow-lg bg-black hover:bg-gray-900 text-white pointer-events-auto"
                                size="lg"
                            >
                                <Truck className="mr-2 h-5 w-5 hidden" /> Confirmar Entrega
                            </Button>
                        </div>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-xl px-6 pb-6">
                        <SheetHeader className="pt-4">
                            <SheetTitle>Confirmar Entrega</SheetTitle>
                            <SheetDescription>
                                Resumo das entregas de hoje.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="py-6 space-y-4">
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Total Estimado:</span>
                                <span>R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {deliveries.length} clientes atendidos.
                            </div>
                        </div>
                        <SheetFooter className="pb-4 flex flex-col gap-2 sm:flex-row">
                            <Button className="w-full" size="lg" onClick={handleConfirmDelivery} disabled={isSavingPrice}>
                                {isSavingPrice ? "Salvando..." : "Confirmar e Finalizar"}
                            </Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            )}

            {/* Save Button for Edit Mode (Fixed at bottom) */}
            {deliveryId && hasChanges && (
                <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t p-4 flex justify-center animate-in slide-in-from-bottom-5">
                    <Button
                        size="lg"
                        className="w-full max-w-sm shadow-lg"
                        onClick={handleConfirmDelivery}
                        disabled={isSavingPrice}
                    >
                        {isSavingPrice ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                </div>
            )}
        </div>
    )
}
