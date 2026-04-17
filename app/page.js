"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import RhythmTrainer from "@/components/RhythmTrainer";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [lesson, setLesson] = useState(null);
  const [reflection, setReflection] = useState("");
  const [struggledWith, setStruggledWith] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentLessonId, setCurrentLessonId] = useState(null);

  const chatEndRef = useRef(null);

  const appendMessage = (role, content) => {
    if (typeof content !== "string" || !content.trim()) return;
    setMessages((prev) => [...prev, { role, content }]);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("messages");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        );
        setMessages(cleaned);
      }
    } catch {
      localStorage.removeItem("messages");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("messages", JSON.stringify(messages));
  }, [messages]);

  const sendMessage = async () => {
    if (loading) return;
    if (typeof input !== "string" || !input.trim()) return;

    const trimmed = input.trim();
    const newMessages = [...messages, { role: "user", content: trimmed }];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      if (!res.ok) {
        appendMessage("assistant", `Error: ${data.error || "Request failed"}`);
        return;
      }

      appendMessage("assistant", data.reply || "No reply received.");
    } catch (error) {
      appendMessage("assistant", `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getLesson = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/lesson", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        appendMessage("assistant", `Error: ${data.error || "Lesson failed"}`);
        return;
      }

      setLesson(data);
      setCurrentLessonId(data.lessonId ?? null);

      appendMessage("assistant", "--- NEW LESSON ---");
      appendMessage("assistant", data.lessonText || "No lesson returned.");
    } catch (error) {
      appendMessage("assistant", `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const completeLesson = async (feltEasy) => {
  if (!lesson || typeof lesson.lessonId !== "number") {
    console.error("Invalid lesson state:", lesson);
    return;
  }
    setLoading(true);

    try {
      const res = await fetch("/api/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId: lesson.lessonId,
          reflection,
          feltEasy,
          struggledWith,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        appendMessage("assistant", `Error: ${data.error || "Completion failed"}`);
        return;
      }

      appendMessage(
        "assistant",
        `Lesson saved. Next lesson is #${data.nextLesson}.`
      );

      setCurrentLessonId(data.nextLesson ?? currentLessonId);
      setReflection("");
      setStruggledWith("");
      setLesson(null);
    } catch (error) {
      appendMessage("assistant", `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem("messages");
  };

  return (
    <main
      style={{
        padding: 20,
        maxWidth: 1000,
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          marginBottom: 10,
          color: "#000",
          WebkitTextStroke: "0.5px white",
          textShadow: "0 0 10px rgba(255,255,255,0.3)",
          fontWeight: "bold",
        }}
      >
        🎛 S U N V O X | C O A C H
      </h1>

      {currentLessonId && (
        <p style={{ textAlign: "center", color: "#aaa", marginBottom: 14 }}>
          Lesson #{currentLessonId}
        </p>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button
          onClick={getLesson}
          disabled={loading}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "none",
            background: "#0070f3",
            color: "white",
            cursor: loading ? "default" : "pointer",
            fontWeight: "bold",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Loading..." : "Get Today’s Lesson"}
        </button>

        <button
          onClick={clearChat}
          disabled={loading}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "none",
            background: "#444",
            color: "white",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Clear Chat
        </button>
      </div>

      <div
        style={{
          minHeight: 420,
          padding: 20,
          marginBottom: 20,
          borderRadius: 16,
          overflowY: "auto",
          background: "rgba(10, 10, 10, 0.75)",
          backdropFilter: "blur(12px)",
          border: "1px solid #222",
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#ddd", lineHeight: 1.6 }}>
            Start your training session.
          </p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              background:
                m.role === "user"
                  ? "rgba(40, 40, 40, 0.8)"
                  : "rgba(20, 20, 20, 0.8)",
              backdropFilter: "blur(10px)",
              border: "1px solid #333",
              color: "white",
              padding: 16,
              borderRadius: 14,
              marginBottom: 16,
              maxWidth: "800px",
              marginLeft: m.role === "user" ? "auto" : "0",
              marginRight: m.role === "user" ? "0" : "auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              whiteSpace: "normal",
              overflowWrap: "break-word",
            }}
          >
            <strong>{m.role === "user" ? "You" : "Coach"}:</strong>
            <div style={{ marginTop: 8 }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 style={{ fontSize: "24px", margin: "10px 0" }} {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 style={{ fontSize: "18px", margin: "10px 0 6px" }} {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 style={{ fontSize: "16px", margin: "10px 0 6px" }} {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p style={{ marginBottom: 10, lineHeight: 1.6 }} {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li style={{ marginBottom: 4, lineHeight: 1.5 }} {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul style={{ paddingLeft: 22, marginBottom: 10 }} {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol style={{ paddingLeft: 22, marginBottom: 10 }} {...props} />
                  ),
                  hr: () => (
                    <hr style={{ border: "none", borderTop: "1px solid #333", margin: "12px 0" }} />
                  ),
                  code: ({ node, inline, ...props }) =>
                    inline ? (
                      <code
                        style={{
                          background: "#111",
                          padding: "2px 6px",
                          borderRadius: 6,
                        }}
                        {...props}
                      />
                    ) : (
                      <code
                        style={{
                          display: "block",
                          background: "#111",
                          padding: 12,
                          borderRadius: 10,
                          overflowX: "auto",
                        }}
                        {...props}
                      />
                    ),
                }}
              >
                {m.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        <div ref={chatEndRef} />
      </div>

      {lesson && (
        <div
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 16,
            background: "rgba(20,20,20,0.9)",
            border: "1px solid #333",
          }}
        >
          <h2 style={{ marginBottom: 16 }}>After the lesson</h2>

          <label style={{ display: "block", marginBottom: 6, color: "#aaa" }}>
            What felt clear? What felt difficult?
          </label>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid #444",
              background: "#111",
              color: "#fff",
              marginBottom: 16,
              resize: "vertical",
              lineHeight: 1.5,
            }}
            placeholder="e.g. I could feel the pulse, but the shift was confusing"
          />

          <label style={{ display: "block", marginBottom: 6, color: "#aaa" }}>
            What did you struggle with most?
          </label>
          <input
            value={struggledWith}
            onChange={(e) => setStruggledWith(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid #444",
              background: "#111",
              color: "#fff",
              marginBottom: 20,
            }}
            placeholder="e.g. timing, groove, hearing differences"
          />

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => completeLesson(true)}
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                background: "#2ecc71",
                color: "#000",
                fontWeight: "bold",
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              ✔ This felt manageable
            </button>

            <button
              onClick={() => completeLesson(false)}
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                background: "#e74c3c",
                color: "#fff",
                fontWeight: "bold",
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              ✖ I need more work
            </button>
          </div>
        </div>
      )}

      {!lesson && (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder="Ask a question..."
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #333",
              background: "#111",
              color: "#fff",
            }}
          />

          <button
            onClick={sendMessage}
            disabled={loading}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              background: "#0070f3",
              color: "white",
              cursor: loading ? "default" : "pointer",
              fontWeight: "bold",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      )}
    </main>
  );
}

<RhythmTrainer />