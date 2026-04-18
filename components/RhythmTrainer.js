"use client";

import { useEffect, useRef, useState } from "react";

export default function RhythmTrainer() {
  const [bpm, setBpm] = useState(90);
  const safeBpm = Math.max(30, Math.min(240, bpm || 90));
  const beatMs = (60 / safeBpm) * 1000;

  const STEPS_PER_MEASURE = 16;
  const hitWindow = 150;
  const scrollSpeed = 120;
  const startOffset = beatMs * 2;

  const [measures, setMeasures] = useState(2);
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

  const totalStepsRef = useRef(0);
  const totalCorrectRef = useRef(0);

  const startTimeRef = useRef(0);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const lastStepRef = useRef(-1);

  const resultsRef = useRef([]);
  const audioCtxRef = useRef(null);

  // ✅ FIX: prevent stale sequence in interval
  const sequenceRef = useRef([]);

  const isTouchDevice =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(pointer: coarse)")?.matches ||
      "ontouchstart" in window);

  const kickRef = useRef(null);
  const snareRef = useRef(null);

  useEffect(() => {
    kickRef.current = new Audio("/sounds/kick.wav");
    snareRef.current = new Audio("/sounds/snare.wav");

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioCtxRef.current = new AudioCtx();

    return () => {
      clearTimers();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  const playPadSound = (type) => {
    const audio = type === "kick" ? kickRef.current : snareRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
  };

  const playMetronomeClick = (accent) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.value = 0.02;
    osc.frequency.value = accent ? 1200 : 800;

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  };

  const clearTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const generatePattern = () => {
    const pattern = new Array(STEPS_PER_MEASURE).fill(null);

    for (let i = 0; i < STEPS_PER_MEASURE; i++) {
      if (i % 4 === 0) pattern[i] = "kick";
      if (i % 4 === 2) pattern[i] = "snare";

      if (difficulty === 1 && Math.random() < 0.15) {
        pattern[i] = Math.random() < 0.5 ? "kick" : "snare";
      }

      if (difficulty === 2 && Math.random() < 0.25) {
        pattern[i] = Math.random() < 0.5 ? "kick" : "snare";
      }

      if (difficulty === 3) {
        if (Math.random() < 0.7) {
          pattern[i] = Math.random() < 0.5 ? "kick" : "snare";
        }
        if (Math.random() < 0.2) pattern[i] = null;
      }
    }

    return pattern;
  };

  const start = () => {
    clearTimers();

    let fullSequence = [];
    for (let m = 0; m < measures; m++) {
      fullSequence = [...fullSequence, ...generatePattern()];
    }

    setSequence(fullSequence);
    sequenceRef.current = fullSequence; // ✅ sync immediately

    setResults(new Array(fullSequence.length).fill(null));
    resultsRef.current = new Array(fullSequence.length).fill(null);
    setTiming(new Array(fullSequence.length).fill(null));

    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setElapsedMs(0);

    totalStepsRef.current = fullSequence.filter(Boolean).length;
    totalCorrectRef.current = 0;

    setPhase("countdown");
    setCountdown(3);

    let c = 3;
    countdownRef.current = setInterval(() => {
      c--;
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
    lastStepRef.current = -1;

    intervalRef.current = setInterval(() => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      setElapsedMs(elapsed);

      let step = Math.floor((elapsed - startOffset) / beatMs);

      if (step !== lastStepRef.current && step >= 0) {
        playMetronomeClick(step % 4 === 0);
        lastStepRef.current = step;
      }

      // ✅ FIX: use ref instead of stale state
      if (step >= sequenceRef.current.length) {
        clearTimers();
        finish();
      }
    }, 16);
  };

  const tap = (type) => {
    if (phase !== "playing") return;

    playPadSound(type);

    const now = performance.now();
    const elapsed = now - startTimeRef.current - startOffset;

    const stepIndex = Math.floor((elapsed + hitWindow / 2) / beatMs);
    if (stepIndex < 0 || stepIndex >= sequence.length) return;

    if (resultsRef.current[stepIndex] !== null) return;

    const expected = sequence[stepIndex];
    const expectedTime = stepIndex * beatMs;
    const diff = elapsed - expectedTime;

    let correct = false;
    let label = "Miss";

    if (expected && expected === type) {
      if (Math.abs(diff) < 60) {
        correct = true;
        label = "Perfect";
      } else if (Math.abs(diff) < hitWindow) {
        correct = true;
        label = diff < 0 ? "Early" : "Late";
      }
    }

    setResults((prev) => {
      const updated = [...prev];
      updated[stepIndex] = correct;
      resultsRef.current = updated;
      return updated;
    });

    setTiming((prev) => {
      const updated = [...prev];
      updated[stepIndex] = label;
      return updated;
    });

    if (correct && expected) {
      const weight = label === "Perfect" ? 1 : 0.5;
      totalCorrectRef.current += weight;

      setCombo((c) => {
        const next = c + 1;
        setMaxCombo((m) => Math.max(m, next));
        return next;
      });
    } else {
      setCombo(0);
    }
  };

  const finish = () => {
    setPhase("result");
    const total = totalStepsRef.current || 1;
    const correct = totalCorrectRef.current;
    setScore(Math.min(100, Math.round((correct / total) * 100)));
  };

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
        Hit when blocks cross the line<br />
        <b>Kick = A / 1</b> | <b>Snare = L / 2</b>
      </p>

      <div>
        Difficulty:
        <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
          <option value={1}>Easy</option>
          <option value={2}>Medium</option>
          <option value={3}>Hard</option>
        </select>
      </div>

      <div>
        Measures:
        <select value={measures} onChange={(e) => setMeasures(Number(e.target.value))}>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </div>

      <div>Combo: {combo} | Max: {maxCombo}</div>

      <div>
        BPM:
        <input type="number" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} style={{ width: 60 }} />
      </div>

      {phase === "countdown" && <h1>{countdown}</h1>}
      {phase === "idle" && <button onClick={start}>Start Drill</button>}

      {phase === "playing" && (
        <>
          <div style={{ position: "relative", height: 300 }}>
            <div style={{ position: "absolute", top: 200, height: 2, background: "white", left: 0, right: 0 }} />

            {sequence.map((type, i) => {
              if (!type) return null;

              const y =
                ((i * beatMs + startOffset - elapsedMs) / 1000) *
                  scrollSpeed +
                200;

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
                    flexDirection: "column",
                    color: "#fff",
                    fontSize: 10,
                    transform: "translateX(-50%)",
                  }}
                >
                  {results[i] === true && <span style={{ color: "#2ecc71" }}>✔</span>}
                  {results[i] === false && <span style={{ color: "#e74c3c" }}>✖</span>}
                  {timing[i] && <span>{timing[i]}</span>}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 20 }}>
            <button onClick={() => tap("kick")} style={{ width: isTouchDevice ? 140 : 110, height: isTouchDevice ? 140 : 110, background: "#3498db", color: "white", borderRadius: 16 }}>
              KICK
            </button>

            <button onClick={() => tap("snare")} style={{ width: isTouchDevice ? 140 : 110, height: isTouchDevice ? 140 : 110, background: "#9b59b6", color: "white", borderRadius: 16 }}>
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