"use client";

import { useEffect, useRef, useState } from "react";

export default function RhythmTrainer() {
  const [bpm, setBpm] = useState(90);
  const safeBpm = Math.max(30, Math.min(240, bpm || 90));
  const beatMs = (60 / safeBpm) * 1000;

  const STEPS_PER_MEASURE = 16;
const stepMs = beatMs / 4;
const hitWindow = 200;
const scrollSpeed = 120;
const startOffset = beatMs * 2;
const hearGapMs = beatMs * 2;

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
  const heardStepsRef = useRef([]);

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
    const isQuarter = i % 4 === 0;
    const isEighth = i % 2 === 0 && !isQuarter;

    // --- EASY ---
    if (difficulty === 1) {
      // Strong base groove
      if (i === 0 || i === 8) pattern[i] = "kick";
      if (i === 4 || i === 12) pattern[i] = "snare";

      // Occasional eighth notes
      if (isEighth && Math.random() < 0.25) {
        pattern[i] = Math.random() < 0.5 ? "kick" : "snare";
      }

      // VERY rare 16th notes
      if (!isEighth && !isQuarter && Math.random() < 0.05) {
        pattern[i] = Math.random() < 0.5 ? "kick" : "snare";
      }
    }

    // --- MEDIUM ---
    if (difficulty === 2) {
      if (i === 0 || i === 8) pattern[i] = "kick";
      if (i === 4 || i === 12) pattern[i] = "snare";

      // More frequent eighths
      if (isEighth && Math.random() < 0.5) {
        pattern[i] = Math.random() < 0.5 ? "kick" : "snare";
      }

      // Some syncopation
      if (!isEighth && !isQuarter && Math.random() < 0.15) {
        pattern[i] = Math.random() < 0.5 ? "kick" : "snare";
      }
    }

    // --- HARD ---
    if (difficulty === 3) {
      if (Math.random() < 0.7) {
        pattern[i] = Math.random() < 0.5 ? "kick" : "snare";
      }

      // reduce clutter slightly
      if (Math.random() < 0.15) {
        pattern[i] = null;
      }
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

    heardStepsRef.current = new Array(fullSequence.length).fill(false);

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
  beginHearPhase();
  }
    }, 1000);
  };

const beginHearPhase = () => {
  setPhase("hearing");
  startTimeRef.current = performance.now();
  lastStepRef.current = -1;
  setElapsedMs(0);

  intervalRef.current = setInterval(() => {
    const now = performance.now();
    const elapsed = now - startTimeRef.current;
    setElapsedMs(elapsed);

    const step = Math.floor(elapsed / stepMs);

    if (step !== lastStepRef.current && step >= 0) {
      if (step % 4 === 0) {
        playMetronomeClick((step / 4) % 4 === 0);
      }
      lastStepRef.current = step;
    }

    sequenceRef.current.forEach((type, i) => {
      if (!type) return;
      if (heardStepsRef.current[i]) return;

      const noteTime = i * stepMs;
      if (elapsed >= noteTime) {
        playPadSound(type);
        heardStepsRef.current[i] = true;
      }
    });

    const hearDuration = sequenceRef.current.length * stepMs;

    if (elapsed >= hearDuration) {
      clearTimers();
      beginGapPhase();
    }
  }, 16);
};

const beginGapPhase = () => {
  setPhase("gap");
  startTimeRef.current = performance.now();
  lastStepRef.current = -1;
  setElapsedMs(0);

  intervalRef.current = setInterval(() => {
    const now = performance.now();
    const elapsed = now - startTimeRef.current;
    setElapsedMs(elapsed);

    const step = Math.floor(elapsed / stepMs);

    if (step !== lastStepRef.current && step >= 0) {
      if (step % 4 === 0) {
        playMetronomeClick((step / 4) % 4 === 0);
      }
      lastStepRef.current = step;
    }

    if (elapsed >= hearGapMs) {
      clearTimers();
      beginRepeatPhase();
    }
  }, 16);
};

  const beginRepeatPhase = () => {
    setPhase("playing");
    startTimeRef.current = performance.now();
    lastStepRef.current = -1;
    setElapsedMs(0);
setResults(new Array(sequenceRef.current.length).fill(null));
resultsRef.current = new Array(sequenceRef.current.length).fill(null);
setTiming(new Array(sequenceRef.current.length).fill(null));
setCombo(0);
setMaxCombo(0);
totalCorrectRef.current = 0;
totalStepsRef.current = sequenceRef.current.filter(Boolean).length;

    intervalRef.current = setInterval(() => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      setElapsedMs(elapsed);

      let step = Math.floor((elapsed - startOffset) / stepMs);

      if (step !== lastStepRef.current && step >= 0) {
      if (step % 4 === 0) {
      playMetronomeClick((step / 4) % 4 === 0);
      }
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

    const stepIndex = Math.round(elapsed / stepMs);
    if (stepIndex < 0 || stepIndex >= sequence.length) return;

    if (resultsRef.current[stepIndex] !== null) return;

    const expected = sequence[stepIndex];
    const expectedTime = stepIndex * stepMs;
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
    Listen first, then repeat the rhythm from memory<br />
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
        </select>
      </div>

      <div>Combo: {combo} | Max: {maxCombo}</div>

      <div>
        BPM:
        <input type="number" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} style={{ width: 60 }} />
      </div>

      {phase === "countdown" && <h1>{countdown}</h1>}
    {phase === "idle" && <button onClick={start}>Start Hear & Repeat</button>}
    {phase === "hearing" && <h3>Listen...</h3>}
    {phase === "gap" && <h3>Get ready...</h3>}

      {phase === "playing" && (
        <>
          <div style={{ position: "relative", height: 300, overflow: "hidden" }}>
            <div
  style={{
    position: "absolute",
    top: 200,
    height: 4,
    background: "#ffffff",
    left: 0,
    right: 0,
    boxShadow: "0 0 8px rgba(255,255,255,0.45)",
    zIndex: 1,
  }}
/>

            {sequence.map((type, i) => {
  if (!type) return null;

  const y =
    ((i * stepMs + startOffset - elapsedMs) / 1000) * scrollSpeed + 200;

  return (
    <div
  key={i}
  style={{
    position: "absolute",
    left: type === "kick" ? "30%" : "60%",
    top: y,
    transform: "translate(-50%, -50%)",
    width: 60,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    pointerEvents: "none",
    }}
    >
      {/* FEEDBACK */}
      {timing[i] && (
  <div
    style={{
      position: "absolute",
      left: type === "kick" ? -55 : 55,
      top: "50%",
      transform: "translateY(-50%)",
      fontSize: 12,
      fontWeight: "bold",
      color:
        timing[i] === "Perfect"
          ? "#2ecc71"
          : timing[i] === "Miss"
          ? "#e74c3c"
          : "#f1c40f",
      textShadow: "0 2px 6px rgba(0,0,0,0.9)",
      whiteSpace: "nowrap",
      pointerEvents: "none",
    }}
  >
    {timing[i]}
  </div>
)}

    {/* LINE + CENTER BUBBLE */}
<div
  style={{
    position: "relative",
    width: 40,
    height: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  {/* LINE */}
  <div
    style={{
      position: "absolute",
      width: "100%",
      height: 6,
      background: type === "kick" ? "#3498db" : "#9b59b6",
      border: "2px solid white",
      borderRadius: 6,
      boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
    }}
  />

  {/* CENTER BUBBLE */}
  <div
    style={{
      position: "absolute",
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: "#ffffff",
      border: `2px solid ${
        type === "kick" ? "#3498db" : "#9b59b6"
      }`,
      boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
    }}
  />
</div>
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