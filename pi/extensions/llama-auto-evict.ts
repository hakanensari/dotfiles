/**
 * Llama Auto-Evict Extension for Pi.
 *
 * When switching models in Pi, immediately unloads the previous _local model
 * from llama-server (port 8080) so unified memory is instantly freed
 * without waiting for the 5-minute idle timeout.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const LLAMA_SERVER_UNLOAD_URL = "http://127.0.0.1:8080/models/unload";

async function unloadLocalModel(modelId: string): Promise<boolean> {
  try {
    const res = await fetch(LLAMA_SERVER_UNLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelId }),
    });
    return res.ok;
  } catch {
    // llama-server not running or unreachable; fail silently
    return false;
  }
}

export default function llamaAutoEvict(pi: ExtensionAPI) {
  pi.on("model_select", async (event) => {
    const prev = event.previousModel;
    const current = event.model;

    // Only evict if switching away from a local model to a different model
    if (prev && prev.provider === "_local" && prev.id !== current?.id) {
      await unloadLocalModel(prev.id);
    }
  });
}
