import assert from "node:assert/strict";
import { parseWorkOrder } from "../src/notification_service.ts";

const valid = parseWorkOrder({ workOrderId: "WO-1", technicianId: "tech-1", status: "dispatched" });
assert.equal(valid.status, "dispatched");
assert.throws(() => parseWorkOrder({ workOrderId: "WO-1", technicianId: "tech-1", status: "queued" }));
console.log("work-order boundary test passed");
