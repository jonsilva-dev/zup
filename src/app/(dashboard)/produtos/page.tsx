import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Plus, Pencil } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"



import { createClient } from "@/utils/supabase/server"

export default async function ProdutosPage() {
    console.log('Rendering ProdutosPage')
    const supabase = await createClient()
    console.log('Fetching products...')
    const { data: products, error } = await supabase.from('products').select('*')

    if (error) {
        console.error('Error fetching products:', error)
        throw error
    }

    console.log('Products fetched:', products?.length)

    return (
        <div className="space-y-4 pb-32">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
                <Link href="/produtos/novo">
                    <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Produto
                    </Button>
                </Link>
            </div>

            {!products?.length ? (
                <EmptyState title="Nenhum produto cadastrado" />
            ) : (
                <div className="space-y-4">
                    {products.map((product) => (
                        <Card key={product.id}>
                            <CardContent className="flex items-center justify-between p-4">
                                <div>
                                    <div className="font-semibold">{product.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                        Código: {product.code} | {product.unit}
                                    </div>
                                </div>
                                <Link href={`/produtos/${product.id}`}>
                                    <Button variant="ghost" size="icon">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
