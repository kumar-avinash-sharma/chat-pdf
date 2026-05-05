import cors from 'cors';
import express from "express";
import multer from 'multer';
import { ChatGroq } from "@langchain/groq";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { v4 as uuidv4 } from "uuid";
import 'dotenv/config';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// ─── UPLOAD + PROCESS ───────────────────────────────────────────────────────
app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    const pdfId = uuidv4();

    // 1. Load PDF
    const loader = new PDFLoader(req.file.path);
    const docs = await loader.load();
    if (!docs || docs.length === 0) throw new Error("No text extracted from PDF");
    console.log("✅ PDF loaded, pages:", docs.length);

    // 2. Split into chunks
    const splitter = new CharacterTextSplitter({ chunkSize: 800, chunkOverlap: 100 });
    const chunkedDocs = await splitter.splitDocuments(docs);
    if (!chunkedDocs || chunkedDocs.length === 0) throw new Error("Chunking failed");
    console.log("✅ Chunks created:", chunkedDocs.length);

    // 3. Embed + store in Qdrant
    const embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: "gemini-embedding-2-preview",
      apiKey: process.env.GOOGLE_API_KEY,
    });

    const collectionName = `pdf-${pdfId}`;
    await QdrantVectorStore.fromDocuments(chunkedDocs, embeddings, {
      url: "http://localhost:6333",
      collectionName,
    });
    console.log("✅ Stored in Qdrant:", collectionName);

    return res.json({ message: "Upload and processing done.", pdfId });

  } catch (err) {
    console.error("❌ Upload error:", err);
    return res.status(500).json({ error: "Failed to process PDF" });
  }
});

// ─── CHAT ────────────────────────────────────────────────────────────────────
app.get("/chat", async (req, res) => {
  try {
    const { query: userQuery, pdfId } = req.query;
    if (!userQuery || !pdfId) return res.status(400).json({ error: "query or pdfId missing" });

    const embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: "gemini-embedding-2-preview",
      apiKey: process.env.GOOGLE_API_KEY,
    });

    // 1. Retrieve relevant chunks
    const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: `pdf-${pdfId}`,
    });

    const result = await vectorStore.asRetriever({ k: 3 }).invoke(userQuery);
    if (!result || result.length === 0) {
      return res.json({ answer: "No relevant context found in PDF", sources: [] });
    }

    // 2. Build prompt + call Groq
    const context = result.map(doc => doc.pageContent).join("\n");

    const llm = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      apiKey: process.env.GROQ_API_KEY,
    });


    const response = await llm.invoke([
      new SystemMessage(
        `You are a helpful assistant that answers questions strictly based on the provided PDF context.
    
    - If the user sends greetings like "hey", "hello", "hi" — respond warmly and ask what they'd like to know about the document.
    - If the question cannot be answered from the context, say "I couldn't find that in the PDF."
    - Keep answers to 3 sentences max.
    - Never make up information not present in the context.

Context:
${context}`
      ),
      new HumanMessage(userQuery),
    ]);

    return res.json({
      answer: response.content,
      sources: result.map(doc => ({
        page: doc.metadata?.loc?.pageNumber,
        content: doc.pageContent.slice(0, 200),
      })),
    });

  } catch (err) {
    console.error("❌ Chat error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));