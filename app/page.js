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

  // 🔥 NEW: mode switch
  const [mode, setMode] = useState("chat"); // "chat" | "drill"

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

      {/* 🔥 TOP BUTTONS */}
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
            opacity: loading ? 0.6 : 1,
          }}
        >
          Clear Chat
        </button>

        {/* 🔥 DRILL BUTTON */}
        <button
          onClick={() => setMode("drill")}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "none",
            background: "#9b59b6",
            color: "white",
            fontWeight: "bold",
          }}
        >
          Start Drill
        </button>

        {mode === "drill" && (
          <button
            onClick={() => setMode("chat")}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              background: "#222",
              color: "white",
            }}
          >
            Back
          </button>
        )}
      </div>

      {/* 🔥 CHAT MODE */}
      {mode === "chat" && (
        <>
          <div
            style={{
              minHeight: 420,
              padding: 20,
              marginBottom: 20,
              borderRadius: 16,
              overflowY: "auto",
              background: "rgba(10, 10, 10, 0.75)",
              border: "1px solid #222",
            }}
          >
            {messages.length === 0 && (
              <p style={{ color: "#ddd" }}>Start your training session.</p>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <strong>{m.role === "user" ? "You" : "Coach"}:</strong>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.content}
                </ReactMarkdown>
              </div>
            ))}

            <div ref={chatEndRef} />
          </div>

          {!lesson && (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                style={{ flex: 1 }}
              />
              <button onClick={sendMessage} disabled={loading}>
                Send
              </button>
            </div>
          )}
        </>
      )}

      {/* 🔥 DRILL MODE */}
      {mode === "drill" && (
        <div
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 16,
            background: "rgba(20,20,20,0.9)",
            border: "1px solid #333",
          }}
        >
          <RhythmTrainer />
        </div>
      )}
    </main>
  );
}