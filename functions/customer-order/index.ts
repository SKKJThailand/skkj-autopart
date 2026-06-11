import {
  checkRateLimit,
  corsHeaders,
  customerError,
  getServiceClient,
  getUserAndRole,
  jsonResponse,
  requestMeta,
  sanitizeText,
  validatePhone,
} from "../_shared/security.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, message: "Method not allowed" }, 405);

  try {
    const { user } = await getUserAndRole(req);
    const meta = requestMeta(req);
    const rateKey = user?.id || meta.ip_address || "anonymous";
    if (!(await checkRateLimit("order_submit", rateKey, 5))) {
      return jsonResponse({ ok: false, message: "ส่งคำสั่งซื้อถี่เกินไป กรุณารอสักครู่" }, 429);
    }

    const body = await req.json();
    const name = sanitizeText(body.name, 120);
    const phone = validatePhone(body.phone);
    const address = sanitizeText(body.address, 1000);
    const items = Array.isArray(body.items) ? body.items : [];
    const totalAmount = Number(body.totalAmount || 0);

    if (!name || !phone || !address || !items.length || !Number.isFinite(totalAmount) || totalAmount < 0) {
      return jsonResponse({ ok: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" }, 400);
    }

    const service = getServiceClient();
    const { data: customer, error: customerErrorData } = await service.from("customers").insert({
      profile_id: user?.id ?? null,
      name,
      phone,
      line_id: sanitizeText(body.lineId, 80),
      email: sanitizeText(body.email, 160),
      addresses: [{ address, label: sanitizeText(body.addressLabel, 80) || "ที่อยู่หลัก" }],
    }).select("id").single();
    if (customerErrorData) throw customerErrorData;

    const safeItems = items.map((item: Record<string, unknown>) => ({
      product_id: sanitizeText(item.productId, 80),
      sku: sanitizeText(item.sku, 80),
      name_th: sanitizeText(item.nameTh, 200),
      name_en: sanitizeText(item.nameEn, 200),
      qty: Math.max(1, Math.min(99, Number(item.qty || 1))),
      price: Math.max(0, Number(item.price || 0)),
    }));

    const { data: order, error: orderError } = await service.from("orders").insert({
      profile_id: user?.id ?? null,
      customer_id: customer.id,
      customer_snapshot: { name, phone, address },
      items: safeItems,
      total_amount: totalAmount,
      payment_method: sanitizeText(body.paymentMethod, 40) || "promptpay",
      shipping_method: sanitizeText(body.shippingMethod, 40) || "normal",
    }).select("id, order_no").single();
    if (orderError) throw orderError;

    return jsonResponse({ ok: true, order });
  } catch (error) {
    console.error("customer-order failed", error);
    return customerError();
  }
});
