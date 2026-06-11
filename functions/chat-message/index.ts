import {
  checkRateLimit,
  corsHeaders,
  customerError,
  getServiceClient,
  getUserAndRole,
  jsonResponse,
  requestMeta,
  sanitizeText,
} from "../_shared/security.ts";

function detectLanguage(message: string) {
  const hasThai = /[\u0E00-\u0E7F]/.test(message);
  const hasEnglish = /[a-z]/i.test(message);
  if (hasThai && hasEnglish) return "mixed";
  if (hasEnglish) return "en";
  return "th";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, message: "Method not allowed" }, 405);

  try {
    const { user } = await getUserAndRole(req);
    const meta = requestMeta(req);
    const rateKey = user?.id || meta.ip_address || "anonymous";
    if (!(await checkRateLimit("chat_message", rateKey, 20))) {
      return jsonResponse({ ok: false, message: "ส่งข้อความถี่เกินไป กรุณารอสักครู่" }, 429);
    }

    const body = await req.json();
    const message = sanitizeText(body.message, 1500);
    if (!message) return jsonResponse({ ok: false, message: "กรุณาพิมพ์ข้อความ" }, 400);

    const service = getServiceClient();
    let sessionId = sanitizeText(body.sessionId, 80);
    const language = detectLanguage(message);

    if (!sessionId) {
      const { data, error } = await service.from("chat_sessions").insert({
        profile_id: user?.id ?? null,
        language,
      }).select("id").single();
      if (error) throw error;
      sessionId = data.id;
    }

    const { error } = await service.from("chat_messages").insert({
      session_id: sessionId,
      sender: "customer",
      message,
      sanitized_message: message,
      metadata: { language },
    });
    if (error) throw error;

    const reply = language === "en"
      ? "Thank you. Please send your car brand, model, year, and 2WD/4WD. Our team will check the correct part."
      : "ขอบคุณครับ กรุณาส่งยี่ห้อรถ รุ่นรถ ปีรถ และขับ 2/ขับ 4 ทีมงานจะช่วยเช็กอะไหล่ให้ครับ";

    await service.from("chat_messages").insert({
      session_id: sessionId,
      sender: "bot",
      message: reply,
      sanitized_message: reply,
      metadata: { safe_reply: true },
    });

    return jsonResponse({ ok: true, sessionId, reply });
  } catch (error) {
    console.error("chat-message failed", error);
    return customerError();
  }
});
