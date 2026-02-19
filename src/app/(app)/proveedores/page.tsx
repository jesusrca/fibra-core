import { ProveedoresClient } from '@/components/proveedores/proveedores-client'
import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { unstable_cache } from 'next/cache'
import { withPrismaRetry } from '@/lib/prisma-retry'

export const dynamic = 'force-dynamic'

const getProveedoresData = unstable_cache(
    async () =>
        withPrismaRetry(() =>
            prisma.supplier.findMany({
                orderBy: { name: 'asc' }
            })
        ),
    ['proveedores-data-v1'],
    { revalidate: 20 }
)

export default async function ProveedoresPage() {
    await requireModuleAccess('proveedores')
    const suppliers = await getProveedoresData()

    return <ProveedoresClient initialSuppliers={suppliers} />
}
