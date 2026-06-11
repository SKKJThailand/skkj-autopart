import {
  corsHeaders,
  customerError,
  getServiceClient,
  getUserAndRole,
  jsonResponse,
  logAdminAction,
  requestMeta,
  requireRole,
  sanitizeText,
} from "../_shared/security.ts";

const highRiskActions = new Set([
  "delete_product",
  "delete_customer_data",
  "mark_order_paid",
  "cancel_order",
  "refund_status",
  "bulk_price_change",
  "bulk_stock_change",
  "change_admin_role",
  "change_owner_role",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, message: "Method not allowed" }, 405);

  try {
    const { user, role } = await getUserAndRole(req);
    if (!user) return jsonResponse({ ok: false, message: "กรุณาเข้าสู่ระบบ" }, 401);
    const denied = requireRole(role, ["admin", "owner"]);
    if (denied) return denied;

    const body = await req.json();
    const actionType = sanitizeText(body.actionType, 80);
    const confirmed = body.confirmed === true;
    const ownerApproved = body.ownerApproved === true;
    const meta = requestMeta(req);

    if (!confirmed) {
      await logAdminAction({
        adminUserId: user.id,
        role,
        actionType,
        newValue: body.payload ?? null,
        confirmationStatus: "pending",
        originalChatMessage: sanitizeText(body.originalChatMessage, 1000),
        ipAddress: meta.ip_address,
        userAgent: meta.user_agent,
      });
      return jsonResponse({ ok: false, needsConfirmation: true, message: "กรุณายืนยันก่อนเปลี่ยนข้อมูล" }, 409);
    }

    if (highRiskActions.has(actionType) && (role !== "owner" || !ownerApproved)) {
      return jsonResponse({ ok: false, needsOwnerApproval: true, message: "รายการนี้ต้องให้ owner อนุมัติ" }, 403);
    }

    const service = getServiceClient();
    let result: unknown = null;

    if (actionType === "update_product") {
      const productId = sanitizeText(body.productId, 80);
      const payload = body.payload ?? {};
      const allowedPayload = {
        name_th: sanitizeText(payload.name_th, 200),
        name_en: sanitizeText(payload.name_en, 200),
        price: Number(payload.price ?? 0),
        stock: Number(payload.stock ?? 0),
        visible: Boolean(payload.visible),
        active: Boolean(payload.active),
        updated_by: user.id,
      };
      const { data, error } = await service.from("products").update(allowedPayload).eq("id", productId).select().single();
      if (error) throw error;
      result = data;
    } else if (actionType === "update_order_status") {
      const orderId = sanitizeText(body.orderId, 80);
      const status = sanitizeText(body.status, 40);
      const { data, error } = await service.from("orders").update({ order_status: status }).eq("id", orderId).select().single();
      if (error) throw error;
      result = data;
    } else {
      return jsonResponse({ ok: false, message: "ยังไม่รองรับคำสั่งนี้" }, 400);
    }

    await logAdminAction({
      adminUserId: user.id,
      role,
      actionType,
      newValue: body.payload ?? body,
      confirmationStatus: highRiskActions.has(actionType) ? "owner_approved" : "confirmed",
      relatedProductId: sanitizeText(body.productId, 80) || undefined,
      relatedOrderId: sanitizeText(body.orderId, 80) || undefined,
      ipAddress: meta.ip_address,
      userAgent: meta.user_agent,
    });

    return jsonResponse({ ok: true, result });
  } catch (error) {
    console.error("admin-action failed", error);
    return customerError();
  }
});
