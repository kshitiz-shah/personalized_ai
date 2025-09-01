// api.js
import express from "express";
import cors from "cors";
import multer from "multer";
import pdfParse from "pdf-parse";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";
dotenv.config();

// import your functions (make sure you export them)
import { indexDocument } from "./index.js";   // will accept (pdfText, sessionId)
import { queryDocument } from "./query.js";   // will accept (question, sessionId)

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

// Upload endpoint: extract text and pass to your index function
app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const sessionId = uuidv4(); // unique namespace for Pinecone
    const data = await pdfParse(req.file.buffer);
    const text = data.text || "";

    // call your indexing function (adapt indexDocument to accept sessionId)
    await indexDocument({ pdfText: text, sessionId });

    res.json({ sessionId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to index PDF" });
  }
});

// Ask endpoint: call your retriever+LLM
app.post("/ask", async (req, res) => {
  try {
    const { sessionId, question } = req.body;
    if (!sessionId || !question) return res.status(400).json({ error: "sessionId and question required" });

    const answer = await queryDocument({ question, sessionId });
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to answer question" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
