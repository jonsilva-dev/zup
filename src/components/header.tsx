import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/app/logout/actions"

interface HeaderProps {
    userName?: string | null
}

export function Header({ userName }: HeaderProps) {
    const getInitials = (name: string) => {
        if (!name) return "U"
        // If email (contains @), take first chat
        if (name.includes('@')) return name.charAt(0).toUpperCase()

        const parts = name.trim().split(' ')
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
    }

    const userInitials = getInitials(userName || "Usuário")

    return (
        <header className="flex items-center justify-between px-6 py-4 bg-neutral-200 text-neutral-900">
            <div className="font-bold text-xl tracking-tight">ZUP</div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Avatar className="cursor-pointer">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-neutral-900 text-neutral-50">{userInitials}</AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Meus dados</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 cursor-pointer"
                        onSelect={async () => {
                            await signOut()
                        }}
                    >
                        Sair
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    )
}
