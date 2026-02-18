import { PrismaClient, Role, LeadStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Start seeding...')

    // 1. Create a Default Admin User if not exists
    const admin = await prisma.user.upsert({
        where: { email: 'admin@fibra.studio' },
        update: {},
        create: {
            email: 'admin@fibra.studio',
            name: 'Admin Fibra',
            role: Role.ADMIN,
        },
    })

    // 2. Create a default Client
    const client = await prisma.client.upsert({
        where: { id: 'seed-client-1' },
        update: {},
        create: {
            id: 'seed-client-1',
            name: 'Nexo Corp',
            country: 'Perú',
            industry: 'Tecnología',
        },
    })

    // 3. Create Leads from Mock Data
    const leads = [
        {
            companyName: 'Horizon Creative',
            serviceRequested: 'Rediseño de Marca',
            requirementDetail: 'Necesitan un refrescamiento de identidad visual completa y manual de marca.',
            estimatedValue: 4500,
            status: LeadStatus.NEW,
        },
        {
            companyName: 'Lumina Tech',
            serviceRequested: 'Diseño Web UI/UX',
            requirementDetail: 'Landing page para nuevo producto de software.',
            estimatedValue: 3200,
            status: LeadStatus.CONTACTED,
        },
        {
            companyName: 'Green Soul',
            serviceRequested: 'Campaña Social Media',
            requirementDetail: 'Gestión de contenidos y pauta por 3 meses.',
            estimatedValue: 1800,
            status: LeadStatus.QUALIFIED,
        }
    ]

    for (const leadData of leads) {
        await prisma.lead.create({
            data: leadData,
        })
    }

    // 4. Create Projects
    const project1 = await prisma.project.upsert({
        where: { id: 'seed-project-1' },
        update: {},
        create: {
            id: 'seed-project-1',
            name: 'Identidad Visual Nexo',
            clientId: client.id,
            directorId: admin.id,
            status: 'ACTIVE',
            budget: 5000,
            serviceType: 'Branding',
            startDate: new Date(),
        },
    })

    // 5. Create Milestones
    const milestones = [
        { name: 'Investigación y Moodboard', status: 'COMPLETED', projectId: project1.id },
        { name: 'Concepto Creativo', status: 'ACTIVE', projectId: project1.id },
        { name: 'Manual de Marca', status: 'PENDING', projectId: project1.id },
    ]

    for (const m of milestones) {
        await prisma.milestone.create({ data: m })
    }

    console.log('✅ Seeding finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
