# Implementación pendiente

## Crítico (bloquea producción)

1. [~] Seguridad de autenticación incompleta: login solo por email (sin password/OTP).
   Estado: Implementado login con contraseña (`passwordHash` + verificación). OTP aún pendiente.
   Archivo relacionado: `src/lib/auth.ts`
2. [] Secretos expuestos o sensibles en entorno local: rotar credenciales y llaves.
   Archivos relacionados: `.env`, `.env.local`
3. [~] Endurecer autorización backend: aplicar validación de usuario/rol en todas las server actions y APIs.
   Estado: Aplicado en acciones críticas (`users`, `projects`, `crm`, `accounting`, `finance`, `suppliers`). Falta auditoría completa de APIs no cubiertas.
   Archivos relacionados:
   - `src/lib/actions/users.ts`
   - `src/lib/actions/projects.ts`
   - `src/lib/actions/crm.ts`
   - `src/lib/actions/accounting.ts`
   - `src/lib/actions/finance.ts`
   - `src/lib/actions/suppliers.ts`
4. [~] Robustez de conexión a BD: estrategia global de retry/errores para evitar caídas por pool.
   Estado: Implementado retry y mejoras en módulos principales; falta estandarizar en todo acceso a DB del proyecto.
   Archivos relacionados:
   - `src/app/(app)/dashboard/page.tsx`
   - `src/app/(app)/comercial/page.tsx`

## Alto (funcionalidad incompleta)

1. [x] Eliminar data mock en módulos productivos:
   - `src/app/(app)/configuracion/page.tsx` (usa `mockUsers`)
   - `src/app/(app)/marketing/page.tsx` (usa `mockCampaigns`, `mockLeads`)
   - `src/app/(app)/dashboard/page.tsx` (fallback con mocks)
   - `src/components/layout/Header.tsx` (notificaciones mock)
2. [x] Implementar sistema real de notificaciones (persistencia + API + UI de lectura).
       Estado: Modelo `Notification`, API (`GET`, `PATCH`, `PATCH [id]/read`) y UI con “marcar como leída/todas”.
3. [ ] Completar reportes end-to-end (generación, historial, descarga, persistencia).
       Archivo principal: `src/app/(app)/reportes/page.tsx`
4. [ ] Endurecer chatbot IA para operaciones de escritura: permisos por rol y auditoría.
       Archivos relacionados:
   - `src/app/api/chat/route.ts`
   - `src/lib/ai/tools.ts`

## Medio (calidad y mantenibilidad)

1. [ ] Reducir uso de `any` y `as any` en frontend/backend.
       Archivos ejemplo:
   - `src/components/projects/project-client.tsx`
   - `src/components/projects/project-detail-client.tsx`
   - `src/app/(app)/comercial/page.tsx`
2. [ ] Agregar tests (unitarios, integración y e2e) para:
   - Login/sesión
   - RBAC
   - CRUD por módulo
   - Chatbot y tools
3. [ ] Añadir observabilidad:
   - logs estructurados
   - métricas de errores/latencia
   - trazabilidad de acciones críticas
4. [ ] Formalizar migraciones/CI:
   - flujo de migraciones Prisma
   - pipeline de build/test/lint en CI

## Funcionalidades

- Filtro por rango de fechas para el dashboard
- Alerta de facturas por cobrar
- Notificación en contabilidad cuando un proyecto alcance el hito para cobrar una cuota
- Deben aparecer notificaciones al costado de cada seccion en el siderbar si hay algo que hacer en cada rubro
- El chatbot debe almacenar la conversación de la sesión y no borrarse al cambiar de página. EL mismo chat que se ve en la pagina /chatbot es el mismo que debe salir en el widget
- Las personas de contacto de un lead, cotización, empresa, etc. Debe buscar de la lista de contactos que existe, y si no hay debe agregarse desde cualquier bloque, todo debe estar relacionado para evitar duplicidad.
- En marketing se debe mostrar la cantidad de seguidores e interacción que se tiene en cada red social
- Debe haber la opcion de vincular el gmail o correo de cada usuario, y poder ver los mails recibidos por cada contacto cuando se vea el perfil del contacto.
- Se debe poder ver los mails recibidos de cada proyecto en base al nombre del proyecto y el asunto del mail. Se debe crear un mail con cada nombre del proyecto para que se reenvien los mails a ese correo y se almacene la información.
- En equipo se debe poner el horario de trabajo de cada miembro, su horario actual segun la zona en que se encuentran, su cumpleaños. En el dashboard debe haber un espacio para indicar de quien es el próximo cumpleaños.

## Integraciones externas pendientes

1. [ ] n8n inbound/outbound real (webhooks + seguridad + trazas).
2. [ ] Telegram bot productivo.
3. [ ] Google Drive (subida/documentos).
4. [ ] Email transaccional productivo.

## Frontend/UX pendiente para “100%”

1. [ ] Estandarizar estados de carga/error en todos los módulos.
2. [ ] Paginación y filtros server-side completos (CRM/proyectos).
3. [ ] Validación consistente con esquemas compartidos (frontend + backend).
4. Agregar opcion de cambio a modo oscuro y claro en moviles

## Criterio de “100% listo”

1. [~] Auth robusta (password/OTP) y sesiones seguras.
2. [~] RBAC aplicado en todas las rutas/acciones.
3. [x] Cero mocks activos en producción (módulos críticos solicitados).
4. [ ] Integraciones externas operativas y probadas.
5. [ ] Tests automáticos + CI + monitoreo.
6. [ ] Secretos rotados y política de seguridad aplicada.
