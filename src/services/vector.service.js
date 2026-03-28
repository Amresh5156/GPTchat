const { Pinecone } = require("@pinecone-database/pinecone");

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pc.index({ name: "chat-gpt-project" });

async function createMemory({ vector, metadata, messageId }) {
  if (!vector || vector.length === 0) {
    throw new Error("Vector empty");
  }

  await index.upsert({
    records: [
      {
        id: String(messageId),
        values: vector,
        metadata,
      },
    ],
  });
}

async function queryMemory({ queryVector, limit = 5, metadata }) {
  const data = await index.query({
    vector: queryVector,
    topK: limit,
    filter: metadata || undefined,
    includeMetadata: true,
  });

  return data.matches;
}

module.exports = { createMemory, queryMemory };
