
import cors from 'cors';
import express from "express";
import multer  from 'multer';
import { Queue } from "bullmq";
// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// Remove this:
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Add this:
import { ChatGroq } from "@langchain/groq";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { v4 as uuidv4 } from "uuid";
import 'dotenv/config';

import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

import { QdrantVectorStore } from "@langchain/qdrant";

const queue = new Queue("file-upload-queue" , {connection: {
  host: "localhost",
  port: 6379
}});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
    console.log(req.body)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `${uniqueSuffix}-${file.originalname}`)
  }
})
const upload = multer({ storage: storage })

const app = express();
app.use(cors());

app.post("/upload" , upload.single("pdf") , async (req,res) =>{
  const pdfId = uuidv4();
  await queue.add("file-ready", { 
    pdfId,
    filename: req.file.filename,
    type : req.file.mimetype,
    source : req.file.destination,
    path : req.file.path,
    size : req.file.size,

  });
  console.log(req.file.destination);
  return res.json({message :'uploading done.' , pdfId})
})

app.get("/chat", async (req, res) => {
  try {
    const userQuery = req.query.query;
    const pdfId = req.query.pdfId;

    if (!userQuery || !pdfId) {
      return res.status(400).json({ error: "query or pdfId missing" });
    }

    console.log("Query received:", userQuery);

    const collectionName = `pdf-${pdfId}`;

    const embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: "gemini-embedding-2-preview",
      apiKey: process.env.GOOGLE_API_KEY,
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: "http://localhost:6333",
        collectionName,
      }
    );

    const retriever = vectorStore.asRetriever({ k: 3 });

    const result = await retriever.invoke(userQuery);

    console.log("Results length:", result.length);
    

    if (!result || result.length === 0) {
      return res.json({
        answer: "No relevant context found in PDF",
        sources: [],
      });
    }

    const context = result.map(doc => doc.pageContent).join("\n");

    const systemMessage = new SystemMessage(
      `You are an assistant for question-answering tasks.
Use the context to answer.
If not found, say "Within the context of the PDF, I don't know".
Max 3 sentences.

Context:
${context}`
    );

    const llm = new ChatGroq({
      model: "llama-3.3-70b-versatile",  // or "gemma2-9b-it", "mixtral-8x7b-32768"
      apiKey: process.env.GROQ_API_KEY,
    });

    const response = await llm.invoke([
      systemMessage,
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
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});



app.listen(8000, () => {
  console.log("Server running on port 8000");
});