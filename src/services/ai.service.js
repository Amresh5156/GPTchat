const { GoogleGenAI } = require("@google/genai");
const { GEMINI_API_KEY } = process.env;

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({});

async function generateContent(message) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: message,
  });
    return response.text;
}

module.exports = generateContent;