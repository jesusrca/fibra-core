-- Activar RLS en todas las tablas importantes creadas por Prisma
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ToolAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Milestone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountingBank" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FixedCost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payroll" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupplierWork" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupplierPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceCatalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialMetric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;

-- Por defecto, al activar RLS sin políticas, Postgres DENEGARÁ TODO ACCESO 
-- a usuarios y clientes (como el rol de clave anónima de supabase "anon" o "authenticated").
-- 
-- Al mismo tiempo, los usuarios administradores de postgres, o con rol de bypassrls (como 
-- tu conexión de Prisma a través del Database URL o Direct URL) seguirán teniendo 
-- acceso total para lectura y escritura, ya que Prisma hace un bypass nativo del RLS.

-- NOTA: Si usarás Supabase UI o el cliente frontend con supabase-js usando la KEY ANONIMA,
-- esta configuración BLOQUEA esas peticiones. Todo el tráfico debe ser manejado por tus funciones 
-- de Next.js u ORM con cadena de conexión de postgres.
