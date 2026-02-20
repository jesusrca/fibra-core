import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { notFound } from 'next/navigation'
import { ProveedorDetalleClient } from '@/components/proveedores/proveedor-detalle-client'

export const dynamic = 'force-dynamic'

interface ProveedorDetallePageProps {
    params: {
        id: string
    }
}

export default async function ProveedorDetallePage({ params }: ProveedorDetallePageProps) {
    await requireModuleAccess('proveedores')

    const supplier = await withPrismaRetry(() =>
        prisma.supplier.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                name: true,
                category: true,
                city: true,
                country: true,
                rating: true,
                contactName: true
            }
        })
    )

    if (!supplier) notFound()

    const works = await withPrismaRetry(() =>
        prisma.supplierWork.findMany({
            where: {
                OR: [
                    { supplierId: supplier.id },
                    { supplierName: { equals: supplier.name, mode: 'insensitive' } }
                ]
            },
            include: {
                project: {
                    select: { id: true, name: true, status: true }
                },
                payments: {
                    orderBy: [{ paymentDate: 'desc' }, { issueDate: 'desc' }]
                }
            },
            orderBy: { createdAt: 'desc' }
        })
    )

    const paymentRows = works.flatMap((work) =>
        work.payments.map((payment) => ({
            id: payment.id,
            issueDate: payment.issueDate,
            paymentDate: payment.paymentDate,
            amount: payment.amount,
            status: payment.status,
            description: payment.description,
            receiptUrl: payment.receiptUrl,
            project: work.project,
            serviceProvided: work.serviceProvided,
            installmentsCount: work.installmentsCount,
            totalBudget: work.totalBudget
        }))
    )

    return (
        <ProveedorDetalleClient
            supplier={supplier}
            paymentRows={paymentRows}
        />
    )
}
