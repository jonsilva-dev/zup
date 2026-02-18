
import { DashboardContent } from './content'

import { getCurrentUser } from './actions'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getCurrentUser()

    return <DashboardContent user={user}>{children}</DashboardContent>
}
