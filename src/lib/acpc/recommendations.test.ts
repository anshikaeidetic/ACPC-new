import assert from "node:assert/strict";
import test from "node:test";

import { buildRecommendations } from "@/lib/acpc/recommendations";

test("buildRecommendations returns limited mode without rank", () => {
  const result = buildRecommendations({
    courseCode: "degree-engineering",
  });

  assert.equal(result.dataAvailability, "limited");
});
