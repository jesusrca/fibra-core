'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { createNotificationForRoles, createNotificationForUser } from '@/lib/notifications'
import { Role } from '@prisma/client'

export async function getProjects() {
    try {
        await requireModuleAccess('proyectos')
        const projects = await withPrismaRetry(() => prisma.project.findMany({
            include: {
                client: true,
                director: true,
                milestones: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        }))
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
    deadline?: Date
    startDate?: Date
}) {
    try {
        await requireModuleAccess('proyectos')
        const project = await withPrismaRetry(() => prisma.project.create({
            data: {
                name: data.name,
                clientId: data.clientId,
                directorId: data.directorId,
                status: data.status,
                budget: data.budget,
                serviceType: data.serviceType,
                startDate: data.startDate || new Date(),
                // milestonesCount: 0 
            },
        }))
        await createNotificationForRoles({
            roles: [Role.ADMIN, Role.GERENCIA, Role.PROYECTOS],
            type: 'project_update',
            message: `Nuevo proyecto creado: ${project.name}`
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
        await requireModuleAccess('proyectos')
        await withPrismaRetry(() => prisma.project.update({
            where: { id: projectId },
            data: { status },
        }))
        revalidatePath('/proyectos')
        return { success: true }
    } catch (error) {
        console.error('Error updating project status:', error)
        return { success: false }
    }
}

export async function getClients() {
    try {
        await requireModuleAccess('proyectos')
        return await withPrismaRetry(() => prisma.client.findMany({
            orderBy: { name: 'asc' },
        }))
    } catch (error) {
        return []
    }
}

export async function getUsers() {
    try {
        await requireModuleAccess('proyectos')
        return await withPrismaRetry(() => prisma.user.findMany({
            orderBy: { name: 'asc' },
        }))
    } catch (error) {
        return []
    }
}

export async function getProjectById(id: string) {
    try {
        await requireModuleAccess('proyectos')
        const project = await withPrismaRetry(() => prisma.project.findUnique({
            where: { id },
            include: {
                client: true,
                director: true,
                team: true,
                milestones: {
                    orderBy: { dueDate: 'asc' }
                },
                tasks: {
                    include: { assignee: true },
                    orderBy: { createdAt: 'desc' }
                },
                transactions: true,
            }
        }))
        return project
    } catch (error) {
        console.error('Error fetching project:', error)
        return null
    }
}

export async function createMilestone(data: {
    projectId: string
    name: string
    dueDate: Date
    status: string
}) {
    try {
        await requireModuleAccess('proyectos')
        const milestone = await withPrismaRetry(() => prisma.milestone.create({
            data: {
                projectId: data.projectId,
                name: data.name,
                dueDate: data.dueDate,
                status: data.status
            }
        }))
        revalidatePath(`/proyectos/${data.projectId}`)
        return { success: true, milestone }
    } catch (error) {
        console.error('Error creating milestone:', error)
        return { success: false, error: 'Error al crear el hito' }
    }
}

export async function updateMilestoneStatus(id: string, status: string, projectId: string) {
    try {
        await requireModuleAccess('proyectos')
        await withPrismaRetry(() => prisma.milestone.update({
            where: { id },
            data: { status }
        }))
        revalidatePath(`/proyectos/${projectId}`)
        return { success: true }
    } catch (error) {
        console.error('Error updating milestone:', error)
        return { success: false, error: 'Error al actualizar el hito' }
    }
}

export async function createTask(data: {
    projectId: string
    title: string
    description?: string
    priority: string
    assigneeId?: string
    dueDate?: Date
}) {
    try {
        await requireModuleAccess('proyectos')
        const task = await withPrismaRetry(() => prisma.task.create({
            data: {
                projectId: data.projectId,
                title: data.title,
                description: data.description,
                priority: data.priority,
                assigneeId: data.assigneeId,
                dueDate: data.dueDate,
                status: 'TODO'
            }
        }))
        if (data.assigneeId) {
            await createNotificationForUser({
                userId: data.assigneeId,
                type: 'task_due',
                message: `Nueva tarea asignada: ${task.title}`
            })
        }
        revalidatePath(`/proyectos/${data.projectId}`)
        return { success: true, task }
    } catch (error) {
        console.error('Error creating task:', error)
        return { success: false, error: 'Error al crear la tarea' }
    }
}

export async function updateTaskStatus(id: string, status: string, projectId: string) {
    try {
        await requireModuleAccess('proyectos')
        await withPrismaRetry(() => prisma.task.update({
            where: { id },
            data: { status }
        }))
        revalidatePath(`/proyectos/${projectId}`)
        return { success: true }
    } catch (error) {
        console.error('Error updating task:', error)
        return { success: false, error: 'Error al actualizar la tarea' }
    }
}
