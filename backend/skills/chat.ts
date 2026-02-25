// skills/chat.ts

import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import type { ChatSkillData } from "../shared/types";

// ── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional crypto market analyst working for Pinion Signal Agent.
You analyze on-chain token price data and produce clear, concise market intelligence reports.
Your analysis is data-driven, objective, and actionable.
You always structure your response as:
1. Current trend assessment (one sentence)
2. Key price movement observations (two to three sentences)
3. Signal recommendation with reasoning (one to two sentences)
Keep your total response under 150 words.
Be direct and professional. No disclaimers, no fluff.`;

// ── Gemini Client ─────────────────────────────────────────────────────────────

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey });
}

// ── Core Generate Function ────────────────────────────────────────────────────

export async function generateAnalysis(
  prompt: string,
  systemContext?: string
): Promise<string> {
  const ai = getGeminiClient();

  const fullPrompt = systemContext
    ? `${SYSTEM_PROMPT}\n\nAdditional context:\n${systemContext}\n\nUser request:\n${prompt}`
    : `${SYSTEM_PROMPT}\n\nUser request:\n${prompt}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: fullPrompt,
  });

  const text = response.text;

  if (!text) {
    throw new Error("Gemini returned empty response");
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

Current price: $${snapshot.currentPrice.toFixed(2)}
1-hour change: ${snapshot.change1h >= 0 ? "+" : ""}${snapshot.change1h.toFixed(2)}%
6-hour change: ${snapshot.change6h >= 0 ? "+" : ""}${snapshot.change6h.toFixed(2)}%
24-hour change: ${snapshot.change24h >= 0 ? "+" : ""}${snapshot.change24h.toFixed(2)}%
Recent price history (oldest to newest): ${snapshot.priceHistory.map((p) => "$" + p.toFixed(2)).join(", ")}

Based on this data, provide:
1. Your market analysis report (follow the system format)
2. Signal: respond with exactly one word on its own line: BUY, HOLD, or SELL
3. Confidence: respond with a number from 0 to 100 on its own line

Format your response exactly like this:
REPORT:
[your analysis here]
SIGNAL: BUY
CONFIDENCE: 75
`;

  const raw = await generateAnalysis(prompt);

  // parse structured response
  const reportMatch = raw.match(/REPORT:\s*([\s\S]*?)(?=SIGNAL:|$)/);
  const signalMatch = raw.match(/SIGNAL:\s*(BUY|HOLD|SELL)/);
  const confidenceMatch = raw.match(/CONFIDENCE:\s*(\d+)/);

  const report = reportMatch
    ? reportMatch[1].trim()
    : raw.trim();

  const signalRaw = signalMatch ? signalMatch[1].trim() : "HOLD";
  const signal = ["BUY", "HOLD", "SELL"].includes(signalRaw)
    ? (signalRaw as "BUY" | "HOLD" | "SELL")
    : "HOLD";

  const confidenceRaw = confidenceMatch
    ? parseInt(confidenceMatch[1], 10)
    : 50;
  const confidence = Math.min(100, Math.max(0, confidenceRaw));

  console.log(
    `[chat] ${snapshot.token} analysis done — signal: ${signal} confidence: ${confidence}%`
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
        example: {
          messages: [{ role: "user", content: "What is the outlook for ETH?" }],
        },
      });
      return;
    }

    // build prompt from message history
    const conversationPrompt = messages
      .map((m: { role: string; content: string }) => {
        const roleLabel = m.role === "assistant" ? "Assistant" : "User";
        return `${roleLabel}: ${m.content}`;
      })
      .join("\n");

    console.log(
      `[chat] processing ${messages.length} message(s) from request`
    );

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

    if (err.message?.includes("GEMINI_API_KEY")) {
      res.status(503).json({
        error: "chat skill not configured",
        note: "GEMINI_API_KEY environment variable is not set",
      });
      return;
    }

    if (err.message?.includes("quota") || err.message?.includes("429")) {
      res.status(429).json({
        error: "Gemini API rate limit reached",
        note: "Please wait a moment and try again",
      });
      return;
    }

    res.status(500).json({
      error: "failed to generate response",
      details: err.message,
    });
  }
}