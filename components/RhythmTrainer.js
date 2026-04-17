"use client";

import { useEffect, useRef, useState } from "react";

export default function RhythmTrainer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(90);
  const [score, setScore] = useState(null);
  const [pattern, setPattern] = useState([
    { time: 0, type: "kick" },
    { time: 1, type: "snare" },
    { time: 2, type: "kick" },
    { time: 3, type: "snare" },
  ]);

  const startTimeRef = useRef(null);
  const tapsRef = useRef([]);

useEffect(() => {
  if (!isPlaying) return;

    const handler = (e) => {
    if (e.key === "a") tap("kick");
    if (e.key === "l") tap("snare");
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [isPlaying]);

  // 🎧 METRONOME
  useEffect(() => {
    if (!isPlaying) return;

    const interval = (60 / bpm) * 1000;

    const id = setInterval(() => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.frequency.value = 1000;
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }, interval);

    return () => clearInterval(id);
  }, [isPlaying, bpm]);

  // 🎯 START SESSION
  const start = () => {
    tapsRef.current = [];
    startTimeRef.current = performance.now();
    setScore(null);
    setIsPlaying(true);

    // stop after 4 seconds
    setTimeout(() => {
      setIsPlaying(false);
      evaluate();
    }, 4000);
  };

  // 👇 TAP INPUT
  const tap = (type = "kick") => {
    if (!isPlaying) return;

    const now = performance.now();
    const relative = (now - startTimeRef.current) / 1000;

    tapsRef.current.push({
      time: relative,
      type,
    });
  };

  // 🎯 SCORING
  const evaluate = () => {
    const beatDuration = 60 / bpm;

    let totalError = 0;
    let count = 0;

    pattern.forEach((expected) => {
      const closest = tapsRef.current.reduce((prev, curr) => {
        return Math.abs(curr.time - expected.time * beatDuration) <
          Math.abs(prev.time - expected.time * beatDuration)
          ? curr
          : prev;
      }, tapsRef.current[0]);

      if (closest) {
        const error = Math.abs(
          closest.time - expected.time * beatDuration
        );
        totalError += error;
        count++;
      }
    });

    const avgError = totalError / count;
    const finalScore = Math.max(0, 100 - avgError * 200);

    setScore(finalScore.toFixed(0));
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Rhythm Trainer</h2>

      <button onClick={start} disabled={isPlaying}>
        {isPlaying ? "Playing..." : "Start"}
      </button>

      <div style={{ marginTop: 20 }}>
        <button onClick={() => tap("kick")}>Kick (A)</button>
        <button onClick={() => tap("snare")}>Snare (L)</button>
      </div>

      <p style={{ marginTop: 20 }}>
        BPM:
        <input
          type="number"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          style={{ marginLeft: 10 }}
        />
      </p>

      {score && (
        <h3>
          Score: {score}%
        </h3>
      )}
    </div>
  );
}