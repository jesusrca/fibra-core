import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextResponse } from "next/server";

async function handler(req: Request) {
    try {
        const body = await req.json();
        const action = body.action || "unknown";

        console.log(`[QStash] Processing background job: ${action}`, body);

        // TODO: Map different background job actions like report_generation, webhooks, sync, etc.
        switch (action) {
            case "test_job":
                console.log("Test job processed successfully.");
                break;
            default:
                console.log("No specific handler mapped for action", action);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[QStash] Error processing background job:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// verifySignatureAppRouter verifies that the request comes from Upstash using singing key envs
export const POST = verifySignatureAppRouter(handler, {
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "dummy_current_key",
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "dummy_next_key",
});
