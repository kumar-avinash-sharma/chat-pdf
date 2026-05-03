import { Worker } from "bullmq";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import "dotenv/config";

console.log("🚀 Worker started...");

const worker = new Worker(
  "file-upload-queue",
  async (job) => {
    try {
      console.log("\n📄 Job received:", job.id);
      console.log("File path:", job.data.path);

      // =========================
      // 1. LOAD PDF
      // =========================
      const loader = new PDFLoader(job.data.path);
      const docs = await loader.load();

      if (!docs || docs.length === 0) {
        throw new Error("❌ No text extracted from PDF");
      }

      console.log("✅ PDF loaded");
      console.log("Pages:", docs.length);
      console.log("Sample text:", docs[0].pageContent.slice(0, 150));

      // =========================
      // 2. SPLIT INTO CHUNKS
      // =========================
      const splitter = new CharacterTextSplitter({
        chunkSize: 800,
        chunkOverlap: 100,
      });

      const chunkedDocs = await splitter.splitDocuments(docs);

      if (!chunkedDocs || chunkedDocs.length === 0) {
        throw new Error("❌ Chunking failed (0 chunks)");
      }

      console.log("✅ Chunking done");
      console.log("Chunks created:", chunkedDocs.length);

      // =========================
      // 3. CREATE EMBEDDINGS
      // =========================
      const embeddings = new GoogleGenerativeAIEmbeddings({
       modelName: "gemini-embedding-2-preview",
        apiKey: process.env.GOOGLE_API_KEY,
      });

      // Test embedding (important)
      const testVector = await embeddings.embedQuery("test");
      console.log("✅ Embeddings working, vector size:", testVector.length);

      // =========================
      // 4. STORE IN QDRANT
      // =========================
      const collectionName = `pdf-${job.data.pdfId}`;

      console.log("📦 Storing in Qdrant...");
      console.log("Collection:", collectionName);

      await QdrantVectorStore.fromDocuments(
        chunkedDocs,
        embeddings,
        {
          url: "http://localhost:6333",
          collectionName: collectionName,
        }
      );

      console.log("✅ Documents stored successfully in Qdrant");

    } catch (error) {
      console.error("❌ Worker Error:");
      console.error(error);
    }
  },
  {
    concurrency: 2,
    connection: {
      host: "localhost",
      port: 6379,
      
    },
    lockduration : 5 * 60 * 1000,
  }
);

// =========================
// GLOBAL ERROR HANDLING
// =========================
worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed`);
  console.error(err);
});