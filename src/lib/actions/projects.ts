'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getProjects() {
    try {
        const projects = await prisma.project.findMany({
            include: {
                client: true,
                director: true,
                milestones: {
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        })
        return projects
    } catch (error) {
        console.error('Error fetching projects:', error)
        return []
    }
}

export async function createProject(data: {
    name: string
    clientId: string
    directorId: string
    status: any
    budget: number
    serviceType: string
    priority: any
    deadline?: Date
    startDate?: Date
}) {
    try {
        const project = await prisma.project.create({
            data: {
                ...data,
                startDate: data.startDate || new Date(),
            },
        })
        revalidatePath('/proyectos')
        return { success: true, project }
    } catch (error) {
        console.error('Error creating project:', error)
        return { success: false, error: 'Error al crear el proyecto' }
    }
}

export async function updateProjectStatus(projectId: string, status: any) {
    try {
        await prisma.project.update({
            where: { id: projectId },
            data: { status },
        })
        revalidatePath('/proyectos')
        return { success: true }
    } catch (error) {
        console.error('Error updating project status:', error)
        return { success: false }
    }
}

export async function getClients() {
    try {
        return await prisma.client.findMany({
            orderBy: { name: 'asc' },
        })
    } catch (error) {
        return []
    }
}

export async function getUsers() {
    try {
        return await prisma.user.findMany({
            orderBy: { name: 'asc' },
        })
    } catch (error) {
        return []
    }
}
