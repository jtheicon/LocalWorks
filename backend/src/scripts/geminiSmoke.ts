import { GoogleGenAI } from "@google/genai";

const models = [
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
];

const run = async () => {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  for (const model of models) {
    try {
      const r = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: 'Return JSON: {"ok":true}' }] }],
        config: { responseMimeType: "application/json", maxOutputTokens: 32 },
      });
      console.log(`${model}: OK ${(r.text ?? "").slice(0, 60)}`);
    } catch (e: unknown) {
      const status = e && typeof e === "object" && "status" in e ? (e as { status: number }).status : "?";
      console.log(`${model}: FAIL ${status}`);
    }
  }
};

run();
