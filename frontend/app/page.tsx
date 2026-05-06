"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";

type Source = {
  page: number;
  content: string;
};

type Message = {
  role: "user" | "ai";
  text: string;
  sources?: Source[];
  error?: boolean;
};

export default function PDFChat() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [pdfUploaded, setPdfUploaded] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pdfId, setPdfId] = useState<string | null>(null);

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

    setMessages((prev: Message[]) => [
      ...prev,
      { role: "user", text: userMessage },
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

      setMessages((prev: Message[]) => [
        ...prev,
        {
          role: "ai",
          text: res.data.answer,
          sources: res.data.sources,
        },
      ]);
    } catch (err) {
      setMessages((prev: Message[]) => [
        ...prev,
        {
          role: "ai",
          text: "Sorry, something went wrong. Please try again.",
          error: true,
        },
      ]);
      console.error(err);
    }

    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setShowSidebar(false);
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setStatus("Upload failed. Try again.");
      setUploadProgress(0);
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add("ring-2", "ring-cyan-500/50", "bg-cyan-500/5");
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove("ring-2", "ring-cyan-500/50", "bg-cyan-500/5");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove("ring-2", "ring-cyan-500/50", "bg-cyan-500/5");
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto h-screen flex flex-col">
        {/* HEADER */}
        <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent truncate">
                PDF Chat Assistant
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 hidden sm:block">
                Ask questions about your documents
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Status badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                <span className="text-xs font-medium text-cyan-300">Active</span>
              </div>

              {/* Mobile upload toggle */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-300 text-xs font-medium min-h-[40px]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {pdfUploaded ? "Re-upload" : "Upload"}
              </button>
            </div>
          </div>
        </header>

        {/* MOBILE SIDEBAR DRAWER */}
        {showSidebar && (
          <div className="lg:hidden flex-shrink-0 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
            <div className="p-4">
              <UploadPanel
                file={file}
                uploading={uploading}
                uploadProgress={uploadProgress}
                status={status}
                onFileChange={handleFileChange}
                onUpload={handleUpload}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        <div className="flex flex-1 gap-6 overflow-hidden p-3 sm:p-6">
          {/* CHAT SECTION */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Messages Container */}
            {messages.length === 0 && pdfUploaded ? (
              <div className="flex-1 overflow-y-auto mb-3 sm:mb-4 space-y-4 pr-1 sm:pr-2 scrollbar-hide">
                <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-cyan-400 mb-2">
                      📚 Welcome to PDF Chat Assistant
                    </h3>
                    <p>
                      You&apos;ve successfully uploaded your PDF! Now you can
                      ask questions about its contents and get instant answers
                      with source references.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-cyan-300 mb-2">
                      🎯 What You Can Do:
                    </h4>
                    <ul className="space-y-1 list-disc list-inside text-slate-400 text-xs sm:text-sm">
                      <li>Ask questions about specific content in your PDF</li>
                      <li>Get answers with exact page references and excerpts</li>
                      <li>Search for key information quickly</li>
                      <li>Extract and summarize document content</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-cyan-300 mb-2">
                      💡 Example Questions:
                    </h4>
                    <div className="bg-slate-700/30 rounded-lg p-3 space-y-1.5 text-slate-400 text-xs">
                      <p>&quot;What is the main topic of this document?&quot;</p>
                      <p>&quot;Summarize the key points from page 3&quot;</p>
                      <p>&quot;What does it say about [specific topic]?&quot;</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-600/50 pt-3">
                    <p className="text-slate-500 text-xs">
                      👉 Start by typing a question in the input field below!
                    </p>
                  </div>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center px-4">
                <div>
                  <div className="text-5xl sm:text-6xl mb-4">📄</div>
                  <p className="text-slate-400 text-base sm:text-lg">
                    Upload a PDF to get started
                  </p>
                  <p className="text-slate-500 text-sm mt-2">
                    Ask questions and get instant answers
                  </p>
                  {/* Mobile CTA */}
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="lg:hidden mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm"
                  >
                    Upload PDF
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto mb-3 sm:mb-4 space-y-3 sm:space-y-4 pr-1 sm:pr-2 scrollbar-hide">
                {messages.map((msg: Message, i: number) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-br-none shadow-lg"
                          : msg.error
                          ? "bg-red-500/20 border border-red-500/50 text-red-200 rounded-bl-none"
                          : "bg-slate-700/50 border border-slate-600/50 text-slate-200 rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.text}</p>

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-600/30 space-y-2">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Sources
                          </p>
                          {msg.sources.map((s: Source, idx: number) => (
                            <div
                              key={idx}
                              className="text-xs bg-slate-600/30 rounded px-2 py-1.5 text-slate-300"
                            >
                              <span className="font-medium text-cyan-300">
                                Page {s.page}
                              </span>
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
              <div className="flex gap-2 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Ask about your document..."
                  value={input}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                    e.key === "Enter" && !e.shiftKey && sendMessage()
                  }
                  disabled={loading}
                  className="flex-1 min-w-0 px-3 sm:px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="px-4 sm:px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0 min-w-[60px] sm:min-w-[80px]"
                >
                  Send
                </button>
              </div>
            ) : (
              <div className="p-3 sm:p-4 rounded-xl bg-slate-700/30 border border-slate-600/50 text-center text-slate-400 text-xs sm:text-sm flex-shrink-0">
                📋 Upload a PDF first to start asking questions
              </div>
            )}
          </div>

          {/* DESKTOP SIDEBAR */}
          <div className="hidden lg:flex w-80 flex-col gap-4 flex-shrink-0">
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-bold text-white mb-2">Upload PDF</h2>
              <p className="text-xs text-slate-400 mb-4">
                Add documents to your knowledge base
              </p>
              <UploadPanel
                file={file}
                uploading={uploading}
                uploadProgress={uploadProgress}
                status={status}
                onFileChange={handleFileChange}
                onUpload={handleUpload}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />

              {/* Document Requirements */}
              <div className="mt-6 p-4 rounded-lg bg-slate-600/20 border border-slate-600/30 space-y-3">
                <p className="text-xs text-slate-400 font-semibold uppercase">
                  Document Requirements
                </p>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex gap-2">
                    <span>✓</span>
                    <p>
                      <span className="font-medium text-cyan-300">Text-based PDFs</span>{" "}
                      — Not scanned or image-based
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span>✓</span>
                    <p>
                      <span className="font-medium text-cyan-300">Clear, readable text</span>{" "}
                      — Good quality and legibility
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span>📄</span>
                    <p>
                      <span className="font-medium text-slate-400">Up to 50MB size</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

/* ─── Shared Upload Panel ─────────────────────────────── */
function UploadPanel({
  file,
  uploading,
  uploadProgress,
  status,
  onFileChange,
  onUpload,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  file: File | null;
  uploading: boolean;
  uploadProgress: number;
  status: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <>
      <div className="relative" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        <input
          type="file"
          accept="application/pdf"
          onChange={onFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="border-2 border-dashed border-slate-500/50 rounded-xl p-5 text-center hover:border-cyan-500/50 transition-colors">
          <div className="text-2xl mb-2">📁</div>
          {file ? (
            <div>
              <p className="text-sm font-medium text-cyan-300 truncate px-2">{file.name}</p>
              <p className="text-xs text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-slate-300">Drag PDF here</p>
              <p className="text-xs text-slate-500 mt-1">or tap to browse</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onUpload}
        disabled={!file || uploading}
        className="w-full mt-3 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 min-h-[44px]"
      >
        {uploading ? "Processing..." : "Upload & Process"}
      </button>

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

      {status && !uploading && (
        <div
          className={`mt-3 p-3 rounded-lg text-xs sm:text-sm ${
            status.includes("failed")
              ? "bg-red-500/20 border border-red-500/30 text-red-200"
              : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-200"
          }`}
        >
          {status}
        </div>
      )}
    </>
  );
}