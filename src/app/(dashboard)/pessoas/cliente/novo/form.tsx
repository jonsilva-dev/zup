'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft } from "lucide-react"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClientAction } from '@/app/(dashboard)/pessoas/cliente/novo/actions'

// Schema for Step 1
const clientFormSchemaStep1 = z.object({
    type: z.enum(["PF", "PJ"]),
    name: z.string().min(2, "Nome é obrigatório"),
    razao_social: z.string().optional(),
    document: z.string().min(1, "CPF/CNPJ é obrigatório"),
    ie: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
    whatsapp: z.string().optional(),
    address_zip: z.string().optional(),
    address_street: z.string().optional(),
    address_number: z.string().optional(),
    address_district: z.string().optional(),
    address_city: z.string().optional(),
    address_state: z.string().optional(),
    due_day: z.string().optional(),
})

interface Product {
    id: string
    name: string
    unit: string
    price: number
}

export function NewClientForm({ products }: { products: Product[] }) {
    const [step, setStep] = useState(1)
    const router = useRouter()

    // Form definition
    const form = useForm<z.infer<typeof clientFormSchemaStep1>>({
        resolver: zodResolver(clientFormSchemaStep1),
        defaultValues: {
            type: "PF",
            name: "",
            document: "",
            due_day: "",
        },
    })

    // State for Step 2 data
    const [selectedProducts, setSelectedProducts] = useState<string[]>([])
    const [productPrices, setProductPrices] = useState<Record<string, number>>({})
    const [deliverySchedule, setDeliverySchedule] = useState<Record<string, Record<string, number>>>({}) // day -> product -> qty

    const daysOfWeek = [
        { id: '1', label: 'Segunda' },
        { id: '2', label: 'Terça' },
        { id: '3', label: 'Quarta' },
        { id: '4', label: 'Quinta' },
        { id: '5', label: 'Sexta' },
        { id: '6', label: 'Sábado' },
        { id: '0', label: 'Domingo' },
    ]

    function onSubmitStep1(values: z.infer<typeof clientFormSchemaStep1>) {
        console.log("Step 1 values:", values)
        setStep(2)
    }

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function onSubmitFinal() {
        if (isSubmitting) return
        setIsSubmitting(true)
        setError(null)

        try {
            // Combine all data and submit
            const data = {
                ...form.getValues(),
                products: selectedProducts.map(pid => ({
                    id: pid,
                    price: productPrices[pid] || products.find(p => p.id === pid)?.price || 0
                })),
                schedule: deliverySchedule
            }

            console.log("Final Data:", data)
            await createClientAction(data)
            // Redirect happens in action, so we don't need to do anything else here
            // But we can keep the loading state true until unmount
        } catch (err) {
            console.error("Failed to create client:", err)
            setError(err instanceof Error ? err.message : "Erro ao criar cliente. Tente novamente.")
            setIsSubmitting(false)
        }
    }

    const toggleProduct = (productId: string) => {
        setSelectedProducts(prev =>
            prev.includes(productId)
                ? prev.filter(p => p !== productId)
                : [...prev, productId]
        )
    }

    return (
        <div className="pb-24 space-y-6">
            <div className="flex flex-col gap-4">
                <div>
                    {step === 1 ? (
                        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 -ml-2 text-muted-foreground hover:text-foreground" asChild>
                            <Link href="/pessoas">
                                <ArrowLeft className="size-6" strokeWidth={1.5} />
                            </Link>
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => setStep(1)}>
                            <ArrowLeft className="size-6" strokeWidth={1.5} />
                        </Button>
                    )}
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Novo Cliente</h1>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm font-medium">
                    {error}
                </div>
            )}

            {step === 1 && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmitStep1)} className="space-y-4">
                        <Card>
                            <CardHeader><CardTitle>Informações Básicas</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Pessoa *</FormLabel>
                                            <FormControl>
                                                <Tabs
                                                    onValueChange={(val: string) => field.onChange(val as "PF" | "PJ")}
                                                    value={field.value}
                                                    className="w-full"
                                                >
                                                    <TabsList className="grid w-full grid-cols-2">
                                                        <TabsTrigger value="PF">Pessoa Física</TabsTrigger>
                                                        <TabsTrigger value="PJ">Pessoa Jurídica</TabsTrigger>
                                                    </TabsList>
                                                </Tabs>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome Completo *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome do cliente" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {form.watch("type") === "PJ" && (
                                    <FormField
                                        control={form.control}
                                        name="razao_social"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Razão Social *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Razão Social" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                <FormField
                                    control={form.control}
                                    name="document"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CPF/CNPJ *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Documento"
                                                    {...field}
                                                    onChange={(e) => {
                                                        let value = e.target.value.replace(/\D/g, '')
                                                        if (form.getValues('type') === 'PF') {
                                                            // CPF formatting
                                                            if (value.length <= 11) {
                                                                value = value.replace(/(\d{3})(\d)/, '$1.$2')
                                                                value = value.replace(/(\d{3})(\d)/, '$1.$2')
                                                                value = value.replace(/(\d{3})(\d{1,2})/, '$1-$2')
                                                            }
                                                        } else {
                                                            // CNPJ formatting
                                                            value = value.replace(/^(\d{2})(\d)/, '$1.$2')
                                                            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                                                            value = value.replace(/\.(\d{3})(\d)/, '.$1/$2')
                                                            value = value.replace(/(\d{4})(\d)/, '$1-$2')
                                                        }
                                                        field.onChange(value)
                                                    }}
                                                    maxLength={form.getValues('type') === 'PF' ? 14 : 18}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email de envio de nota</FormLabel>
                                            <FormControl>
                                                <Input placeholder="email@exemplo.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="whatsapp"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Whatsapp</FormLabel>
                                            <FormControl>
                                                <Input placeholder="(00) 00000-0000" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="due_day"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data de Vencimento</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="10">Dia 10</SelectItem>
                                                    <SelectItem value="15">Dia 15</SelectItem>
                                                    <SelectItem value="20">Dia 20</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="address_zip"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CEP</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="00000-000"
                                                    {...field}
                                                    maxLength={9}
                                                    onChange={(e) => {
                                                        let value = e.target.value.replace(/\D/g, '')
                                                        value = value.replace(/(\d{5})(\d)/, '$1-$2')
                                                        field.onChange(value)
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="address_street"
                                        render={({ field }) => (
                                            <FormItem className="col-span-2">
                                                <FormLabel>Endereço</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Rua, Av..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="address_number"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Número</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="123" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="address_district"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bairro</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Bairro" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="col-span-2 grid grid-cols-4 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="address_city"
                                            render={({ field }) => (
                                                <FormItem className="col-span-3">
                                                    <FormLabel>Município</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Cidade" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="address_state"
                                            render={({ field }) => (
                                                <FormItem className="col-span-1">
                                                    <FormLabel>UF</FormLabel>
                                                    <FormControl>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-10 w-full">
                                                                    <SelectValue placeholder="UF" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="SP">SP</SelectItem>
                                                                <SelectItem value="RJ">RJ</SelectItem>
                                                                <SelectItem value="MG">MG</SelectItem>
                                                                {/* Add other states */}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end">
                            <Button type="submit" className="w-full">Próximo</Button>
                        </div>
                    </form>
                </Form>
            )}

            {step === 2 && (
                <div className="space-y-6">

                    <Card>
                        <CardHeader>
                            <CardTitle>Produtos Entregues</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!products.length ? <p className="text-sm text-muted-foreground">Nenhum produto cadastrado no sistema.</p> : products.map(product => (
                                <div key={product.id} className="flex items-center space-x-4">
                                    <Checkbox
                                        id={`product-${product.id}`}
                                        checked={selectedProducts.includes(product.id)}
                                        onCheckedChange={() => toggleProduct(product.id)}
                                    />
                                    <div className="flex-1">
                                        <label htmlFor={`product-${product.id}`} className="font-medium cursor-pointer">
                                            {product.name} ({product.unit})
                                        </label>
                                    </div>
                                    {selectedProducts.includes(product.id) && (
                                        <div className="w-24">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="Preço"
                                                defaultValue={product.price}
                                                onChange={(e) => setProductPrices(prev => ({ ...prev, [product.id]: parseFloat(e.target.value) }))}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle>Programação de Entrega</CardTitle>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setDeliverySchedule({})}
                            >
                                Limpar
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {daysOfWeek.map(day => {
                                const isDayEnabled = !!deliverySchedule[day.id]

                                return (
                                    <div key={day.id} className="border-b pb-4 last:border-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium">{day.label}</span>
                                            <Switch
                                                checked={isDayEnabled}
                                                onCheckedChange={(checked) => {
                                                    setDeliverySchedule(prev => {
                                                        const newState = { ...prev }
                                                        if (checked) {
                                                            newState[day.id] = {} // Initialize day
                                                        } else {
                                                            delete newState[day.id] // Remove day
                                                        }
                                                        return newState
                                                    })
                                                }}
                                            />
                                        </div>
                                        {isDayEnabled && (
                                            <div className="pl-4 space-y-2">
                                                {!selectedProducts.length && <p className="text-xs text-muted-foreground">Selecione produtos acima para definir quantidades.</p>}
                                                {selectedProducts.map(pid => {
                                                    const product = products.find(p => p.id === pid)
                                                    return (
                                                        <div key={pid} className="flex items-center justify-between text-sm">
                                                            <span>{product?.name}</span>
                                                            <Input
                                                                className="w-24 h-8"
                                                                type="number"
                                                                placeholder="Qtd"
                                                                min="0"
                                                                value={deliverySchedule[day.id]?.[pid] || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value
                                                                    const qty = val === '' ? 0 : parseFloat(val)
                                                                    setDeliverySchedule(prev => ({
                                                                        ...prev,
                                                                        [day.id]: {
                                                                            ...(prev[day.id] || {}),
                                                                            [pid]: qty
                                                                        }
                                                                    }))
                                                                }}
                                                            />
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>

                    <div className="flex justify-between">
                        <Button onClick={onSubmitFinal} className="w-full">Finalizar Cadastro</Button>
                    </div>
                </div>
            )
            }
        </div >
    )
}
