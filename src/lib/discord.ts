/**
 * Send messages to a Discord webhook (e.g. for leads, order alerts, product interest).
 * Webhook URL is optional; if not set, nothing is sent.
 */

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL?.trim() || '';

export type DiscordEmbed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
};

async function postToDiscord(payload: { content?: string; embeds?: DiscordEmbed[] }): Promise<void> {
  if (!WEBHOOK_URL) return;
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn('[Discord] Webhook returned', res.status, await res.text());
    }
  } catch (e) {
    console.warn('[Discord] Failed to send:', e);
  }
}

export async function notifyDiscordLead(data: {
  source: string;
  name: string;
  phone?: string;
  email?: string;
  productType?: string;
  message?: string;
}): Promise<void> {
  await postToDiscord({
    embeds: [
      {
        title: '🆕 New Lead',
        description: `**Source:** ${data.source}`,
        color: 0x5865f2,
        fields: [
          { name: 'Name', value: data.name, inline: true },
          ...(data.phone ? [{ name: 'Phone', value: data.phone, inline: true }] : []),
          ...(data.email ? [{ name: 'Email', value: data.email, inline: true }] : []),
          ...(data.productType ? [{ name: 'Product type', value: data.productType, inline: false }] : []),
          ...(data.message ? [{ name: 'Message', value: data.message.slice(0, 500), inline: false }] : []),
        ],
        footer: { text: 'Golden Looms' },
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

export async function notifyDiscordOrder(data: {
  orderId: string;
  customerName: string;
  email: string;
  phone?: string;
  totalAmount: number;
  itemCount?: number;
}): Promise<void> {
  await postToDiscord({
    embeds: [
      {
        title: '🛒 Order placed',
        description: `**Order ID:** ${data.orderId}`,
        color: 0x57f287,
        fields: [
          { name: 'Customer', value: data.customerName, inline: true },
          { name: 'Email', value: data.email, inline: true },
          ...(data.phone ? [{ name: 'Phone', value: data.phone, inline: true }] : []),
          { name: 'Total', value: `₹${Number(data.totalAmount).toLocaleString()}`, inline: true },
          ...(data.itemCount != null ? [{ name: 'Items', value: String(data.itemCount), inline: true }] : []),
        ],
        footer: { text: 'Golden Looms' },
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

export async function notifyDiscordEvent(data: {
  event: string;
  productId?: string;
  productName?: string;
  category?: string;
  qty?: number;
  source?: string;
}): Promise<void> {
  const fields: { name: string; value: string; inline?: boolean }[] = [];
  if (data.productId) fields.push({ name: 'Product ID', value: data.productId, inline: true });
  if (data.productName) fields.push({ name: 'Product', value: data.productName, inline: true });
  if (data.category) fields.push({ name: 'Category', value: data.category, inline: true });
  if (data.qty != null) fields.push({ name: 'Qty', value: String(data.qty), inline: true });
  if (data.source) fields.push({ name: 'Source', value: data.source, inline: true });

  const titles: Record<string, string> = {
    product_view: '👁️ Product viewed',
    add_to_cart: '🛒 Add to cart',
    add_to_wishlist: '❤️ Add to wishlist',
    product_zoom: '🔍 Product zoomed',
    view_full_details: '📄 View full details',
  };
  const colors: Record<string, number> = {
    add_to_cart: 0xfee75c,
    add_to_wishlist: 0xed4245,
    product_zoom: 0x57f287,
    view_full_details: 0x5865f2,
  };
  await postToDiscord({
    embeds: [
      {
        title: titles[data.event] ?? '📌 Event',
        description: `**Event:** \`${data.event}\``,
        color: colors[data.event] ?? 0xeb459e,
        fields: fields.length ? fields : [{ name: 'Event', value: data.event, inline: false }],
        footer: { text: 'Golden Looms' },
        timestamp: new Date().toISOString(),
      },
    ],
  });
}
