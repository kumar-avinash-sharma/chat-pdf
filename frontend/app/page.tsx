"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function PDFChat() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pdfId, setPdfId] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");

    setMessages(prev => [
      ...prev,
      { role: "user", text: userMessage }
    ]);

    setLoading(true);

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`,
        {
          params: {
            query: userMessage,
            pdfId: pdfId,
          },
        }
      );

      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          text: res.data.answer,
          sources: res.data.sources
        }
      ]);

    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          text: "Sorry, something went wrong. Please try again.",
          error: true
        }
      ]);
      console.error(err);
    }

    setLoading(false);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus("");
      setUploadProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("pdf", file);

    setUploading(true);
    setStatus("Uploading...");
    setUploadProgress(30);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setUploadProgress(100);
      setPdfId(response.data.pdfId);
      setMessages([]);
      setStatus(response.data.message);
      setFile(null);
      setPdfUploaded(true);
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setStatus("Upload failed. Try again.");
      setUploadProgress(0);
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto h-screen flex flex-col">

        {/* HEADER */}
        <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                PDF Chat Assistant
              </h1>
              <p className="text-sm text-slate-400 mt-1">Ask questions about your documents</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
              <span className="text-xs font-medium text-cyan-300">Active</span>
            </div>
          </div>
        </header>

        <div className="flex flex-1 gap-6 overflow-hidden p-6">

          {/* CHAT SECTION */}
          <div className="flex-1 flex flex-col min-w-0">

            {/* Messages Container */}
            {messages.length === 0 && pdfUploaded ? (
              <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 scrollbar-hide">
                <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                  <div>
                    <h3 className="text-lg font-bold text-cyan-400 mb-2">📚 Welcome to PDF Chat Assistant</h3>
                    <p>You've successfully uploaded your PDF! Now you can ask questions about its contents and get instant answers with source references.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-cyan-300 mb-2">🎯 What You Can Do:</h4>
                    <ul className="space-y-1 list-disc list-inside text-slate-400">
                      <li>Ask questions about specific content in your PDF</li>
                      <li>Get answers with exact page references and excerpts</li>
                      <li>Search for key information quickly</li>
                      <li>Extract and summarize document content</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-cyan-300 mb-2">💡 Example Questions:</h4>
                    <div className="bg-slate-700/30 rounded-lg p-3 space-y-1 text-slate-400 text-xs">
                      <p>"What is the main topic of this document?"</p>
                      <p>"Summarize the key points from page 3"</p>
                      <p>"What does it say about [specific topic]?"</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-cyan-300 mb-2">✨ Features:</h4>
                    <ul className="space-y-1 list-disc list-inside text-slate-400">
                      <li>Instant answers powered by AI</li>
                      <li>Source tracking with page numbers</li>
                      <li>Easy to read conversation history</li>
                      <li>Upload multiple PDFs anytime</li>
                    </ul>
                  </div>
                  <div className="border-t border-slate-600/50 pt-3">
                    <p className="text-slate-500 text-xs">👉 Start by typing a question in the input field below!</p>
                  </div>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-slate-400 text-lg">Upload a PDF to get started</p>
                  <p className="text-slate-500 text-sm mt-2">Ask questions and get instant answers</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 scrollbar-hide">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-br-none shadow-lg"
                          : msg.error
                          ? "bg-red-500/20 border border-red-500/50 text-red-200 rounded-bl-none"
                          : "bg-slate-700/50 border border-slate-600/50 text-slate-200 rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.text}</p>

                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-600/30 space-y-2">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sources</p>
                          {msg.sources.map((s, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-slate-600/30 rounded px-2 py-1 text-slate-300"
                            >
                              <span className="font-medium text-cyan-300">Page {s.page}</span>
                              <p className="mt-1 line-clamp-2">{s.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700/50 border border-slate-600/50 px-4 py-3 rounded-2xl rounded-bl-none">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></div>
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input Area */}
            {pdfUploaded ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question about your document..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  Send
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-700/30 border border-slate-600/50 text-center text-slate-400 text-sm">
                📋 Upload a PDF first to start asking questions
              </div>
            )}
          </div>

          {/* SIDEBAR - FILE UPLOAD */}
          <div className="w-80 flex flex-col gap-4">
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-bold text-white mb-2">Upload PDF</h2>
              <p className="text-xs text-slate-400 mb-4">Add documents to your knowledge base</p>

              <div
                className="relative"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("ring-2", "ring-cyan-500/50", "bg-cyan-500/5");
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove("ring-2", "ring-cyan-500/50", "bg-cyan-500/5");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("ring-2", "ring-cyan-500/50", "bg-cyan-500/5");
                  const droppedFile = e.dataTransfer.files[0];
                  if (droppedFile?.type === "application/pdf") {
                    setFile(droppedFile);
                  }
                }}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="border-2 border-dashed border-slate-500/50 rounded-xl p-6 text-center hover:border-cyan-500/50 transition-colors">
                  <div className="text-3xl mb-2">📁</div>
                  {file ? (
                    <div>
                      <p className="text-sm font-medium text-cyan-300 truncate">{file.name}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-slate-300">Drag PDF here</p>
                      <p className="text-xs text-slate-500 mt-1">or click to browse</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {uploading ? "Processing..." : "Upload & Process"}
              </button>

              {/* Progress Bar */}
              {uploading && (
                <div className="mt-3">
                  <div className="w-full h-1 bg-slate-600/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Processing your PDF, please wait...</p>
                </div>
              )}

              {/* Status Messages */}
              {status && !uploading && (
                <div
                  className={`mt-4 p-3 rounded-lg text-sm ${
                    status.includes("failed")
                      ? "bg-red-500/20 border border-red-500/30 text-red-200"
                      : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-200"
                  }`}
                >
                  {status}
                </div>
              )}

              {/* Document Requirements */}
              <div className="mt-6 p-4 rounded-lg bg-slate-600/20 border border-slate-600/30 space-y-3">
                <p className="text-xs text-slate-400 font-semibold uppercase">Document Requirements</p>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex gap-2">
                    <span className="text-lg">✓</span>
                    <p><span className="font-medium text-cyan-300">Text-based PDFs</span> - Not scanned or image-based</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-lg">✓</span>
                    <p><span className="font-medium text-cyan-300">Clear, readable text</span> - Ensure good quality and legibility</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-lg">📄</span>
                    <p><span className="font-medium text-slate-400">Up to 50MB size</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes slide-in-from-bottom-2 {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}