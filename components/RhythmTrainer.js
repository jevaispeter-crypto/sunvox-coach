"use client";

import { useEffect, useRef, useState } from "react";

export default function RhythmTrainer() {
  const [bpm, setBpm] = useState(90);
  const safeBpm = Math.max(30, Math.min(240, bpm || 90));
  const beatMs = (60 / safeBpm) * 1000;

  const TOTAL_STEPS = 16;

  const [sequence, setSequence] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [countdown, setCountdown] = useState(3);
  const [results, setResults] = useState([]);
  const [timing, setTiming] = useState([]);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(1);

  // 🔥 NEW
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const startTimeRef = useRef(0);
  const intervalRef = useRef(null);

  // 🎯 PATTERN
  const generatePattern = (difficultyLevel) => {
    const pattern = new Array(TOTAL_STEPS).fill(null);

    for (let i = 0; i < TOTAL_STEPS; i++) {
      let type = null;

      if (difficultyLevel === 1) {
        if (i % 4 === 0) type = "kick";
        if (i % 4 === 2) type = "snare";
      }

      if (difficultyLevel === 2) {
        if (Math.random() < 0.4)
          type = Math.random() < 0.5 ? "kick" : "snare";
      }

      if (difficultyLevel === 3) {
        if (Math.random() < 0.7)
          type = Math.random() < 0.5 ? "kick" : "snare";
      }

      pattern[i] = type;
    }

    return pattern;
  };

  // 🔊 SOUND (NEW: kick/snare)
  const playSound = (type) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);

    osc.frequency.value = type === "kick" ? 120 : 300;

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
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

  const start = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const newPattern = generatePattern(difficulty);
    setSequence(newPattern);
    setResults(new Array(TOTAL_STEPS).fill(null));
    setTiming(new Array(TOTAL_STEPS).fill(null));
    setScore(0);
    setCombo(0);
    setMaxCombo(0);

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

    intervalRef.current = setInterval(() => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;

      const step = Math.floor(elapsed / beatMs);

      click(step % 4 === 0);

      if (step >= TOTAL_STEPS) {
        clearInterval(intervalRef.current);
        finish();
      }
    }, 20);
  };

  // 🎯 TAP
  const tap = (type) => {
    if (phase !== "playing") return;

    playSound(type);

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
      } else if (Math.abs(diff) < 120 && expected === type) {
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

    // 🔥 COMBO LOGIC
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

  // 🏁 SCORE
  const finish = () => {
    setPhase("result");

    let correctCount = 0;

    for (let i = 0; i < TOTAL_STEPS; i++) {
      const expected = sequence[i];
      const result = results[i];

      if (expected === null) {
        if (result === null) correctCount++;
      } else {
        if (result === true) correctCount++;
      }
    }

    setScore(Math.round((correctCount / TOTAL_STEPS) * 100));
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
        Hit on the line<br />
        <b>Kick = A / 1</b> | <b>Snare = L / 2</b>
      </p>

      <div>Combo: {combo} | Max: {maxCombo}</div>

      <div>
        BPM:
        <input
          type="number"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          style={{ width: 60 }}
        />
      </div>

      <div>
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

      {phase === "countdown" && <h1>{countdown}</h1>}
      {phase === "idle" && <button onClick={start}>Start Drill</button>}

      {phase === "playing" && (
        <div
          style={{
            position: "relative",
            height: 300,
            overflow: "hidden",
            border: "1px solid #333",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 200,
              left: 0,
              right: 0,
              height: 2,
              background: "white",
            }}
          />

          {sequence.map((type, i) => {
            if (!type) return null;

            const now = performance.now();
            const elapsed = now - startTimeRef.current;

            const y = ((i * beatMs - elapsed) / 1000) * 120 + 200;

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: type === "kick" ? "30%" : "60%",
                  top: y,
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  background:
                    type === "kick" ? "#3498db" : "#9b59b6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 10,
                  flexDirection: "column",
                }}
              >
                {results[i] === true && "✔"}
                {results[i] === false && "✖"}
                {timing[i] && <span>{timing[i]}</span>}
              </div>
            );
          })}
        </div>
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