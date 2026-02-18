'use client'

import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Trash2 } from "lucide-react"
import { useState } from "react"

interface DeleteConfirmationDrawerProps {
    onConfirm: () => void
    isPending: boolean
    title?: string
    description?: string
    trigger?: React.ReactNode
}

export function DeleteConfirmationDrawer({
    onConfirm,
    isPending,
    title = "Excluir Produto",
    description = "Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.",
    trigger
}: DeleteConfirmationDrawerProps) {
    const [open, setOpen] = useState(false)

    // Handle external control if needed, but for now internal state is fine.
    // However, if onConfirm is async, we might want to keep it open until pending is done?
    // The parent controls 'isPending'.
    // If isPending is true, we should probably keep it open?
    // But the drawer receives 'open' from state.

    // When onConfirm is called, we call onConfirm() then setOpen(false).
    // If onConfirm triggers a router.push (like deletion), closing immediately is fine.

    return (
        <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>

            <DrawerTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="destructive" size="icon" disabled={isPending}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </DrawerTrigger>
            <DrawerContent>
                <div className="mx-auto w-full max-w-sm">
                    <DrawerHeader>
                        <DrawerTitle>{title}</DrawerTitle>
                        <DrawerDescription>{description}</DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter className="pb-12">
                        <Button
                            variant="destructive"
                            onClick={() => {
                                onConfirm()
                                setOpen(false)
                            }}
                            disabled={isPending}
                        >
                            {isPending ? "Excluindo..." : "Sim, excluir"}
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline">Cancelar</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    )
}
