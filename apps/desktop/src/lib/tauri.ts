import { invoke } from "@tauri-apps/api/core";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function startEngine(): Promise<string> {
  return invoke<string>("start_engine");
}

export async function stopEngine(): Promise<string> {
  return invoke<string>("stop_engine");
}
