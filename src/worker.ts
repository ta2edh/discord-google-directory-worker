/* eslint-disable */
import { verifyDiscordRequest } from "./x/discord_verify";
import { handleInteraction } from "./x/interaction_handler";

export interface Env {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_APP_ID: string;
  GOOGLE_CLIENT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
  GOOGLE_SUBJECT?: string;
  GOOGLE_CUSTOMER?: string;
  GOOGLE_SCOPES?: string;
  SKIP_VERIFY?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    if (request.method === "POST" && url.pathname === "/interactions") {
      const sig = request.headers.get("X-Signature-Ed25519");
      const ts = request.headers.get("X-Signature-Timestamp");
      console.log("interactions: hit", { hasSig: !!sig, hasTs: !!ts, skip: env.SKIP_VERIFY === "true" });

      if (env.SKIP_VERIFY !== "true") {
        const isValid = await verifyDiscordRequest(request, env.DISCORD_PUBLIC_KEY);
        console.log("interactions: verified", { ok: isValid });
        if (!isValid) return new Response("Bad signature", { status: 401 });
      }

      try {
        const body = await request.json<any>();
        console.log("interactions: body", { type: body?.type, name: body?.data?.name });
        return handleInteraction(body, env, ctx);
      } catch (e) {
        console.log("interactions: json parse error", String(e));
        return new Response("Bad Request", { status: 400 });
      }
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;


