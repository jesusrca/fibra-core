import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    server: {
        NEXTAUTH_SECRET: z.string().min(1),
        NEXTAUTH_URL: z.string().url().optional(), // Puede ser opcional en Vercel por VERCEL_URL

        DATABASE_URL: z.string().url(),
        DIRECT_URL: z.string().url().optional(),

        SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
        SUPABASE_PROFILE_BUCKET: z.string().min(1),
        SUPABASE_INVOICE_BUCKET: z.string().min(1),

        OPENAI_API_KEY: z.string().min(1),

        // Opcionales para entorno dev
        TELEGRAM_BOT_TOKEN: z.string().optional(),
        GOOGLE_CLIENT_ID: z.string().optional(),
        GOOGLE_CLIENT_SECRET: z.string().optional(),
        SENDGRID_API_KEY: z.string().optional(),
        EMAIL_FROM: z.string().email().optional(),
        N8N_WEBHOOK_BASE_URL: z.string().url().optional(),
        N8N_WEBHOOK_SECRET: z.string().optional(),
        UPSTASH_REDIS_REST_URL: z.string().url().optional(),
        UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
        QSTASH_URL: z.string().url().optional(),
        QSTASH_TOKEN: z.string().min(1).optional(),
        QSTASH_CURRENT_SIGNING_KEY: z.string().min(1).optional(),
        QSTASH_NEXT_SIGNING_KEY: z.string().min(1).optional(),
    },
    client: {
        NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    },
    runtimeEnv: {
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        DATABASE_URL: process.env.DATABASE_URL,
        DIRECT_URL: process.env.DIRECT_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_PROFILE_BUCKET: process.env.SUPABASE_PROFILE_BUCKET,
        SUPABASE_INVOICE_BUCKET: process.env.SUPABASE_INVOICE_BUCKET,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
        EMAIL_FROM: process.env.EMAIL_FROM,
        N8N_WEBHOOK_BASE_URL: process.env.N8N_WEBHOOK_BASE_URL,
        N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
        QSTASH_URL: process.env.QSTASH_URL,
        QSTASH_TOKEN: process.env.QSTASH_TOKEN,
        QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY,
        QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
    },
    // Skipp validation during build stage (if needed)
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
    emptyStringAsUndefined: true,
});
