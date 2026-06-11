import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function customerError(status = 500) {
  return jsonResponse({
    ok: false,
    message: "ระบบมีปัญหาชั่วคราว กรุณาลองใหม่อีกครั้งหรือติดต่อทีมงานทาง LINE",
  }, status);
}

export function sanitizeText(value: unknown, max = 1000) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function validatePhone(phone: unknown) {
  const clean = String(phone ?? "").replace(/[^\d+]/g, "");
  return clean.length >= 8 && clean.length <= 15 ? clean : "";
}

export function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing Supabase server env");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getUserAndRole(req: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const publishable = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization") || "";
  if (!url || !publishable || !authHeader) return { user: null, role: "customer" };

  const authClient = createClient(url, publishable, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await authClient.auth.getUser();
  const user = data.user ?? null;
  if (!user) return { user: null, role: "customer" };

  const service = getServiceClient();
  const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { user, role: profile?.role ?? "customer" };
}

export function requireRole(role: string, allowed: string[]) {
  if (!allowed.includes(role)) {
    return jsonResponse({ ok: false, message: "ไม่มีสิทธิ์ใช้งานส่วนนี้" }, 403);
  }
  return null;
}

export function requestMeta(req: Request) {
  return {
    ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    user_agent: req.headers.get("user-agent") || null,
  };
}

export async function checkRateLimit(actionType: string, key: string, limitPerMinute: number) {
  const service = getServiceClient();
  const windowStart = new Date();
  windowStart.setSeconds(0, 0);
  const { data } = await service
    .from("rate_limits")
    .select("request_count")
    .eq("rate_key", key)
    .eq("action_type", actionType)
    .eq("window_start", windowStart.toISOString())
    .maybeSingle();

  const nextCount = (data?.request_count ?? 0) + 1;
  if (nextCount > limitPerMinute) return false;

  await service.from("rate_limits").upsert({
    rate_key: key,
    action_type: actionType,
    window_start: windowStart.toISOString(),
    request_count: nextCount,
  }, { onConflict: "rate_key,action_type,window_start" });

  return true;
}

export async function logAdminAction(params: {
  adminUserId: string;
  role: string;
  actionType: string;
  oldValue?: unknown;
  newValue?: unknown;
  confirmationStatus?: string;
  relatedProductId?: string;
  relatedOrderId?: string;
  relatedCustomerId?: string;
  originalChatMessage?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const service = getServiceClient();
  await service.from("admin_action_logs").insert({
    admin_user_id: params.adminUserId,
    role: params.role,
    action_type: params.actionType,
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
    confirmation_status: params.confirmationStatus ?? "pending",
    related_product_id: params.relatedProductId ?? null,
    related_order_id: params.relatedOrderId ?? null,
    related_customer_id: params.relatedCustomerId ?? null,
    original_chat_message: params.originalChatMessage ?? null,
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
  });
}
