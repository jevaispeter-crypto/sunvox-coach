"use client";

import { useEffect, useRef, useState } from "react";

export default function RhythmTrainer() {
  const [phase, setPhase] = useState("idle"); // idle | countdown | playing | result
  const [bpm, setBpm] = useState(90);
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [currentBeat, setCurrentBeat] = useState(0);

  const pattern = [
    { step: 0, type: "kick" },
    { step: 2, type: "snare" },
    { step: 4, type: "kick" },
    { step: 6, type: "snare" },
  ];

  const startTimeRef = useRef(null);
  const tapsRef = useRef([]);
  const intervalRef = useRef(null);

  const beatDuration = 60 / bpm;
  const totalSteps = 8;

  // 🎯 START FLOW
  const start = () => {
    setPhase("countdown");
    setCountdown(3);
    setScore(null);
    setFeedback([]);
    tapsRef.current = [];

    let count = 3;
    const id = setInterval(() => {
      count--;
      setCountdown(count);

      if (count === 0) {
        clearInterval(id);
        beginPlaying();
      }
    }, 1000);
  };

  const beginPlaying = () => {
    setPhase("playing");
    startTimeRef.current = performance.now();

    let step = 0;

    intervalRef.current = setInterval(() => {
      setCurrentBeat(step % totalSteps);
      playClick(step === 0); // accent first beat
      step++;
    }, beatDuration * 1000);

    setTimeout(() => {
      clearInterval(intervalRef.current);
      evaluate();
      setPhase("result");
    }, totalSteps * beatDuration * 1000);
  };

  // 🔊 METRONOME
  const playClick = (accent) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.frequency.value = accent ? 1200 : 800;
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  };

  // 👇 TAP INPUT
  const tap = (type) => {
    if (phase !== "playing") return;

    const now = performance.now();
    const time = (now - startTimeRef.current) / 1000;

    tapsRef.current.push({ time, type });
  };

  // 🎯 EVALUATION (fixed logic)
  const evaluate = () => {
    let results = [];
    let totalError = 0;

    pattern.forEach((expected) => {
      const expectedTime = expected.step * beatDuration;

      const closest = tapsRef.current.reduce((best, tap) => {
        const diff = Math.abs(tap.time - expectedTime);
        if (!best || diff < best.diff) {
          return { tap, diff };
        }
        return best;
      }, null);

      if (closest) {
        const isCorrectType = closest.tap.type === expected.type;
        const isOnTime = closest.diff < 0.15;

        results.push({
          correct: isCorrectType && isOnTime,
        });

        totalError += closest.diff;
      }
    });

    const avgError = totalError / pattern.length;
    const finalScore = Math.max(0, 100 - avgError * 300);

    setFeedback(results);
    setScore(Math.round(finalScore));
  };

  // ⌨️ KEYBOARD INPUT
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "a" || e.key === "1") tap("kick");
      if (e.key === "l" || e.key === "2") tap("snare");
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase]);

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Rhythm Drill</h2>

      {/* 🧠 INSTRUCTIONS */}
      <p style={{ color: "#aaa", marginBottom: 20 }}>
        Follow the rhythm. Tap <b>A / 1</b> for Kick and <b>L / 2</b> for Snare.
        Stay in time with the metronome.
      </p>

      {/* ⏳ COUNTDOWN */}
      {phase === "countdown" && (
        <h1 style={{ fontSize: 48 }}>{countdown}</h1>
      )}

      {/* ▶️ START */}
      {phase === "idle" && (
        <button onClick={start}>Start Drill</button>
      )}

      {/* 🎧 PLAYING */}
      {phase === "playing" && (
        <>
          <div style={{ marginBottom: 20 }}>
            Beat: {currentBeat + 1}
          </div>

          {/* 🟩 PADS */}
          <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
            <div
              onClick={() => tap("kick")}
              style={{
                width: 120,
                height: 120,
                background: "#2ecc71",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              KICK
            </div>

            <div
              onClick={() => tap("snare")}
              style={{
                width: 120,
                height: 120,
                background: "#e74c3c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              SNARE
            </div>
          </div>
        </>
      )}

      {/* 🏁 RESULT */}
      {phase === "result" && (
        <>
          <h3>Score: {score}%</h3>

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            {feedback.map((f, i) => (
              <span key={i} style={{ fontSize: 24 }}>
                {f.correct ? "✔" : "✖"}
              </span>
            ))}
          </div>

          <button onClick={start} style={{ marginTop: 20 }}>
            Retry
          </button>
        </>
      )}
    </div>
  );
}