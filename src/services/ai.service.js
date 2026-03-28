const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateResponse(content) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: content,
  });
  return response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function generateVector(text) {
  const inputText = String(text ?? "").trim();

  if (!inputText) {
    console.log("⚠️ Empty text for embedding");
    return null; // important
  }

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: inputText,
    config: { outputDimensionality: 768 }
  });

  return response.embeddings[0].values;
}


module.exports = { generateResponse, generateVector};