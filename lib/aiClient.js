// ============================================================
//  lib/aiClient.js — provider-agnostic chat client
//  Swap providers here without touching the route or the page.
//  Today: Anthropic. Tomorrow: OpenAI, or Vercel AI Gateway
//  (one endpoint, model as a "provider/model" string).
//
//  Select via env AI_PROVIDER (default "anthropic").
//  generateReply({ system, messages, model, maxTokens }) -> string
//  Throws AiError with .code: "not_configured" | "upstream" | "empty" | "bad_provider"
// ============================================================

class AiError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = "AiError";
    this.code = code;
  }
}

async function anthropicGenerate({ system, messages, model, maxTokens }) {
  var key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("not_configured", "Missing ANTHROPIC_API_KEY");

  // Cache the (constant) system prompt: ~90% cheaper on cache reads + lower
  // latency across a multi-turn chat. Prompt caching is GA — no beta header.
  // Sonnet min is 1,024 tokens; our prompt clears it. (Haiku min is 4,096 —
  // if you switch CONCIERGE_MODEL to a Haiku, caching is silently skipped.)
  var systemBlocks = typeof system === "string"
    ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }]
    : system;

  var res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: model, max_tokens: maxTokens, system: systemBlocks, messages: messages }),
  });

  if (!res.ok) {
    var detail = await res.text().catch(function () { return ""; });
    throw new AiError("upstream", "Anthropic " + res.status + " " + detail.slice(0, 300));
  }

  var data = await res.json();
  // Surfaces cache_creation_input_tokens / cache_read_input_tokens in Vercel logs
  // so you can confirm caching is working (cache_read > 0 on turn 2+).
  if (data.usage) console.log("[concierge] usage:", JSON.stringify(data.usage));
  var text = Array.isArray(data.content)
    ? data.content.filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("").trim()
    : "";
  if (!text) throw new AiError("empty", "Empty model response");
  return text;
}

// Register additional providers here as you add them.
var PROVIDERS = {
  anthropic: anthropicGenerate,
  // openai: openaiGenerate,
  // gateway: gatewayGenerate,
};

async function generateReply(opts) {
  var provider = process.env.AI_PROVIDER || "anthropic";
  var impl = PROVIDERS[provider];
  if (!impl) throw new AiError("bad_provider", "Unknown AI_PROVIDER: " + provider);
  return impl(opts);
}

module.exports = { generateReply: generateReply, AiError: AiError };
