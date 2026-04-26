import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Check plan — script gen requires Reaper+
  const { data: userData } = await supabase
    .from("users").select("plan_tier").eq("id", user.id).single();
  if (userData?.plan_tier === "basic") {
    return new Response("Script generation requires Reaper or Agency plan.", { status: 403 });
  }

  const { prodName, length, hookStyle, niche, tone, keyPoint } =
    await request.json() as {
      prodName: string;
      length: string;
      hookStyle: string;
      niche: string;
      tone: string;
      keyPoint: string;
    };

  const systemPrompt = `You are a TikTok Shop creator coach who writes viral product scripts. You understand TikTok's algorithm, creator culture, and what actually converts.

You write scripts that:
- Hook in the first 1.5 seconds
- Feel authentic, not salesy
- Use conversational language, not marketing copy
- Include specific timing for each beat
- Have clear B-roll shot directions
- End with a strong CTA that doesn't feel forced

ALWAYS respond with valid JSON only. No markdown, no preamble, no explanation. Just the JSON object.`;

  const userPrompt = `Write a TikTok Shop affiliate script with these parameters:
- Product: ${prodName}
- Video length: ${length}
- Hook style: ${hookStyle}
- Niche: ${niche}
- Tone: ${tone}
- Key selling point: ${keyPoint}

Return this exact JSON structure:
{
  "beats": [
    { "time": "0:00 – 0:03", "text": "spoken words", "note": "direction for creator" },
    ...more beats based on video length...
  ],
  "broll": [
    { "shot": "shot name", "note": "specific direction" },
    ...5 b-roll shots...
  ],
  "caption": "full TikTok caption with hashtags"
}

Rules:
- beats should feel like real speech, not marketing copy
- timing should add up to the specified video length
- broll notes should be ultra-specific and actionable
- caption should be punchy, include 8-10 hashtags, feel authentic
- DO NOT include any text outside the JSON object`;

  const stream = new ReadableStream({
    async start(controller) {
      const streamResp = await anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      for await (const event of streamResp) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(new TextEncoder().encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
