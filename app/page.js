"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [lesson, setLesson] = useState(null);
  const [reflection, setReflection] = useState("");
  const [struggledWith, setStruggledWith] = useState("");

  const sendMessage = async () => {
  if (!input.trim()) return;

  const userInput = input.toLowerCase();

  // 🔥 DETECT LESSON INTENT
  const isLessonRequest =
    userInput.includes("lesson") ||
    userInput.includes("start") ||
    userInput.includes("ready") ||
    userInput.includes("practice");

  setInput("");

  // =========================
  // 👉 ROUTE TO LESSON
  // =========================
  if (isLessonRequest) {
    const res = await fetch("/api/lesson", {
      method: "POST",
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: data.lessonText },
    ]);

    return;
  }

  // =========================
  // 👉 OTHERWISE NORMAL CHAT
  // =========================

  const newMessages = [...messages, { role: "user", content: input }];
  setMessages(newMessages);

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: newMessages }),
  });

  const data = await res.json();

  setMessages([...newMessages, { role: "assistant", content: data.reply }]);
};

  const getLesson = async () => {
    const res = await fetch("/api/lesson", {
      method: "POST",
    });

    const data = await res.json();
    setLesson(data);

    if (data.lessonText) {
      setMessages((prev) => [...prev, { role: "assistant", content: data.lessonText }]);
    }
  };

  const completeLesson = async (feltEasy) => {
    if (!lesson) return;

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

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: data.ok
          ? `Lesson saved. Next lesson is #${data.nextLesson}.`
          : `Error: ${data.error}`,
      },
    ]);

    setReflection("");
    setStruggledWith("");
    setLesson(null);
  };

  return (
    <main
      style={{
        padding: 20,
        maxWidth: 1000,
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>🎛 SunVox Coach</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button
          onClick={getLesson}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: "#0070f3",
            color: "white",
            cursor: "pointer",
          }}
        >
          Get Today’s Lesson
        </button>
      </div>

      <div
        style={{
          minHeight: 420,
          border: "1px solid #ccc",
          padding: 16,
          marginBottom: 16,
          borderRadius: 12,
          overflowY: "auto",
          background: "#111",
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#ddd" }}>
            Click <strong>Get Today’s Lesson</strong> or ask a question.
          </p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              background: m.role === "user" ? "#1e1e1e" : "#2a2a2a",
              color: "white",
              padding: 12,
              borderRadius: 10,
              marginBottom: 10,
            }}
          >
            <strong>{m.role === "user" ? "You" : "Coach"}:</strong>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ ...props }) => <h1 style={{ fontSize: "22px", marginTop: 10 }} {...props} />,
                h2: ({ ...props }) => <h2 style={{ fontSize: "18px", marginTop: 10 }} {...props} />,
                p: ({ ...props }) => <p style={{ marginBottom: 8, lineHeight: 1.5 }} {...props} />,
                li: ({ ...props }) => <li style={{ marginLeft: 20, marginBottom: 4 }} {...props} />,
                strong: ({ ...props }) => <strong style={{ color: "#fff" }} {...props} />,
              }}
            >
              {m.content}
            </ReactMarkdown>
          </div>
        ))}
      </div>

     {lesson && (
  <div
    style={{
      marginTop: 20,
      padding: 20,
      borderRadius: 12,
      background: "#1a1a1a",
      border: "1px solid #333",
    }}
  >
    <h2 style={{ marginBottom: 16 }}>After the lesson</h2>

    {/* Reflection */}
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
        borderRadius: 8,
        border: "1px solid #444",
        background: "#111",
        color: "#fff",
        marginBottom: 16,
        resize: "vertical",
        lineHeight: 1.5,
      }}
      placeholder="e.g. I could feel the pulse, but the off-grid shift confused me"
    />

    {/* Struggle */}
    <label style={{ display: "block", marginBottom: 6, color: "#aaa" }}>
      What did you struggle with most?
    </label>
    <input
      value={struggledWith}
      onChange={(e) => setStruggledWith(e.target.value)}
      style={{
        width: "100%",
        padding: 12,
        borderRadius: 8,
        border: "1px solid #444",
        background: "#111",
        color: "#fff",
        marginBottom: 20,
      }}
      placeholder="e.g. groove, timing, hearing differences"
    />

    {/* Buttons */}
    <div style={{ display: "flex", gap: 12 }}>
      <button
        onClick={() => completeLesson(true)}
        style={{
          flex: 1,
          padding: "12px 16px",
          borderRadius: 8,
          border: "none",
          background: "#2ecc71",
          color: "#000",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        ✔ This felt manageable
      </button>

      <button
        onClick={() => completeLesson(false)}
        style={{
          flex: 1,
          padding: "12px 16px",
          borderRadius: 8,
          border: "none",
          background: "#e74c3c",
          color: "#fff",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        ✖ I need more work
      </button>
    </div>
  </div>
)}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: "#0070f3",
            color: "white",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </main>
  );
}