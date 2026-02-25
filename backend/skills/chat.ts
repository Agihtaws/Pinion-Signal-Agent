// skills/chat.ts

import type { Request, Response } from "express";
import type { ChatSkillData } from "../shared/types";

// ── Config ────────────────────────────────────────────────────────────────────

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "sU1AQGNMOauUO57PAXSUzfY8uPWMucPP";
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You are a professional crypto market analyst working for Pinion Signal Agent.
You analyze on-chain token price data and produce clear, concise market intelligence reports.
Your analysis is data-driven, objective, and actionable.
You always structure your response as:
1. Current trend assessment (one sentence)
2. Key price movement observations (two to three sentences)
3. Signal recommendation with reasoning (one to two sentences)
Keep your total response under 150 words.
Be direct and professional. No disclaimers, no fluff.`;

// ── Core Generate Function (Mistral) ──────────────────────────────────────────

export async function generateAnalysis(
  prompt: string,
  systemContext?: string
): Promise<string> {
  if (!MISTRAL_API_KEY) {
    throw new Error("MISTRAL_API_KEY environment variable is not set");
  }

  const fullPrompt = systemContext
    ? `${SYSTEM_PROMPT}\n\nAdditional context:\n${systemContext}\n\nUser request:\n${prompt}`
    : `${SYSTEM_PROMPT}\n\nUser request:\n${prompt}`;

  const response = await fetch(MISTRAL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model: "mistral-tiny",
      messages: [
        {
          role: "system",
          content: "You are a professional crypto market analyst. Follow the requested format exactly."
        },
        {
          role: "user",
          content: fullPrompt
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Mistral API error: ${err.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices[0]?.message?.content;

  if (!text) {
    throw new Error("Mistral returned empty response");
  }

  return text.trim();
}

// ── Market Analysis Generator (used by agent) ─────────────────────────────────

export interface PriceSnapshot {
  token: string;
  currentPrice: number;
  change1h: number;
  change6h: number;
  change24h: number;
  priceHistory: number[]; // last 10 prices oldest to newest
}

export async function generateMarketAnalysis(
  snapshot: PriceSnapshot
): Promise<{
  report: string;
  signal: "BUY" | "HOLD" | "SELL";
  confidence: number;
}> {
  const prompt = `
Analyze the following ${snapshot.token} price data and provide a market signal.

Current price: USD ${snapshot.currentPrice.toFixed(2)}
1-hour change: ${snapshot.change1h >= 0 ? "+" : ""}${snapshot.change1h.toFixed(2)}%
6-hour change: ${snapshot.change6h >= 0 ? "+" : ""}${snapshot.change6h.toFixed(2)}%
24-hour change: ${snapshot.change24h >= 0 ? "+" : ""}${snapshot.change24h.toFixed(2)}%
Recent price history (oldest to newest): ${snapshot.priceHistory.map((p) => "USD " + p.toFixed(2)).join(", ")}

Format your response exactly like this:
REPORT:
[your analysis here]
SIGNAL: BUY
CONFIDENCE: 75
`;

  const raw = await generateAnalysis(prompt);

  // Parse structured response - Updated regex to handle markdown/bolding from Mistral
  const reportMatch = raw.match(/REPORT:\s*([\s\S]*?)(?=\**SIGNAL:|$)/i);
  const signalMatch = raw.match(/SIGNAL:\s*\**\s*(BUY|HOLD|SELL)/i);
  const confidenceMatch = raw.match(/CONFIDENCE:\s*\**\s*(\d+)/i);

  const report = reportMatch
    ? reportMatch[1].replace(/\*\*/g, '').trim() // Strip bolding from report
    : raw.trim();

  const signalRaw = signalMatch ? signalMatch[1].toUpperCase().trim() : "HOLD";
  const signal = (["BUY", "HOLD", "SELL"].includes(signalRaw)
    ? signalRaw
    : "HOLD") as "BUY" | "HOLD" | "SELL";

  const confidenceRaw = confidenceMatch
    ? parseInt(confidenceMatch[1], 10)
    : 50;
  const confidence = Math.min(100, Math.max(0, confidenceRaw));

  console.log(
    `[chat] ${snapshot.token} analysis done via Mistral — signal: ${signal} confidence: ${confidence}%`
  );

  return { report, signal, confidence };
}

// ── HTTP Handler ──────────────────────────────────────────────────────────────

export async function chatHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        error: "messages array is required",
      });
      return;
    }

    const conversationPrompt = messages
      .map((m: { role: string; content: string }) => {
        const roleLabel = m.role === "assistant" ? "Assistant" : "User";
        return `${roleLabel}: ${m.content}`;
      })
      .join("\n");

    const responseText = await generateAnalysis(
      conversationPrompt,
      context || undefined
    );

    const response: ChatSkillData = {
      response: responseText,
    };

    res.json(response);
  } catch (err: any) {
    console.error("[chat] error:", err.message);
    res.status(500).json({
      error: "failed to generate response",
      details: err.message,
    });
  }
}
