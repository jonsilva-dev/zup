'use client'

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

const productFormSchema = z.object({
    name: z.string().min(2, "Nome é obrigatório"),
    code: z.string().optional(),
    unit: z.enum(["KG", "UN"]),
    cost_price: z.coerce.number().min(0, "Preço deve ser positivo"),
    ncm: z.string().optional(),
    csosn_cst: z.string().optional(),
    cfop: z.string().optional(),
    icms_base: z.coerce.number().optional(),
    icms_value: z.coerce.number().optional(),
    ipi_value: z.coerce.number().optional(),
    icms_rate: z.coerce.number().optional(),
    ipi_rate: z.coerce.number().optional(),
})

type ProductFormValues = z.infer<typeof productFormSchema>


import { createProduct } from '../create-action'
import { useState, useTransition } from 'react'

import { ArrowLeft } from "lucide-react"
import { useRouter } from 'next/navigation'

export default function NewProductPage() {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const form = useForm<ProductFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(productFormSchema) as any,
        defaultValues: {
            name: "",
            unit: "UN",
            cost_price: 0,
            code: "",
            ncm: "",
            csosn_cst: "",
            cfop: "",
            icms_base: 0,
            icms_value: 0,
            ipi_value: 0,
            icms_rate: 0,
            ipi_rate: 0,
        },
    })

    function onSubmit(values: ProductFormValues) {
        startTransition(async () => {
            try {
                await createProduct(values)
            } catch (error) {
                console.error(error)
            }
        })
    }
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">Novo Produto</h1>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <Card>
                        <CardContent className="space-y-4 pt-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome do Produto *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nome" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex gap-4">
                                <FormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem className="w-48">
                                            <FormLabel>Código</FormLabel>
                                            <FormControl>
                                                <Input placeholder="000" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="unit"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Unidade *</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Selecione" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="KG">KG</SelectItem>
                                                    <SelectItem value="UN">Unidade</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="cost_price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Preço de Custo (R$)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="ncm"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>NCM / SH</FormLabel>
                                            <FormControl>
                                                <Input placeholder="" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="csosn_cst"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CSOSN / CST</FormLabel>
                                            <FormControl>
                                                <Input placeholder="" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="cfop"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CFOP</FormLabel>
                                            <FormControl>
                                                <Input placeholder="" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="icms_base"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Base Calc. ICMS</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="icms_value"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valor ICMS</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="ipi_value"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valor IPI</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="icms_rate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Aliq. ICMS (%)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="ipi_rate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Aliq. IPI (%)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? 'Salvando...' : 'Salvar Produto'}
                    </Button>
                </form>
            </Form>
        </div>
    )
}
