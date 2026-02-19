# Implementación pendiente

## Crítico (bloquea producción)

1. [~] Seguridad de autenticación incompleta: login solo por email (sin password/OTP).
   Estado: Implementado login con contraseña (`passwordHash` + verificación). OTP aún pendiente.
   Archivo relacionado: `src/lib/auth.ts`
   Archivos relacionados: `.env`, `.env.local`
2. [~] Endurecer autorización backend: aplicar validación de usuario/rol en todas las server actions y APIs.
   Estado: Aplicado en acciones críticas (`users`, `projects`, `crm`, `accounting`, `finance`, `suppliers`). Falta auditoría completa de APIs no cubiertas.
   Archivos relacionados:
   - `src/lib/actions/users.ts`
   - `src/lib/actions/projects.ts`
   - `src/lib/actions/crm.ts`
   - `src/lib/actions/accounting.ts`
   - `src/lib/actions/finance.ts`
   - `src/lib/actions/suppliers.ts`
3. [~] Robustez de conexión a BD: estrategia global de retry/errores para evitar caídas por pool.
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
3. [x] Completar reportes end-to-end (generación, historial, descarga, persistencia).
       Estado: Implementado flujo real con persistencia, historial y descarga por usuario.
       Archivo principal: `src/app/(app)/reportes/page.tsx`
4. [x] Endurecer chatbot IA para operaciones de escritura: permisos por rol y auditoría.
       Estado: Implementado en tools de escritura y auditoría en `ToolAuditLog`.
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

## Brechas detectadas vs `datos-necesario.md`

### Frontend pendiente

1. [x] CRM: crear formularios propios para `Contacto` y `Empresa` (hoy el botón "Nuevo" en tabs usa flujo de lead).
   Archivos relacionados:
   - `src/components/crm/comercial-client.tsx`
   - `src/components/crm/lead-form.tsx`
2. [x] Implementar módulo UI de Cotizaciones (crear/listar/editar/estados).
   Estado: Implementado crear/listar/editar y actualización de estado.
3. [~] Implementar módulo UI de Facturas (emitidas/pagadas/por emitir, por cliente/proyecto).
   Estado: Implementado crear/listar/editar y actualización de estado + proyección de “por emitir” por hitos en proyecto. Falta “por emitir” automático end-to-end.
4. [x] Alinear fechas de proyecto en UI (`endDate`/fecha fin) para no depender de campo ambiguo `deadline`.
   Archivos relacionados:
   - `src/components/projects/project-form.tsx`
   - `src/lib/actions/projects.ts`
5. [x] Equipo: exponer y editar campos faltantes (teléfono, país, cumpleaños, horario, huso horario).
   Archivo relacionado: `src/components/equipo/equipo-client.tsx`
6. [x] Contabilidad: ampliar formulario con moneda, banco, factura relacionada y comprobante.
   Archivo relacionado: `src/components/contabilidad/contabilidad-client.tsx`
7. [x] Proyecto-Proveedores: UI para presupuesto por proyecto con proveedor, cuotas y recibos/facturas de pago.
   Archivos relacionados:
   - `src/components/projects/project-detail-client.tsx`
   - `src/components/proveedores/proveedores-client.tsx`

### Backend pendiente

1. [~] CRUD formal para `Client` y `Contact` (hoy creación es parcial/indirecta en lead/chatbot).
   Estado: Implementado create/update para cliente y contacto + deduplicación. Falta cerrar CRUD completo (delete/listado/API formal).
   Archivos relacionados:
   - `src/lib/actions/crm.ts`
   - `src/lib/ai/tools.ts`
2. [~] Implementar acciones/API para `Quote` y `Invoice` con reglas de negocio completas.
   Estado: Implementadas acciones de creación y cambio de estado con UI conectada. Falta completar reglas avanzadas de facturación por cuota/hito.
   Archivo base: `prisma/schema.prisma`
3. [~] Implementar lógica de "facturas por emitir" por hitos/cuotas de proyecto (no solo facturas registradas).
   Estado: Implementada notificación al completar hitos para habilitar cobranza. Falta generación/pipeline automático de “por emitir”.
4. [ ] Definir contacto principal de empresa de forma explícita (`mainContactId` o `isPrimary`) y su flujo.
5. [~] Validaciones anti-duplicidad consistentes (cliente/contacto/lead) para evitar registros repetidos.
   Estado: Cubierto en create/update de cliente/contacto y en creación de leads. Falta estandarizar en todos los módulos y casos borde.
6. [ ] Completar flujo UI+backend de actividades/notas del lead (`Activity`: llamada, mail, reunión, chat).

### No necesario / evitar duplicación

1. [x] No guardar "proyectos activos/cerrados" como campo fijo en cliente: se calcula por `Project.status`.
2. [x] No guardar "facturas emitidas/pagadas/por emitir" como campos fijos en cliente/proyecto: se calcula por agregados.
3. [x] No guardar "número de hitos" manual si ya existe relación `Milestone`: debe derivarse por conteo.
4. [x] Evitar duplicar presupuesto entre lead y cotización final: lead = estimado inicial, quote = valor formal.
5. [x] Remover duplicados funcionales del documento (por ejemplo "Tareas" repetido en proyecto).

## Funcionalidades

- [x] Filtro por rango de fechas para el dashboard.
- [x] Alerta de facturas por cobrar.
- [x] Notificación en contabilidad cuando un proyecto alcance el hito para cobrar una cuota.
- [x] Notificaciones al costado de cada sección en el sidebar cuando hay pendientes.
- [x] El chatbot mantiene la conversación de la sesión entre `/chatbot` y el widget.
- [~] Relación de contactos en lead/cotización/empresa evitando duplicidad.
  Estado: Implementado en flujo de lead (selección de contacto existente + creación si no existe). Falta completar el mismo patrón en todos los bloques.
- [ ] En marketing mostrar cantidad de seguidores e interacción por red social.
- [ ] Vincular Gmail/correo por usuario y ver mails recibidos por contacto.
- [ ] Ver mails por proyecto (buzón por proyecto con reenvío y almacenamiento).
- [ ] Equipo: horario de trabajo, zona horaria actual, cumpleaños y próximo cumpleaños en dashboard.
- [~] Espacio para deudas por pagar y por cobrar.
  Estado: Implementado “por cobrar” con alertas de vencimiento. Falta “por pagar”.
- [~] Espacio para facturas emitidas/pendientes/por emitir por proyecto y por hito.
  Estado: Implementado emitidas/pendientes con estados y alertas. Falta “por emitir” automático por hito/cuota y proyección de siguiente factura.
- [~] El bot debe ingresar contactos, empresas, leads y proyectos con datos básicos.
  Estado: Implementado para contactos/empresas/leads. Falta creación de proyectos vía bot.
- [ ] Notificaciones por contactos/proyectos con datos faltantes.

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
