"use client";

import { useEffect, useRef, useState } from "react";

export default function RhythmTrainer() {
  const [bpm, setBpm] = useState(90);
  const beatMs = (60 / bpm) * 1000;
  const hitWindow = 180;

  const [sequence, setSequence] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState({});
  const [difficulty, setDifficulty] = useState(1);

  const startTimeRef = useRef(0);
  const animationRef = useRef(null);
  const containerRef = useRef(null);

  const TOTAL_BEATS = 32; // ~20 sec
  const SCROLL_SPEED = 120; // px/sec

  // 🎯 PATTERN GENERATOR (CONTROLLED RANDOM)
  const generatePattern = () => {
    let pattern = [];

    for (let i = 0; i < TOTAL_BEATS; i++) {
      let type = null;

      if (difficulty === 1) {
        if (i % 4 === 0) type = "kick";
        if (i % 4 === 2) type = "snare";
        if (Math.random() < 0.1) type = Math.random() < 0.5 ? "kick" : "snare";
      }

      if (difficulty === 2) {
        if (i % 4 === 0) type = "kick";
        if (i % 4 === 2) type = "snare";
        if (Math.random() < 0.4) type = Math.random() < 0.5 ? "kick" : "snare";
      }

      if (difficulty === 3) {
        if (Math.random() < 0.7) type = Math.random() < 0.5 ? "kick" : "snare";
      }

      if (type) pattern.push({ time: i * beatMs, type, id: i });
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
    const p = generatePattern();
    setSequence(p);
    setHits({});
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

    let beat = 0;

    const metro = setInterval(() => {
      click(beat % 4 === 0);
      beat++;
      if (beat >= TOTAL_BEATS) clearInterval(metro);
    }, beatMs);

    animate();
  };

  // 🎯 ANIMATION LOOP (SCROLLING)
  const animate = () => {
    const loop = () => {
      if (phase !== "playing") return;

      const now = performance.now();
      const elapsed = now - startTimeRef.current;

      if (elapsed > TOTAL_BEATS * beatMs) {
        finish();
        return;
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
  };

  // 🎯 TAP (REAL TIME)
  const tap = (type) => {
    if (phase !== "playing") return;

    const now = performance.now();
    const elapsed = now - startTimeRef.current;

    let closest = null;
    let minDiff = Infinity;

    sequence.forEach((note) => {
      const diff = Math.abs(elapsed - note.time);
      if (diff < minDiff) {
        minDiff = diff;
        closest = note;
      }
    });

    if (!closest) return;

    const correct =
      closest.type === type && minDiff < hitWindow && !hits[closest.id];

    setHits((prev) => ({
      ...prev,
      [closest.id]: correct ? "hit" : "miss",
    }));
  };

  // 🏁 SCORE
  const finish = () => {
    setPhase("result");

    const total = sequence.length;
    const correct = Object.values(hits).filter((h) => h === "hit").length;

    setScore(Math.round((correct / total) * 100));
  };

  // ⌨️ INPUT
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "a" || e.key === "1") tap("kick");
      if (e.key === "l" || e.key === "2") tap("snare");
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, sequence, hits]);

  // 🎨 RENDER NOTE POSITION
  const renderNotes = () => {
    if (!containerRef.current) return null;

    const now = performance.now();
    const elapsed = now - startTimeRef.current;

    return sequence.map((note) => {
      const delta = note.time - elapsed;
      const y = delta / 1000 * SCROLL_SPEED + 200;

      return (
        <div
          key={note.id}
          style={{
            position: "absolute",
            left: note.type === "kick" ? "30%" : "60%",
            top: y,
            width: 40,
            height: 40,
            borderRadius: 8,
            background: note.type === "kick" ? "#3498db" : "#9b59b6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          {hits[note.id] === "hit" && "✔"}
          {hits[note.id] === "miss" && "✖"}
        </div>
      );
    });
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Rhythm Drill</h2>

      <p style={{ color: "#aaa" }}>
        Hit notes when they reach the line.<br />
        <b>Kick = A / 1</b> &nbsp; | &nbsp; <b>Snare = L / 2</b>
      </p>

      {/* BPM */}
      <div style={{ marginBottom: 10 }}>
        BPM:
        <input
          type="number"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          style={{ width: 60, marginLeft: 6 }}
        />
      </div>

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

      {phase === "countdown" && (
        <h1 style={{ fontSize: 48 }}>{countdown}</h1>
      )}

      {phase === "idle" && <button onClick={start}>Start Drill</button>}

      {phase === "playing" && (
        <div
          ref={containerRef}
          style={{
            position: "relative",
            height: 300,
            border: "1px solid #333",
            overflow: "hidden",
            marginTop: 20,
          }}
        >
          {/* HIT LINE */}
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

          {renderNotes()}
        </div>
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