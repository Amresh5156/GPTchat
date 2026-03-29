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
  const query = {
    vector: queryVector,
    topK: limit,
    includeMetadata: true,
  };
  // Pinecone rejects `filter: {}`; omit the key unless there is at least one condition.
  if (metadata && typeof metadata === "object" && Object.keys(metadata).length > 0) {
    query.filter = metadata;
  }

  const data = await index.query(query);

  return data.matches;
}

module.exports = { createMemory, queryMemory };
