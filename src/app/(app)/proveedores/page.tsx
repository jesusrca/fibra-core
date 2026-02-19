import { getSuppliers } from '@/lib/actions/suppliers'
import { ProveedoresClient } from '@/components/proveedores/proveedores-client'

export const dynamic = 'force-dynamic'

export default async function ProveedoresPage() {
    const suppliers = await getSuppliers()

    return <ProveedoresClient initialSuppliers={suppliers} />
}
