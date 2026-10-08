import { notifyTechnician } from "./notification_service.ts";

const result = await notifyTechnician({ workOrderId: "WO-1042", technicianId: "tech-7", status: "dispatched", followUp: "Confirm arrival" }, false);
console.log(`Queued ${result.workOrderId} for offline technician (${result.route})`);
