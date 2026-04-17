"use client";

import { useEffect, useRef, useState } from "react";

export default function RhythmTrainer() {
  const bpm = 90;
  const beatMs = (60 / bpm) * 1000;
  const hitWindow = 150;

  const [sequence, setSequence] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [countdown, setCountdown] = useState(3);
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState([]);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(1);

  const startTimeRef = useRef(0);
  const intervalRef = useRef(null);

  // 🎯 RANDOM PATTERN GENERATOR
  const generatePattern = (difficultyLevel) => {
    const length = 16; // ~10 seconds
    let pattern = [];

    for (let i = 0; i < length; i++) {
      let type = null;

      if (difficultyLevel === 1) {
        // 🟢 EASY
        if (i % 4 === 0) type = "kick";
        if (i % 4 === 2) type = "snare";

        // small variation
        if (Math.random() < 0.15) {
          type = Math.random() < 0.5 ? "kick" : "snare";
        }
      }

      if (difficultyLevel === 2) {
        // 🟡 MEDIUM
        if (i % 4 === 0) type = "kick";
        if (i % 4 === 2) type = "snare";

        if (Math.random() < 0.4) {
          type = Math.random() < 0.5 ? "kick" : "snare";
        }
      }

      if (difficultyLevel === 3) {
        // 🔴 HARD
        if (Math.random() < 0.7) {
          type = Math.random() < 0.5 ? "kick" : "snare";
        }
      }

      if (type) {
        pattern.push({ time: i, type });
      }
    }

    return pattern;
  };

  // 🔊 METRONOME
  const click = (accent) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.frequency.value = accent ? 1200 : 800;
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  };

  // 🚀 START
  const start = () => {
    const newPattern = generatePattern(difficulty);
    setSequence(newPattern);

    setResults(new Array(16).fill(null));
    setScore(0);
    setPhase("countdown");
    setCountdown(3);

    let c = 3;
    const id = setInterval(() => {
      c--;
      setCountdown(c);
      if (c === 0) {
        clearInterval(id);
        begin();
      }
    }, 1000);
  };

  const begin = () => {
    setPhase("playing");
    startTimeRef.current = performance.now();

    let step = 0;

    intervalRef.current = setInterval(() => {
      setCurrentStep(step);
      click(step % 4 === 0);
      step++;

      if (step >= 16) {
        clearInterval(intervalRef.current);
        finish();
      }
    }, beatMs);
  };

  // 🎯 TAP
  const tap = (type) => {
    if (phase !== "playing") return;

    const now = performance.now();
    const elapsed = now - startTimeRef.current;

    const stepIndex = Math.round(elapsed / beatMs);

    if (stepIndex < 0 || stepIndex >= 16) return;

    const expected = sequence.find((s) => s.time === stepIndex);

    let correct = false;

    if (expected) {
      const expectedTime = expected.time * beatMs;
      const diff = Math.abs(elapsed - expectedTime);

      correct = expected.type === type && diff < hitWindow;
    }

    setResults((prev) => {
      const updated = [...prev];
      updated[stepIndex] = correct;
      return updated;
    });
  };

  // 🏁 SCORE
  const finish = () => {
    setPhase("result");

    const correctHits = results.filter((r) => r === true).length;
    const totalNotes = sequence.length || 1;

    setScore(Math.round((correctHits / totalNotes) * 100));
  };

  // ⌨️ INPUT
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "a" || e.key === "1") tap("kick");
      if (e.key === "l" || e.key === "2") tap("snare");
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, sequence]);

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Rhythm Drill</h2>

      <p style={{ color: "#aaa" }}>
        Follow the pattern. Hit only when a block appears.
      </p>

      {/* DIFFICULTY */}
      <div style={{ marginBottom: 10 }}>
        Difficulty:
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
        >
          <option value={1}>Easy</option>
          <option value={2}>Medium</option>
          <option value={3}>Hard</option>
        </select>
      </div>

      {/* COUNTDOWN */}
      {phase === "countdown" && (
        <h1 style={{ fontSize: 48 }}>{countdown}</h1>
      )}

      {/* START */}
      {phase === "idle" && <button onClick={start}>Start Drill</button>}

      {/* PLAY */}
      {phase === "playing" && (
        <>
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {Array.from({ length: 16 }).map((_, i) => {
              const note = sequence.find((s) => s.time === i);

              return (
                <div
                  key={i}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    background:
                      results[i] === true
                        ? "#2ecc71"
                        : results[i] === false
                        ? "#e74c3c"
                        : note
                        ? note.type === "kick"
                          ? "#2ecc71"
                          : "#e74c3c"
                        : i === currentStep
                        ? "#fff"
                        : "#333",
                  }}
                />
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 20 }}>
            <div onClick={() => tap("kick")} style={{ width: 120, height: 120, background: "#2ecc71", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              KICK
            </div>

            <div onClick={() => tap("snare")} style={{ width: 120, height: 120, background: "#e74c3c", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              SNARE
            </div>
          </div>
        </>
      )}

      {/* RESULT */}
      {phase === "result" && (
        <>
          <h3>Score: {score}%</h3>
          <button onClick={start}>Retry</button>
        </>
      )}
    </div>
  );
}