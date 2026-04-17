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

    const isLessonRequest =
      userInput.includes("lesson") ||
      userInput.includes("start") ||
      userInput.includes("ready") ||
      userInput.includes("practice");

    setInput("");

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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.lessonText },
      ]);
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
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: 20, color: "indigo",   WebkitTextStroke: "0.5px white",
    textShadow: "0 0 10px rgba(255,255,255,0.3)",
    fontWeight: "bold",}}>
        🎛 S U N V O X|C O A C H
      </h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button
          onClick={getLesson}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "none",
            background: "#0070f3",
            color: "white",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Get Today’s Lesson
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
          <p style={{ color: "#ddd" }}>
            Click <strong>Get Today’s Lesson</strong> or ask a question.
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
            }}
          >
            <strong>{m.role === "user" ? "You" : "Coach"}:</strong>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: (props) => (
                  <h1 style={{ fontSize: "22px", marginTop: 10 }} {...props} />
                ),
                h2: (props) => (
                  <h2 style={{ fontSize: "18px", marginTop: 10 }} {...props} />
                ),
                p: (props) => (
                  <p style={{ marginBottom: 8, lineHeight: 1.6 }} {...props} />
                ),
                li: (props) => (
                  <li style={{ marginLeft: 20, marginBottom: 4 }} {...props} />
                ),
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
          />

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => completeLesson(true)}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 10,
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
                borderRadius: 10,
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

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "none",
            background: "#0070f3",
            color: "white",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Send
        </button>
      </div>
    </main>
  );
}