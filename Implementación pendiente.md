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

1. [~] Reducir uso de `any` y `as any` en frontend/backend.
   Estado: Aplicado tipado fuerte en módulos de Proyectos y formularios críticos; persisten `any` en zonas legacy.
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
3. [x] Implementar módulo UI de Facturas (emitidas/pagadas/por emitir, por cliente/proyecto).
       Estado: Implementado crear/listar/editar, actualización de estado y emisión automática “por emitir” por hitos/cuotas.
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
   Estado: Implementado create/update/delete para cliente y contacto + deduplicación y validaciones de relaciones. Falta API REST formal si se requiere integración externa.
   Archivos relacionados:
   - `src/lib/actions/crm.ts`
   - `src/lib/ai/tools.ts`
2. [~] Implementar acciones/API para `Quote` y `Invoice` con reglas de negocio completas.
   Estado: Implementadas acciones de creación y cambio de estado con UI conectada. Falta completar reglas avanzadas de facturación por cuota/hito.
   Archivo base: `prisma/schema.prisma`
3. [x] Implementar lógica de "facturas por emitir" por hitos/cuotas de proyecto (no solo facturas registradas).
       Estado: Implementada generación automática por hitos completados y cuotas acumuladas (sync en CRM + acción manual).
4. [ ] Definir contacto principal de empresa de forma explícita (`mainContactId` o `isPrimary`) y su flujo.
5. [~] Validaciones anti-duplicidad consistentes (cliente/contacto/lead) para evitar registros repetidos.
   Estado: Cubierto en create/update de cliente/contacto y en creación de leads. Falta estandarizar en todos los módulos y casos borde.
6. [x] Completar flujo UI+backend de actividades/notas del lead (`Activity`: llamada, mail, reunión, chat).
       Estado: Implementado historial por lead + registro de actividad desde modal de lead en CRM.

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
- [x] En marketing mostrar cantidad de seguidores e interacción por red social.
      Estado: Implementado con módulo de métricas sociales por plataforma (seguidores, impresiones, interacciones, clicks, leads), visualización agregada, CRUD en BD y endpoint de sync (`/api/integrations/social/sync`).
- [~] Vincular Gmail/correo por usuario y ver mails recibidos por contacto.
  Estado: Implementado flujo base Gmail por usuario (configuración OAuth refresh token + sync manual + persistencia en BD + vista en CRM por contacto). Falta OAuth completo one-click y proveedores adicionales.
- [~] Ver mails por proyecto (buzón por proyecto con reenvío y almacenamiento).
  Estado: Implementado listado de correos vinculados en detalle de proyecto con asociación automática por contacto. Falta reenvío y almacenamiento de adjuntos.
- [x] Equipo: horario de trabajo, zona horaria actual, cumpleaños y próximo cumpleaños en dashboard.
      Estado: Implementado en Dashboard (tabla de equipo con hora local por zona, horario y próximo cumpleaños) y edición en Equipo con selector de zona horaria basado en lista IANA.
- [x] Espacio para deudas por pagar y por cobrar.
      Estado: Implementado en Contabilidad con vistas consolidadas y detalle relacionado (facturas por cobrar + proveedores/planilla/costos fijos por pagar).
- [x] Espacio para facturas emitidas/pendientes/por emitir por proyecto y por hito.
      Estado: Implementado emitidas/pendientes con estados y alertas + sincronización automática por hitos/cuotas y proyección de siguiente factura.
- [x] El bot debe ingresar contactos, empresas, leads y proyectos con datos básicos.
      Estado: Implementado para contactos/empresas/leads/proyectos con permisos por rol y auditoría.
- [x] Notificaciones por contactos/proyectos con datos faltantes.
      Estado: Implementado con detección automática en carga de módulos CRM/Proyectos y creación de notificaciones deduplicadas (`contact_data_missing`, `project_data_missing`) visibles en Header/Sidebar.
- [x] Importación masiva de transacciones vía CSV + plantilla modelo.
      Estado: Implementado en Contabilidad con descarga de modelo e importador con validación de filas y reporte de errores.
- [~] Rentabilidad real por cliente/proyecto/servicio.
  Estado: Implementado cálculo y ranking en Finanzas con ingresos de facturas y costos directos por proyecto; pendiente asignación avanzada de costos indirectos.
- [~] Flujo de caja proyectado (30/60/90 días) con alertas.
  Estado: Implementado en Finanzas con cobros esperados vs pagos comprometidos y recomendación automática.
- [~] Pipeline comercial con forecast y meta vs real.
  Estado: Implementado forecast ponderado por estado y comparativo meta/forecast/real por canal fuente.

## Integraciones externas pendientes

1. [ ] n8n inbound/outbound real (webhooks + seguridad + trazas).
2. [ ] Telegram bot productivo.
3. [ ] Google Drive (subida/documentos).
4. [~] Email transaccional productivo.
   Estado: Implementado canal Brevo para correos de sistema (notificaciones por email opcionales, envío de reportes y recuperación de contraseña). Gmail se mantiene para correo operativo de proyecto.

## Frontend/UX pendiente para “100%”

1. [~] Estandarizar estados de carga/error en todos los módulos.
   Estado: Mejorado en contabilidad/importación CSV y formularios clave; falta cobertura total.
2. [~] Paginación y filtros server-side completos (CRM/proyectos).
   Estado: Implementado en CRM (leads) y Proyectos con `page`, `pageSize`, `q`, `status`.
3. [~] Validación consistente con esquemas compartidos (frontend + backend).
   Estado: Implementado con Zod compartido para creación de transacciones, leads, proyectos y parsing CSV.
4. Agregar opcion de cambio a modo oscuro y claro en moviles

## Criterio de “100% listo”

1. [~] Auth robusta (password/OTP) y sesiones seguras.
2. [~] RBAC aplicado en todas las rutas/acciones.
3. [x] Cero mocks activos en producción (módulos críticos solicitados).
4. [ ] Integraciones externas operativas y probadas.
5. [ ] Tests automáticos + CI + monitoreo.
6. [ ] Secretos rotados y política de seguridad aplicada.

## Errores

- [~] Validar envío de audios (UX + transcripción Whisper) en chatbot.
- [x] Subir foto de perfil y PDF/archivo de facturas a Storage (Supabase) con URL persistida en BD.
      Estado: Implementado con APIs `POST /api/uploads/profile-photo` y `POST /api/uploads/invoice-file`, persistiendo en `User.avatarUrl` e `Invoice.fileUrl`.

- El lead dice USD y en el chat sale en soles cuando se le consulta los leads que hay.

- Además cuando se crea un lead debe dar la opción de elegir en que moneda está el presupuesto.
- El bot debe poder cambiar el estado de los leads
- En una notificacion sobre completar datos de contactos, deberia decir que contactos faltan y poner los enlaces de cada contacto
- Las fechas deben estar en formato dd/mm/yyyy
- Cuando se crea un hito desde un proyecto debe poder marcarse si el hito es necesario para enviar una factura, o si es un hito de producción nada más.
- En la sección finanzas del proyecto, indica las facturas generadas, pero no hay enlace ni visualización de esas facturas, debería poder estar vinculadas para verlas
