import { z } from "zod";

export const TaskSchema = z.enum(["tts", "asr", "vc", "enhance"]);

export const HardwareSchema = z.enum(["cpu", "cuda", "mps", "rocm"]);

export const ConnectionSchema = z.enum(["local", "remote"]);

export const StatusSchema = z.enum(["available", "experimental", "planned"]);

export const RuntimeSchema = z.enum([
  "transformers",
  "onnx",
  "ctranslate2",
  "nemo",
  "custom",
  "openai-compatible"
]);

export const AdapterSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be kebab-case"),
  name: z.string().min(1),
  task: TaskSchema,
  connection: ConnectionSchema,
  status: StatusSchema,
  runtime: RuntimeSchema,
  hardware: z.array(HardwareSchema).min(1),
  hf_repo: z.string().nullable(),
  license: z.string().min(1),
  params: z.string().nullable(),
  languages: z.union([z.literal("multilingual"), z.array(z.string().min(2))]),
  description: z.string().min(1),
  features: z.array(z.string()).default([]),
  homepage: z.string().url().nullable()
});

export const RegistrySchema = z.object({
  version: z.number().int().positive(),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adapters: z.array(AdapterSchema)
});

export type Task = z.infer<typeof TaskSchema>;
export type Hardware = z.infer<typeof HardwareSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type Runtime = z.infer<typeof RuntimeSchema>;
export type Adapter = z.infer<typeof AdapterSchema>;
export type Registry = z.infer<typeof RegistrySchema>;
