"use client";

import { useEffect, useRef, useState } from "react";

export default function RhythmTrainer() {
  const [bpm, setBpm] = useState(90);
  const safeBpm = Math.max(30, Math.min(240, bpm || 90));
  const beatMs = (60 / safeBpm) * 1000;

  const TOTAL_STEPS = 16;
  const hitWindow = 150;
  const scrollSpeed = 120; // px per second

  const [sequence, setSequence] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [countdown, setCountdown] = useState(3);
  const [results, setResults] = useState([]);
  const [timing, setTiming] = useState([]);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const [elapsedMs, setElapsedMs] = useState(0);

  const startTimeRef = useRef(0);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const lastClickedStepRef = useRef(-1);

  const isTouchDevice =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(pointer: coarse)")?.matches ||
      "ontouchstart" in window);

  const generatePattern = (difficultyLevel) => {
    const pattern = new Array(TOTAL_STEPS).fill(null);

    for (let i = 0; i < TOTAL_STEPS; i++) {
      let type = null;

      if (difficultyLevel === 1) {
        if (i % 4 === 0) type = "kick";
        if (i % 4 === 2) type = "snare";
      }

      if (difficultyLevel === 2) {
        if (i % 4 === 0) type = "kick";
        if (i % 4 === 2) type = "snare";
        if (Math.random() < 0.25) {
          type = Math.random() < 0.5 ? "kick" : "snare";
        }
      }

      if (difficultyLevel === 3) {
        if (Math.random() < 0.7) {
          type = Math.random() < 0.5 ? "kick" : "snare";
        }
      }

      pattern[i] = type;
    }

    return pattern;
  };

  const playTone = (frequency, duration = 0.05) => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = frequency;
    gain.gain.value = 0.05;

    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const playPadSound = (type) => {
    playTone(type === "kick" ? 120 : 260, 0.08);
  };

  const playMetronomeClick = (accent) => {
    playTone(accent ? 1200 : 800, 0.04);
  };

  const clearTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const start = () => {
    clearTimers();

    const newPattern = generatePattern(difficulty);
    setSequence(newPattern);
    setResults(new Array(TOTAL_STEPS).fill(null));
    setTiming(new Array(TOTAL_STEPS).fill(null));
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setElapsedMs(0);
    lastClickedStepRef.current = -1;

    setPhase("countdown");
    setCountdown(3);

    let c = 3;
    countdownRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);

      if (c === 0) {
        clearTimers();
        begin();
      }
    }, 1000);
  };

  const begin = () => {
    setPhase("playing");
    startTimeRef.current = performance.now();
    lastClickedStepRef.current = -1;
    setElapsedMs(0);

    intervalRef.current = setInterval(() => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      setElapsedMs(elapsed);

      const step = Math.floor(elapsed / beatMs);

      if (step !== lastClickedStepRef.current && step < TOTAL_STEPS) {
        playMetronomeClick(step % 4 === 0);
        lastClickedStepRef.current = step;
      }

      if (elapsed >= TOTAL_STEPS * beatMs) {
        clearTimers();
        finish();
      }
    }, 16);
  };

  const tap = (type) => {
    if (phase !== "playing") return;

    playPadSound(type);

    const now = performance.now();
    const elapsed = now - startTimeRef.current;

    const stepIndex = Math.round(elapsed / beatMs);

    if (stepIndex < 0 || stepIndex >= TOTAL_STEPS) return;

    const expected = sequence[stepIndex];
    const expectedTime = stepIndex * beatMs;
    const diff = elapsed - expectedTime;

    let result = false;
    let timingLabel = "Miss";

    if (expected) {
      if (Math.abs(diff) < 60 && expected === type) {
        result = true;
        timingLabel = "Perfect";
      } else if (Math.abs(diff) < hitWindow && expected === type) {
        result = true;
        timingLabel = diff < 0 ? "Early" : "Late";
      }
    }

    setResults((prev) => {
      const updated = [...prev];
      updated[stepIndex] = result;
      return updated;
    });

    setTiming((prev) => {
      const updated = [...prev];
      updated[stepIndex] = timingLabel;
      return updated;
    });

    if (result) {
      setCombo((c) => {
        const newCombo = c + 1;
        setMaxCombo((m) => Math.max(m, newCombo));
        return newCombo;
      });
    } else {
      setCombo(0);
    }
  };

  const finish = () => {
    setPhase("result");

    let correctCount = 0;

    for (let i = 0; i < TOTAL_STEPS; i++) {
      const expected = sequence[i];
      const result = results[i];

      if (expected === null) {
        if (result === null) correctCount += 1;
      } else {
        if (result === true) correctCount += 1;
      }
    }

    setScore(Math.round((correctCount / TOTAL_STEPS) * 100));
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "a" || e.key === "1") tap("kick");
      if (e.key === "l" || e.key === "2") tap("snare");
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, sequence]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const currentStep = Math.floor(elapsedMs / beatMs);

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Rhythm Drill</h2>

      <p style={{ color: "#aaa", marginBottom: 8 }}>
        Hit the notes when they cross the white line.
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          marginBottom: 10,
          flexWrap: "wrap",
          color: "#ddd",
          fontSize: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: "#3498db",
              display: "inline-block",
            }}
          />
          Kick = A / 1
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: "#9b59b6",
              display: "inline-block",
            }}
          />
          Snare = L / 2
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>Combo: {combo} | Max: {maxCombo}</div>

      <div style={{ marginBottom: 8 }}>
        BPM:
        <input
          type="number"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          style={{ width: 60, marginLeft: 6 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        Difficulty:
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          style={{ marginLeft: 6 }}
        >
          <option value={1}>Easy</option>
          <option value={2}>Medium</option>
          <option value={3}>Hard</option>
        </select>
      </div>

      {phase === "countdown" && <h1>{countdown}</h1>}

      {phase === "idle" && <button onClick={start}>Start Drill</button>}

      {phase === "playing" && (
        <>
          <div
            style={{
              position: "relative",
              height: 320,
              overflow: "hidden",
              border: "1px solid #333",
              borderRadius: 12,
              background: "#111",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 220,
                left: 0,
                right: 0,
                height: 2,
                background: "white",
                zIndex: 2,
              }}
            />

            {sequence.map((type, i) => {
              if (!type) return null;

              const y = ((i * beatMs - elapsedMs) / 1000) * scrollSpeed + 220;

              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: type === "kick" ? "30%" : "60%",
                    top: y,
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: type === "kick" ? "#3498db" : "#9b59b6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 10,
                    flexDirection: "column",
                    zIndex: 1,
                    transform: "translateX(-50%)",
                  }}
                >
                  {results[i] === true && "✔"}
                  {results[i] === false && "✖"}
                  {timing[i] && <span>{timing[i]}</span>}
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "center",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => tap("kick")}
              style={{
                width: isTouchDevice ? 140 : 120,
                height: isTouchDevice ? 140 : 120,
                background: "#3498db",
                color: "white",
                border: "none",
                borderRadius: 16,
                fontSize: 18,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              KICK
            </button>

            <button
              onClick={() => tap("snare")}
              style={{
                width: isTouchDevice ? 140 : 120,
                height: isTouchDevice ? 140 : 120,
                background: "#9b59b6",
                color: "white",
                border: "none",
                borderRadius: 16,
                fontSize: 18,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              SNARE
            </button>
          </div>
        </>
      )}

      {phase === "result" && (
        <>
          <h3>Score: {score}%</h3>
          <p>Max Combo: {maxCombo}</p>
          <button onClick={start}>Retry</button>
        </>
      )}
    </div>
  );
}