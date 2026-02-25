'use client'

import { useState } from "react"
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, Pencil } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"

interface Client {
    id: string
    name: string
    type: string // "PF" | "PJ"
}

interface User {
    id: string
    name: string
    role: string // "admin" | "deliverer"
}

interface PeopleTabsProps {
    clients: Client[]
    users: User[]
}

export function PeopleTabs({ clients, users }: PeopleTabsProps) {
    const [activeTab, setActiveTab] = useState("clients")

    return (
        <div className="space-y-4 pb-32">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Pessoas</h1>
                <Button size="sm" asChild>
                    <Link href={activeTab === "clients" ? "/pessoas/cliente/novo" : "/pessoas/usuario/novo"}>
                        <Plus className="mr-2 h-4 w-4" />
                        {activeTab === "clients" ? "Novo Cliente" : "Novo Usuário"}
                    </Link>
                </Button>
            </div>

            <Tabs defaultValue="clients" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="clients">Clientes</TabsTrigger>
                    <TabsTrigger value="users">Usuários</TabsTrigger>
                </TabsList>

                <TabsContent value="clients" className="space-y-4 mt-4">
                    {clients.length === 0 ? (
                        <EmptyState title="Nenhum cliente cadastrado" />
                    ) : (
                        clients.map((client) => (
                            <Card key={client.id}>
                                <CardContent className="flex items-center justify-between p-4">
                                    <div>
                                        <div className="font-semibold">{client.name}</div>
                                        <Badge variant="secondary" className="mt-1 text-xs font-normal text-muted-foreground bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                                            {client.type === 'PF' ? 'Pessoa física' : 'Pessoa jurídica'}
                                        </Badge>
                                    </div>
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link href={`/pessoas/cliente/${client.id}`}>
                                            <Pencil className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="users" className="space-y-4 mt-4">
                    {users.length === 0 ? (
                        <EmptyState title="Nenhum usuário cadastrado" />
                    ) : (
                        users.map((user) => (
                            <Card key={user.id}>
                                <CardContent className="flex items-center justify-between p-4">
                                    <div>
                                        <div className="font-semibold">{user.name}</div>
                                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="mt-1 text-xs">
                                            {user.role === 'admin' ? 'Administrador' : 'Entregador'}
                                        </Badge>
                                    </div>
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link href={`/pessoas/usuario/${user.id}`}>
                                            <Pencil className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
