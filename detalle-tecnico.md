# Detalle Tecnico - Fibra Core

## 1) Stack principal

- Frontend: Next.js 14 (App Router), React 18, TypeScript.
- Estilos/UI: Tailwind CSS, Radix UI, componentes UI propios, Recharts para graficos.
- Backend: API Routes de Next.js + Server Actions.
- ORM y DB: Prisma 5 + PostgreSQL (Supabase).
- Auth: NextAuth (Credentials + JWT session strategy).
- IA: OpenAI (gpt-4o para asistente, whisper-1 para transcripcion de audio).
- Storage de archivos: Supabase Storage (cliente admin server-side + signed URLs).
- Email:
  - Operativo de proyecto: Gmail integration (sync y registro en BD).
  - Sistema/transaccional: Brevo (segun configuracion actual del proyecto).
- Integraciones adicionales: Telegram webhook bot, endpoint inbound de correo, sync social metrics.

## 2) Arquitectura de aplicacion

- App Next.js monolitica con separacion por modulos en `src/app/(app)`.
- Datos y logica de negocio centralizados en `src/lib/actions/*`.
- Capa de autorizacion:
  - `middleware.ts` protege rutas privadas.
  - `src/lib/server-auth.ts` exige sesion y modulo permitido.
  - `src/lib/rbac.ts` define permisos por rol/modulo.
- Capa IA:
  - `src/lib/ai/assistant.ts`: orquestacion del agente con tools.
  - `src/lib/ai/tools.ts`: lecturas/escrituras de negocio con auditoria.
  - `src/app/api/chat/route.ts`: endpoint de chat principal.
  - `src/app/api/chat/transcribe-audio/route.ts`: transcripcion Whisper.

## 3) Modulos funcionales implementados

- Dashboard
- Comercial (Leads, Contactos, Empresas, Cotizaciones, Facturas)
- Proyectos (detalle, tareas/hitos, finanzas vinculadas)
- Tareas
- Equipo
- Proveedores
- Contabilidad
- Facturas
- Finanzas
- Marketing (incluye metricas sociales)
- Reportes
- Chatbot IA
- Perfil
- Configuracion
- Notificaciones (detalle y marcado de lectura)

## 4) Modelo de datos (Prisma/PostgreSQL)

Archivo fuente: `prisma/schema.prisma`.

Entidades base:
- Usuarios y seguridad: `User`, `PasswordResetToken`, `Role`.
- CRM: `Client`, `Contact`, `Lead`, `Activity`, `Quote`, `Invoice`.
- Proyectos: `Project`, `Milestone`, `Task`.
- Finanzas/contabilidad: `Transaction`, `Payroll`, `FixedCost`, `AccountingBank`.
- Proveedores: `Supplier`, `SupplierWork`, `SupplierPayment`.
- Reporteria y auditoria: `Report`, `Notification`, `ToolAuditLog`.
- Marketing: `ServiceCatalog`, `SocialMetric`.
- Email: `EmailIntegration`, `EmailMessage`.

Enums clave:
- `Role`, `ProjectStatus`, `LeadStatus`, `InvoiceStatus`, `TransactionCategory`.

## 5) Flujo de autenticacion y autorizacion

- Login por credenciales (email/password hash) via NextAuth.
- Sesion JWT con datos de usuario (`id`, `role`, `name`, `email`) en callbacks.
- Proteccion por ruta en `middleware.ts`.
- Validaciones de acceso por modulo en server actions/APIs con `requireModuleAccess`.
- Control de permisos por rol en `src/lib/rbac.ts`.

## 6) IA y automatizaciones

Chatbot con herramientas de negocio:
- Lectura: proyectos, leads, clientes, contactos, proveedores, resumen financiero, cobranzas.
- Escritura: crear cliente(s), contacto, lead, proyecto, tarea, actualizar estado de lead.
- Seguridad: tools condicionadas por rol + auditoria en `ToolAuditLog`.
- Criterios conversacionales incluidos en prompt de sistema:
  - separacion de "por cobrar emitido" vs "potencial por hitos",
  - formato de fechas,
  - respeto de moneda,
  - enlaces internos a recursos.

Audio:
- Grabacion en UI.
- Envio a `POST /api/chat/transcribe-audio`.
- Transcripcion con OpenAI Whisper (`whisper-1`).

## 7) Integraciones externas

- Supabase:
  - PostgreSQL como BD principal.
  - Storage para archivos (fotos de perfil, comprobantes/facturas) usando referencias `bucket:path`.
  - URLs firmadas para buckets privados (`toSignedStorageUrl`).
- Telegram:
  - Webhook en `POST /api/telegram/webhook`.
  - Vinculacion de usuario por token firmado (`telegram-link`).
  - Soporte de texto y audio (audio se transcribe con Whisper).
- Email:
  - Inbound endpoint `POST /api/integrations/email/inbound` para registrar correos de proyectos.
  - Integracion Gmail para sincronizacion de mensajes por contacto/proyecto.
  - Canal transaccional con Brevo (reportes/notificaciones/recuperacion, segun configuracion).
- Social:
  - `POST /api/integrations/social/sync` para metricas de marketing.

## 8) Storage y manejo de archivos

- Cliente anonimo: `src/lib/supabase.ts` (frontend/public operations permitidas).
- Cliente admin: `src/lib/supabase-admin.ts` (server-only, usa `SUPABASE_SERVICE_ROLE_KEY`).
- Referencias persistidas en BD como `bucket:path`.
- Conversion a URL firmada en runtime para buckets privados.
- Endpoints actuales:
  - `POST /api/uploads/profile-photo`
  - `POST /api/uploads/invoice-file`

## 9) Configuracion de entorno (alto nivel)

Variables clave esperadas:
- App/Auth: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.
- DB Prisma: `DATABASE_URL`, `DIRECT_URL`.
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- IA: `OPENAI_API_KEY`.
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`.
- Inbound email token: `PROJECT_MAIL_INBOUND_TOKEN`.
- Email providers (Gmail/Brevo) segun modulo.

## 10) Scripts de desarrollo

Definidos en `package.json`:
- `npm run dev` / `npm run dev:turbo`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run db:generate`
- `npm run db:push`
- `npm run db:studio`

## 11) Estado tecnico actual (resumen)

Fortalezas:
- Plataforma full-stack funcional por modulos.
- RBAC y auditoria en operaciones de IA.
- Integracion real con BD (sin dependencia principal de mocks en modulos criticos).
- Storage privado con signed URLs.

Pendiente para "100% productivo":
- Tests automatizados (unit/integration/e2e) y CI completo.
- Observabilidad estandar (logs estructurados, metricas, alertas).
- Completar integraciones externas productivas y hardening final.
- Cobertura total de validaciones compartidas y estandarizacion de edge cases UX.

## 12) Estructura tecnica de carpetas (referencia)

- `src/app/(app)/*`: paginas privadas por modulo.
- `src/app/api/*`: APIs internas/integraciones.
- `src/components/*`: UI por modulo + layout + componentes base.
- `src/lib/actions/*`: logica de negocio por dominio.
- `src/lib/ai/*`: asistente y tools del chatbot.
- `src/lib/*`: auth, rbac, prisma, storage, utilidades, integraciones.
- `prisma/*`: esquema y seed de base de datos.
