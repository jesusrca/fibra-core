Aquí tienes la lista completa de cambios y correcciones, dividida por áreas críticas.

1. Infraestructura y Stack Core (Fundamentos)

El mayor riesgo actual es el acoplamiento excesivo en el monolito de Next.js.

Actualización de Versiones: Migrar de Next.js 14/React 18 a Next.js 16/React 19. Esto es vital para aprovechar el manejo nativo de formularios y los Server Components optimizados que reducen el tamaño del bundle.

Seguridad de Acceso (Auth): Reemplazar o complementar NextAuth Credentials con Passkeys (WebAuthn) o MFA (Multi-Factor Authentication). Las contraseñas puras son el eslabón más débil en sistemas financieros en 2026.

Hardening de Base de Datos: Activar Row Level Security (RLS) en Supabase para todas las tablas. No confíes solo en la capa de middleware.ts o rbac.ts; la base de datos debe ser capaz de protegerse a sí misma si la API es vulnerada.

Variables de Entorno: Implementar una validación estricta de env al inicio de la app (usando librerías como t3-env o Zod) para evitar que el sistema suba si falta una clave crítica como OPENAI_API_KEY o DATABASE_URL.

2. Lógica de Negocio y Arquitectura (Desacoplamiento)

Actualmente, tu backend maneja desde la UI hasta el procesamiento de IA pesado.

Extracción de Carga Pesada (FastAPI): Mover la orquestación compleja de IA (src/lib/ai/assistant.ts) y la lógica de transcripción de audio (whisper-1) a un microservicio en FastAPI (Python). Esto evita que el Event Loop de Node.js se bloquee durante tareas intensivas de CPU.

Offloading a n8n: Eliminar los endpoints manuales de sincronización social (/api/integrations/social/sync) y Gmail. Configura estas tareas en n8n para que el mantenimiento de las APIs externas no recaiga en tu código base.

Procesamiento Asíncrono: Para la generación de reportes financieros pesados, no uses un Server Action que espera la respuesta. Usa una cola de mensajes (como BullMQ o Upstash QStash) para que el usuario reciba una notificación cuando el reporte esté listo.

3. Inteligencia Artificial y Datos (Cerebro)

Tienes las herramientas, pero falta optimizar la "experiencia de pensamiento".

Streaming de IA: Implementar Streaming en el chatbot (/api/chat/route.ts). En 2026, los usuarios no esperan respuestas en bloque; necesitan ver la generación de texto en tiempo real para reducir la percepción de latencia.

RAG Evolucionado: Tu asistente usa "tools" para leer la BD. Debes implementar un sistema de Caché Vectorial para consultas recurrentes, evitando llamadas costosas a OpenAI para preguntas idénticas.

Auditoría Forense: Ampliar ToolAuditLog para que guarde no solo la acción, sino el contexto completo (Snapshot) del dato antes y después de la modificación de la IA. Esto es indispensable para revertir errores de "alucinación" en la contabilidad.

4. Calidad y DevOps (Estabilidad)

Este es tu punto más débil según el resumen de estado actual.

Estrategia de Testing (Indispensable):

Vitest: Para pruebas unitarias en src/lib/actions (lógica contable).

Playwright: Para flujos críticos (Login -> Crear Factura -> Ver Dashboard).

Observabilidad: Integrar OpenTelemetry o servicios como Sentry/Logtail. Necesitas saber que un webhook de Telegram falló antes de que el cliente te llame para avisarte.

CI/CD Pipeline: Configurar GitHub Actions para que bloquee cualquier merge a main si los tests fallan o si el esquema de Prisma no está sincronizado con la BD.