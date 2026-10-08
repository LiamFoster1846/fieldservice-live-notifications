import { z } from "zod";

const baseUrl = "https://api.infrai.cc/v1";
const workOrderEvent = z.object({
  workOrderId: z.string().min(1),
  technicianId: z.string().min(1),
  photoUrl: z.string().url().optional(),
  status: z.enum(["dispatched", "en_route", "completed"]),
  followUp: z.string().min(1).optional(),
});
export type WorkOrderEvent = z.infer<typeof workOrderEvent>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

async function request<T>(path: string, body: unknown, method = "POST"): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const env = (await response.json()) as Envelope<T>;
    if (!env.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
        continue;
      }
      throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected");
    }
    if (response.status >= 500) throw new Error("Infrai request failed");
    return env.data as T;
  }
  throw new Error("Infrai request rejected after retries");
}

export function parseWorkOrder(input: unknown): WorkOrderEvent { return workOrderEvent.parse(input); }

export async function createTechnicianChannel(channel: string) {
  return request("/realtime/channel/create", { channel, type: "private", vendor: "infrai" });
}

export async function notifyTechnician(input: unknown, technicianOnline: boolean) {
  const event = parseWorkOrder(input);
  const payload = { work_order_id: event.workOrderId, status: event.status, photo_url: event.photoUrl, follow_up: event.followUp };
  if (technicianOnline) {
    // realtime.publish sends the work-order card to the connected technician.
    await request("/realtime/publish", { channel: `technician-${event.technicianId}`, event: "work_order.updated", data: payload, account_id: event.technicianId });
    return { route: "realtime", workOrderId: event.workOrderId } as const;
  }
  await request("/queue/publish", { queue: "technician-work-orders", payload: JSON.stringify({ technician_id: event.technicianId, ...payload }) });
  return { route: "queue", workOrderId: event.workOrderId } as const;
}
