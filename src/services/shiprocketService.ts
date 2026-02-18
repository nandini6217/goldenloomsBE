/**
 * Shiprocket shipping integration.
 * Creates a shipment in Shiprocket when payment is confirmed (e.g. after Razorpay payment.captured).
 * Requires SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD (API user credentials from Shiprocket panel).
 */

import { config } from '../config';

interface OrderForShipment {
  _id: unknown;
  address: string;
  customerName: string;
  email: string;
  phone: string;
  totalAmount: number;
  items?: Array<{ name: string; qty: number; priceAtPurchase: number }>;
  addressCity?: string;
  addressState?: string;
  addressPincode?: string;
}

const SHIPROCKET_BASE = 'https://apiv2.shiprocket.in/v1/external';

let cachedToken: string | null = null;
let tokenExpiry = 0;
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000; // 9 days (refresh before 10-day expiry)

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: config.shiprocket.email,
      password: config.shiprocket.password,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shiprocket auth failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error('Shiprocket auth: no token in response');
  cachedToken = data.token;
  tokenExpiry = Date.now() + TOKEN_TTL_MS;
  return cachedToken;
}

/**
 * Parse city, state, pincode from a combined address string.
 * Expects format like "Line1, Line2, City, State - 110001" (pincode after " - ").
 */
function parseAddressParts(address: string): { city: string; state: string; pincode: string } {
  const pincodeMatch = address.match(/\s-\s*(\d{6})\s*$/);
  const pincode = pincodeMatch ? pincodeMatch[1] : '';
  let rest = address.replace(/\s-\s*\d{6}\s*$/, '').trim();
  const parts = rest.split(',').map((p) => p.trim()).filter(Boolean);
  const state = parts.length >= 2 ? (parts[parts.length - 1] ?? '') : '';
  const city = parts.length >= 2 ? (parts[parts.length - 2] ?? '') : (parts[0] ?? '');
  return { city, state, pincode };
}

export interface CreateShipmentResult {
  shiprocketOrderId: number;
  shipmentId?: number;
  awb?: string;
  courierName?: string;
  trackingUrl?: string;
}

/**
 * Create a shipment in Shiprocket for a confirmed order.
 * Call this after payment is captured (e.g. in Razorpay payment.captured webhook).
 * Returns Shiprocket order id and optional AWB/tracking; persist these on the Order.
 */
export async function createShipment(order: OrderForShipment): Promise<CreateShipmentResult | null> {
  if (!config.shiprocket.enabled) return null;

  const nameParts = (order.customerName || 'Customer').trim().split(/\s+/);
  const firstName = nameParts[0] ?? 'Customer';
  const lastName = nameParts.slice(1).join(' ') || firstName;

  const city = order.addressCity?.trim();
  const state = order.addressState?.trim();
  const pincode = order.addressPincode?.trim();
  const parsed = parseAddressParts(order.address);
  const finalCity = city || parsed.city || 'Unknown';
  const finalState = state || parsed.state || 'Unknown';
  const finalPincode = pincode || parsed.pincode || '';

  if (!finalPincode || finalPincode.length !== 6) {
    console.warn('[Shiprocket] Skipping order', order._id, '- invalid or missing pincode');
    return null;
  }

  const token = await getToken();
  const orderDate = new Date().toISOString().slice(0, 10);

  const orderItems = (order.items || []).map((item: { name: string; qty: number; priceAtPurchase: number }) => ({
    name: item.name,
    sku: `item-${item.name.slice(0, 30).replace(/\s/g, '-')}`,
    units: item.qty,
    unit_price: Number(item.priceAtPurchase),
  }));

  const payload = {
    order_id: String(order._id),
    order_date: orderDate,
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: order.address,
    billing_address_2: '',
    billing_city: finalCity,
    billing_state: finalState,
    billing_pincode: finalPincode,
    billing_country: 'India',
    billing_email: order.email,
    billing_phone: order.phone,
    shipping_is_billing: 1,
    payment_method: 'Prepaid',
    sub_total: Number(order.totalAmount),
    length: 10,
    breadth: 10,
    height: 10,
    weight: Math.max(0.2, (order.items?.length ?? 1) * 0.3),
    order_items: orderItems.length ? orderItems : [{ name: 'Order', sku: 'order', units: 1, unit_price: Number(order.totalAmount) }],
  };

  const res = await fetch(`${SHIPROCKET_BASE}/orders/create/adhoc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as {
    order_id?: number;
    shipment_id?: number;
    status?: number;
    status_code?: number;
    onboarding_completed?: number;
    awb_code?: string;
    courier_company_id?: number;
    courier_name?: string;
    tracking_url?: string;
    message?: string;
  };

  if (!res.ok) {
    console.error('[Shiprocket] Create order failed:', res.status, data);
    return null;
  }

  const shiprocketOrderId = data.order_id ?? 0;
  const shipmentId = data.shipment_id;
  if (!shiprocketOrderId) {
    console.error('[Shiprocket] No order_id in response:', data);
    return null;
  }

  let awb = data.awb_code;
  let courierName = data.courier_name;
  let trackingUrl = data.tracking_url;

  if (shipmentId && !awb) {
    const assignResult = await assignCourierAndAwb(shiprocketOrderId, shipmentId);
    if (assignResult) {
      awb = assignResult.awb;
      courierName = assignResult.courierName ?? courierName;
      trackingUrl = assignResult.trackingUrl ?? trackingUrl;
    }
  }

  return {
    shiprocketOrderId,
    shipmentId,
    awb,
    courierName,
    trackingUrl,
  };
}

/**
 * Assign a courier and generate AWB for an existing Shiprocket order/shipment.
 * Call after create/adhoc when the create response does not include awb_code.
 */
export async function assignCourierAndAwb(
  shiprocketOrderId: number,
  shipmentId: number
): Promise<{ awb: string; courierName?: string; trackingUrl?: string } | null> {
  if (!config.shiprocket.enabled) return null;

  const token = await getToken();
  const res = await fetch(`${SHIPROCKET_BASE}/courier/assign/awb`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      order_id: shiprocketOrderId,
      shipment_id: shipmentId,
    }),
  });

  const data = (await res.json()) as {
    awb_code?: string;
    courier_name?: string;
    tracking_url?: string;
    status?: number;
    message?: string;
  };

  if (!res.ok) {
    console.error('[Shiprocket] Assign AWB failed:', res.status, data);
    return null;
  }

  const awb = data.awb_code;
  if (!awb) {
    console.warn('[Shiprocket] Assign AWB response had no awb_code:', data);
    return null;
  }

  return {
    awb,
    courierName: data.courier_name,
    trackingUrl: data.tracking_url,
  };
}
