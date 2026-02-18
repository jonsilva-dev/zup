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
import { useState } from 'react'
import { ArrowLeft } from "lucide-react"
import Link from 'next/link'
import { createUserAction, updateUserAction, deleteUserAction } from '@/app/(dashboard)/pessoas/actions'
import { DeleteConfirmationDrawer } from './delete-confirmation-drawer'
import { useRouter } from 'next/navigation'
import { toast } from "sonner"

const userFormSchema = z.object({
    name: z.string().min(2, "Nome é obrigatório"),
    email: z.string().email("Email inválido"),
    role: z.enum(["admin", "deliverer"]),
    password: z.string().optional(),
})

interface UserFormProps {
    initialData?: {
        id?: string
        name: string
        email: string
        role: "admin" | "deliverer"
    }
    mode: 'create' | 'edit' | 'view'
    canEditRole?: boolean
    canEditPassword?: boolean
    canDelete?: boolean
}

export function UserForm({ initialData, mode, canEditRole = false, canEditPassword = false, canDelete = false }: UserFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const form = useForm<z.infer<typeof userFormSchema>>({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            email: initialData?.email || "",
            role: initialData?.role || "deliverer",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof userFormSchema>) {
        if (isSubmitting) return
        setIsSubmitting(true)
        setError(null)

        try {
            if (mode === 'create') {
                if (!values.password) {
                    form.setError('password', { message: "Senha é obrigatória para novos usuários" })
                    setIsSubmitting(false)
                    return
                }
                const result = await createUserAction({ ...values, password: values.password })
                toast.success("Usuário criado com sucesso!")
                // Force client-side redirect if server action redirect doesn't happen immediately
                router.push('/pessoas?tab=usuarios')
                router.refresh()
            } else {
                if (!initialData?.id) throw new Error("ID not found for update")
                await updateUserAction({
                    id: initialData.id,
                    ...values,
                    password: values.password || undefined // Only send if present
                })
                toast.success("Usuário atualizado com sucesso!")
                router.refresh()
                setIsSubmitting(false)
            }
        } catch (err: any) {
            console.error("Failed to save user:", err)
            const errorMessage = err.message || "Erro ao salvar usuário."
            setError(errorMessage)
            toast.error(errorMessage)
            setIsSubmitting(false)
        }
    }

    async function handleDelete() {
        if (isDeleting || !initialData?.id) return
        setIsDeleting(true)
        try {
            await deleteUserAction(initialData.id)
            toast.success("Usuário excluído com sucesso!")
            router.push('/pessoas?tab=usuarios')
            router.refresh()
        } catch (err: any) {
            console.error("Failed to delete user:", err)
            const errorMessage = err.message || "Erro ao excluir usuário."
            setError(errorMessage)
            toast.error(errorMessage)
            setIsDeleting(false)
        }
    }

    const isReadOnly = mode === 'view'

    return (
        <div className="pb-24 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/pessoas?tab=usuarios">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {mode === 'create' ? 'Novo Usuário' : 'Detalhes do Usuário'}
                    </h1>
                </div>
                {mode === 'edit' && canDelete && (
                    <DeleteConfirmationDrawer
                        onConfirm={handleDelete}
                        isPending={isDeleting}
                        title="Excluir Usuário"
                        description="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
                    />
                )}
            </div>

            {error && (
                <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm font-medium">
                    {error}
                </div>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <Card>
                        <CardContent className="space-y-4 pt-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nome completo" {...field} disabled={isReadOnly} />
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
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="email@exemplo.com" {...field} disabled={isReadOnly} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Usuário</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            disabled={isReadOnly || (mode === 'edit' && !canEditRole)}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="admin">Administrador</SelectItem>
                                                <SelectItem value="deliverer">Entregador</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {(mode === 'create' || (mode === 'edit' && canEditPassword)) && (
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {mode === 'create' ? 'Senha Provisória' : 'Nova Senha (opcional)'}
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder={mode === 'create' ? "******" : "Deixe em branco para manter"} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </CardContent>
                    </Card>

                    {!isReadOnly && (
                        <div className="flex gap-4">
                            <Button type="submit" className="flex-1" disabled={isSubmitting}>
                                {isSubmitting ? "Salvando..." : (mode === 'create' ? "Criar Usuário" : "Salvar Alterações")}
                            </Button>

                        </div>
                    )}
                </form>
            </Form>
        </div>
    )
}
