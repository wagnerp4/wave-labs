import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { RegistrySchema } from "../src/schema.ts";

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, "..", "adapters.json");
const parsed = RegistrySchema.safeParse(JSON.parse(readFileSync(file, "utf8")));

if (!parsed.success) {
  console.error("adapters.json is invalid");
  console.error(parsed.error.format());
  process.exit(1);
}

const ids = parsed.data.adapters.map((a) => a.id);
const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
if (duplicates.length > 0) {
  console.error(`duplicate adapter ids: ${[...new Set(duplicates)].join(", ")}`);
  process.exit(1);
}

const byTask = parsed.data.adapters.reduce<Record<string, number>>((acc, a) => {
  acc[a.task] = (acc[a.task] ?? 0) + 1;
  return acc;
}, {});

console.log(`adapters.json ok: ${ids.length} adapters`, byTask);
