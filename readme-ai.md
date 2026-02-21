# README AI - Fibra Core

## 1) Objetivo del proyecto

Fibra Core es una plataforma de gestion empresarial para una agencia de marketing/branding.
Incluye CRM, proyectos, finanzas, contabilidad, proveedores, reportes y un chatbot IA conectado a datos reales.

Meta operativa: centralizar operaciones de gerencia/comercial/proyectos/finanzas con trazabilidad y automatizaciones.

## 2) Stack tecnico

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS + Radix UI + Recharts
- Prisma 5 + PostgreSQL (Supabase)
- NextAuth (Credentials + JWT)
- OpenAI:
  - `gpt-4o` para asistente
  - `whisper-1` para transcripcion de audio
- Supabase Storage (archivos privados con signed URLs)
- Integraciones: Telegram webhook, Gmail/Brevo, inbound email endpoint

Ver detalle tecnico completo: `detalle-tecnico.md`.

## 3) Dominios funcionales

- Dashboard
- Comercial (Leads, Contactos, Empresas, Cotizaciones, Facturas)
- Proyectos (detalle, hitos, tareas, finanzas)
- Tareas
- Equipo
- Proveedores
- Contabilidad
- Facturas
- Finanzas
- Marketing (servicios y metricas sociales)
- Reportes
- Chatbot IA
- Perfil
- Configuracion
- Notificaciones

## 4) Estructura del codigo

- `src/app/(app)/*`: paginas privadas por modulo
- `src/app/api/*`: endpoints internos/integraciones
- `src/components/*`: UI por modulo
- `src/lib/actions/*`: logica de negocio server-side
- `src/lib/ai/*`: asistente y tools
- `src/lib/auth.ts`, `src/lib/server-auth.ts`, `src/lib/rbac.ts`: auth/autorizacion
- `src/lib/storage.ts`, `src/lib/supabase-admin.ts`: almacenamiento
- `prisma/schema.prisma`: modelo de datos

## 5) Reglas clave para trabajar en este repo

1. Mantener RBAC en toda accion nueva.
   - Toda server action/API sensible debe usar `requireModuleAccess` o validacion equivalente.
2. No romper consistencia de moneda/fecha.
   - Monedas: respetar USD/PEN real de cada registro.
   - Fechas al usuario final: `dd/mm/yyyy`.
3. Evitar mocks en modulos productivos.
   - Si hay fallback mock, documentarlo y marcarlo como deuda tecnica.
4. Operaciones de IA de escritura deben auditarse.
   - Registrar tool/action/input/success/error en `ToolAuditLog`.
5. Datos sensibles
   - Nunca commitear secretos reales (`OPENAI_API_KEY`, tokens, claves DB, etc.).

## 6) Flujo recomendado para implementar cambios

1. Revisar impacto en:
   - UI (`src/components/...`)
   - accion server (`src/lib/actions/...`)
   - validacion (`src/lib/validation/schemas.ts`)
   - modelo Prisma (`prisma/schema.prisma`) si aplica
2. Si hay cambios de schema:
   - actualizar Prisma schema
   - ejecutar `npm run db:push`
   - ejecutar `npm run db:generate`
3. Ajustar chatbot tools/prompt si cambia semantica del negocio.
4. Probar flujo end-to-end manual del modulo afectado.
5. Actualizar `Implementación pendiente.md` (estado real [ ] [~] [x]).

## 7) Comandos utiles

- Desarrollo: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Prisma push: `npm run db:push`
- Prisma generate: `npm run db:generate`
- Prisma Studio: `npm run db:studio`

## 8) Variables de entorno esperadas (resumen)

- Auth: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- DB: `DATABASE_URL`, `DIRECT_URL`
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- OpenAI: `OPENAI_API_KEY`
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
- Inbound email: `PROJECT_MAIL_INBOUND_TOKEN`
- Email providers segun flujo (Gmail/Brevo)

## 9) Convenciones de negocio importantes

- `Invoice.status` distingue emitida/pagada/vencida, etc.
- "Por cobrar" debe separar:
  - facturas emitidas pendientes
  - potencial cobrable por hitos aun no cumplidos
- `Milestone.billable` define si un hito habilita facturacion o es solo produccion.
- En CRM/IA:
  - cliente puede crearse solo con nombre (email opcional)
  - contacto/empresa/lead/proyecto deben poder crearse con datos basicos y completar luego.

## 10) Estado actual y prioridades

Fuente de verdad de pendientes: `Implementación pendiente.md`.
Prioridades actuales recomendadas:

1. Integraciones externas productivas (n8n/telegram/drive/email) con hardening.
2. Testing + CI + observabilidad.
3. Cierre de edge-cases financieros y conciliaciones.
4. UX operativa (estados de carga/error consistentes y polish final).

## 11) Checklist de Definition of Done por feature

- [ ] Requisito funcional implementado
- [ ] Permisos por rol validados
- [ ] Validaciones frontend/backend consistentes
- [ ] Manejo de errores claro para usuario
- [ ] Sin regresion en modulo relacionado
- [ ] Chatbot actualizado si el dominio cambio
- [ ] `Implementación pendiente.md` actualizado

## 12) Troubleshooting rapido

- Error de campo Prisma inexistente:
  - schema local no sincronizado con DB
  - correr `npm run db:push` + `npm run db:generate`
- Imagen/archivo no carga:
  - revisar bucket, politicas y signed URL si bucket privado
- Chatbot responde datos inconsistentes:
  - revisar tool usada y reglas del system prompt en `src/lib/ai/assistant.ts`
- Carga lenta:
  - revisar consultas DB, pool settings y server-side pagination

## 13) Nota de seguridad

Se detectaron secretos reales en historico de trabajo. Rotar claves comprometidas y limpiar historial si corresponde.

