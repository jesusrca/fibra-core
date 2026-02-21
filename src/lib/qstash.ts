import { Client } from "@upstash/qstash";
import { env } from "@/env.mjs";

export const qstash = env.QSTASH_TOKEN
    ? new Client({ token: env.QSTASH_TOKEN })
    : null;
