"use client";

import { useEffect, useRef, useState } from "react";

export default function RhythmTrainer() {
  // ✅ FIX: BPM now adjustable
  const [bpm, setBpm] = useState(90);
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

  // 🎯 RANDOM PATTERN GENERATOR (unchanged)
  const generatePattern = (difficultyLevel) => {
    const length = 16;
    let pattern = [];

    for (let i = 0; i < length; i++) {
      let type = null;

      if (difficultyLevel === 1) {
        if (i % 4 === 0) type = "kick";
        if (i % 4 === 2) type = "snare";
        if (Math.random() < 0.15) {
          type = Math.random() < 0.5 ? "kick" : "snare";
        }
      }

      if (difficultyLevel === 2) {
        if (i % 4 === 0) type = "kick";
        if (i % 4 === 2) type = "snare";
        if (Math.random() < 0.4) {
          type = Math.random() < 0.5 ? "kick" : "snare";
        }
      }

      if (difficultyLevel === 3) {
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

  // 🔊 METRONOME (unchanged but safe)
  const click = (accent) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.frequency.value = accent ? 1200 : 800;
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  };

  const start = () => {
    // ✅ FIX: clear any existing interval
    if (intervalRef.current) clearInterval(intervalRef.current);

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

  // 🎯 TAP (unchanged logic)
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

      {/* ✅ FIX: clear instructions */}
      <p style={{ color: "#aaa" }}>
        Follow the pattern.<br />
        <b>Kick = A / 1</b> | <b>Snare = L / 2</b>
      </p>

      {/* ✅ FIX: BPM CONTROL */}
      <div style={{ marginBottom: 10 }}>
        BPM:
        <input
          type="number"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          style={{ width: 60, marginLeft: 6 }}
        />
      </div>

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

      {phase === "countdown" && (
        <h1 style={{ fontSize: 48 }}>{countdown}</h1>
      )}

      {phase === "idle" && <button onClick={start}>Start Drill</button>}

      {phase === "playing" && (
        <>
          {/* ✅ FIX: clean visual separation */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {Array.from({ length: 16 }).map((_, i) => {
              const note = sequence.find((s) => s.time === i);

              return (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    background: note
                      ? note.type === "kick"
                        ? "#3498db" // blue
                        : "#9b59b6" // purple
                      : "#222",
                    border: i === currentStep ? "2px solid white" : "1px solid #333",
                  }}
                >
                  {/* ✅ FIX: overlay feedback */}
                  {results[i] !== null && (
                    <span
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        fontSize: 14,
                        color: results[i] ? "#2ecc71" : "#e74c3c",
                      }}
                    >
                      {results[i] ? "✔" : "✖"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 20 }}>
            <div
              onClick={() => tap("kick")}
              style={{
                width: 120,
                height: 120,
                background: "#3498db",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
                background: "#9b59b6",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              SNARE
            </div>
          </div>
        </>
      )}

      {phase === "result" && (
        <>
          <h3>Score: {score}%</h3>
          <button onClick={start}>Retry</button>
        </>
      )}
    </div>
  );
}