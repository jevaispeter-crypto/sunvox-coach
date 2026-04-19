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

  const TOTAL_DRILLS = 5;
  const TARGETED_DRILLS = 3;

  const [measures, setMeasures] = useState(2);
  const [lineFlash, setLineFlash] = useState(null);
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

  const [sessionFeedback, setSessionFeedback] = useState(null);
  const [recommendedSettings, setRecommendedSettings] = useState(null);

  const [targetedMode, setTargetedMode] = useState(false);
  const [targetedReason, setTargetedReason] = useState(null);

  const [drillIndex, setDrillIndex] = useState(0);
  const [sessionScores, setSessionScores] = useState([]);

  const earlyCountRef = useRef(0);
  const lateCountRef = useRef(0);
  const perfectCountRef = useRef(0);
  const missCountRef = useRef(0);

  const totalStepsRef = useRef(0);
  const totalCorrectRef = useRef(0);

  const startTimeRef = useRef(0);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const lastStepRef = useRef(-1);
  const heardStepsRef = useRef([]);
  const resultsRef = useRef([]);
  const audioCtxRef = useRef(null);

  const sequenceRef = useRef([]);
  const targetedPatternRef = useRef(null);

  const isTouchDevice =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(pointer: coarse)")?.matches ||
      "ontouchstart" in window);

  const kickRef = useRef(null);
  const snareRef = useRef(null);

  const currentDrillLimit = targetedMode ? TARGETED_DRILLS : TOTAL_DRILLS;

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

  useEffect(() => {
    if (phase === "result" && sessionScores.length === currentDrillLimit) {
      const feedback = buildSessionFeedback(sessionScores);
      setSessionFeedback(feedback);
      setRecommendedSettings(feedback.recommendations);
      setTargetedReason(feedback.focus);
    }
  }, [phase, sessionScores, currentDrillLimit]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "a" || e.key === "1") tap("kick");
      if (e.key === "l" || e.key === "2") tap("snare");
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, sequence]);

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

  const triggerLineFlash = (label) => {
    let color = "#ffffff";

    if (label === "Perfect") color = "#2ecc71";
    else if (label === "Early" || label === "Late") color = "#f1c40f";
    else if (label === "Miss") color = "#e74c3c";

    setLineFlash(color);

    setTimeout(() => {
      setLineFlash(null);
    }, 120);
  };

  const clearTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const getFocusExplanation = (focus) => {
    switch (focus) {
      case "early":
        return "Targeted drills will add more space between notes to help you stop rushing.";
      case "late":
        return "Targeted drills will use more predictable note timing to help you react earlier.";
      case "consistency":
        return "Targeted drills will repeat the same short pattern to build consistency.";
      case "precision":
        return "Targeted drills will simplify note timing so you can focus on cleaner hits.";
      default:
        return null;
    }
  };

  const resetSessionAnalysis = () => {
    setSessionFeedback(null);
    setRecommendedSettings(null);
    setTargetedReason(null);
    earlyCountRef.current = 0;
    lateCountRef.current = 0;
    perfectCountRef.current = 0;
    missCountRef.current = 0;
    targetedPatternRef.current = null;
  };

  const startSession = (useTargeted = false) => {
    setDrillIndex(0);
    setSessionScores([]);
    resetSessionAnalysis();
    setTargetedMode(useTargeted);
    start(useTargeted);
  };

  const goToManualAdjust = () => {
    clearTimers();
    setPhase("idle");
    setDrillIndex(0);
    setSessionScores([]);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setElapsedMs(0);
    setTargetedMode(false);
  };

  const generatePattern = (focusOverride = null) => {
    const focus = focusOverride || null;
    const pattern = new Array(STEPS_PER_MEASURE).fill(null);

    // Targeted modes override default difficulty behavior.
    if (focus === "early") {
      // More spacing to stop rushing.
      for (let i = 0; i < STEPS_PER_MEASURE; i++) {
        if (i === 0 || i === 8) pattern[i] = "kick";
        if (i === 4 || i === 12) pattern[i] = "snare";

        const isEighth = i % 2 === 0 && i % 4 !== 0;
        if (isEighth && Math.random() < 0.12) {
          pattern[i] = Math.random() < 0.5 ? "kick" : "snare";
        }
      }
      return pattern;
    }

    if (focus === "late") {
      // Predictable timing to help anticipation.
      for (let i = 0; i < STEPS_PER_MEASURE; i++) {
        if (i === 0 || i === 8) pattern[i] = "kick";
        if (i === 4 || i === 12) pattern[i] = "snare";
        if (i === 2 || i === 10) pattern[i] = "kick";
      }
      return pattern;
    }

    if (focus === "consistency") {
      // Deterministic short pattern.
      pattern[0] = "kick";
      pattern[4] = "snare";
      pattern[8] = "kick";
      pattern[12] = "snare";
      pattern[14] = "kick";
      return pattern;
    }

    if (focus === "precision") {
      // Controlled quarter + eighth timing.
      for (let i = 0; i < STEPS_PER_MEASURE; i++) {
        if (i === 0 || i === 8) pattern[i] = "kick";
        if (i === 4 || i === 12) pattern[i] = "snare";

        const isEighth = i % 2 === 0 && i % 4 !== 0;
        if (isEighth && Math.random() < 0.22) {
          pattern[i] = Math.random() < 0.5 ? "kick" : "snare";
        }
      }
      return pattern;
    }

    // Default difficulty-based generation.
    for (let i = 0; i < STEPS_PER_MEASURE; i++) {
      const isQuarter = i % 4 === 0;
      const isEighth = i % 2 === 0 && !isQuarter;

      if (difficulty === 1) {
        if (i === 0 || i === 8) pattern[i] = "kick";
        if (i === 4 || i === 12) pattern[i] = "snare";

        if (isEighth && Math.random() < 0.25) {
          pattern[i] = Math.random() < 0.5 ? "kick" : "snare";
        }

        if (!isEighth && !isQuarter && Math.random() < 0.05) {
          pattern[i] = Math.random() < 0.5 ? "kick" : "snare";
        }
      }

      if (difficulty === 2) {
        if (i === 0 || i === 8) pattern[i] = "kick";
        if (i === 4 || i === 12) pattern[i] = "snare";

        if (isEighth && Math.random() < 0.5) {
          pattern[i] = Math.random() < 0.5 ? "kick" : "snare";
        }

        if (!isEighth && !isQuarter && Math.random() < 0.15) {
          pattern[i] = Math.random() < 0.5 ? "kick" : "snare";
        }
      }

      if (difficulty === 3) {
        if (Math.random() < 0.7) {
          pattern[i] = Math.random() < 0.5 ? "kick" : "snare";
        }

        if (Math.random() < 0.15) {
          pattern[i] = null;
        }
      }
    }

    return pattern;
  };

  const start = (useTargeted = targetedMode) => {
    clearTimers();

    let fullSequence = [];
    const focus = useTargeted ? targetedReason : null;

    // For consistency work, reuse the same short pattern across targeted drills.
    let lockedPattern = null;
    if (useTargeted && focus === "consistency") {
      if (!targetedPatternRef.current) {
        targetedPatternRef.current = generatePattern("consistency");
      }
      lockedPattern = targetedPatternRef.current;
    }

    for (let m = 0; m < measures; m++) {
      const nextPattern = lockedPattern || generatePattern(focus);
      fullSequence = [...fullSequence, ...nextPattern];
    }

    setSequence(fullSequence);
    sequenceRef.current = fullSequence;

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
        beginEntryPhase();
      }
    }, 16);
  };

  const beginEntryPhase = () => {
    setPhase("entry");
    startTimeRef.current = performance.now();
    lastStepRef.current = -1;

    intervalRef.current = setInterval(() => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;

      if (Math.floor(elapsed / beatMs) !== lastStepRef.current) {
        playMetronomeClick(true);
        lastStepRef.current = Math.floor(elapsed / beatMs);
      }

      if (elapsed > beatMs * 2) {
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

      const step = Math.floor((elapsed - startOffset) / stepMs);

      if (step !== lastStepRef.current && step >= 0) {
        if (step % 4 === 0) {
          playMetronomeClick((step / 4) % 4 === 0);
        }
        lastStepRef.current = step;
      }

      if (step >= sequenceRef.current.length) {
        clearTimers();
        finish();
      }
    }, 16);
  };

  const tap = (type) => {
    if (phase === "entry") {
      clearTimers();
      beginRepeatPhase();
      return;
    }

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
      triggerLineFlash(label);
      const updated = [...prev];
      updated[stepIndex] = label;
      return updated;
    });

    if (label === "Perfect") perfectCountRef.current += 1;
    if (label === "Early") earlyCountRef.current += 1;
    if (label === "Late") lateCountRef.current += 1;
    if (label === "Miss") missCountRef.current += 1;

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

  const buildSessionFeedback = (scores) => {
    const avgScore = Math.round(
      scores.reduce((sum, s) => sum + s, 0) / scores.length
    );

    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const scoreSpread = maxScore - minScore;

    const early = earlyCountRef.current;
    const late = lateCountRef.current;
    const perfect = perfectCountRef.current;
    const miss = missCountRef.current;

    const issues = [];
    const actions = [];

    // Tempo / overload
    if (avgScore < 60 || miss >= 5) {
      issues.push(
        `Your average score was ${avgScore}%, which suggests the current challenge level is above your reliable control range.`
      );
      actions.push(
        `For the next session, reduce one difficulty lever first and rebuild control before pushing speed again.`
      );
    }

    // Consistency
    if (scoreSpread >= 25) {
      issues.push(
        `Your drill scores ranged from ${minScore}% to ${maxScore}%, which suggests inconsistency across attempts.`
      );
      actions.push(
        `For the next session, use shorter, more repeatable drills and aim for a tighter score range rather than one strong run.`
      );
    }

    // Early / late
    if (early >= late + 3) {
      issues.push(
        `You hit early more often than late, which suggests you are anticipating instead of waiting for full alignment.`
      );
      actions.push(
        `Next session, focus on letting the moving note fully overlap the target line before tapping.`
      );
    } else if (late >= early + 3) {
      issues.push(
        `You hit late more often than early, which suggests your movement is starting after the note reaches the line.`
      );
      actions.push(
        `Next session, prepare your tap slightly earlier so you arrive on the line instead of reacting after it.`
      );
    }

    // Precision
    if (perfect < early + late && perfect + early + late > 0) {
      issues.push(
        `Many successful hits were Early/Late rather than Perfect, so your timing is close but not yet consistently precise.`
      );
      actions.push(
        `Next session, prioritize clean center-line alignment rather than just registering the note.`
      );
    }

    let recommendedBpm = null;
    let recommendedMeasures = null;

    // More conservative BPM logic.
    if (avgScore < 60 || miss >= 5) {
      recommendedBpm = Math.max(50, safeBpm - 15);
    } else if (avgScore > 85 && scoreSpread < 15) {
      recommendedBpm = safeBpm + 5;
    }

    if (scoreSpread >= 25) {
      recommendedMeasures = 1;
    }

    let focus = null;
    if (early >= late + 3) {
      focus = "early";
    } else if (late >= early + 3) {
      focus = "late";
    } else if (scoreSpread >= 25) {
      focus = "consistency";
    } else if (perfect < early + late) {
      focus = "precision";
    }

    const scoredIssues = issues.map((text, i) => {
      let weight = 1;
      if (text.includes("average score")) weight = 3;
      if (text.includes("ranged")) weight = 3;
      if (text.includes("early") || text.includes("late")) weight = 2;
      if (text.includes("Perfect")) weight = 2;
      return { text, action: actions[i], weight };
    });

    scoredIssues.sort((a, b) => b.weight - a.weight);
    const topIssues = scoredIssues.slice(0, 2);

    return {
      title: "Session Feedback",
      issues: topIssues.map((i) => i.text),
      actions: topIssues.map((i) => i.action),
      focus,
      recommendations: {
        bpm:
          recommendedBpm !== null && recommendedBpm !== safeBpm
            ? recommendedBpm
            : null,
        measures:
          recommendedMeasures !== null && recommendedMeasures !== measures
            ? recommendedMeasures
            : null,
      },
    };
  };

  const finish = () => {
    const total = totalStepsRef.current || 1;
    const correct = totalCorrectRef.current;
    const finalScore = Math.min(100, Math.round((correct / total) * 100));

    setScore(finalScore);
    setSessionScores((prevScores) => [...prevScores, finalScore]);

    setDrillIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;

      if (nextIndex < currentDrillLimit) {
        setTimeout(() => {
          start(targetedMode);
        }, 1000);
        return nextIndex;
      } else {
        setPhase("result");
        return prevIndex;
      }
    });
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Rhythm Drill</h2>

      <p style={{ color: "#aaa" }}>
        Listen first, then repeat the rhythm from memory
        <br />
        <b>Kick = A / 1</b> | <b>Snare = L / 2</b>
      </p>

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

      <div>
        Measures:
        <select
          value={measures}
          onChange={(e) => setMeasures(Number(e.target.value))}
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
        </select>
      </div>

      <div>
        Drill {drillIndex + 1} / {currentDrillLimit} | Combo: {combo} | Max:{" "}
        {maxCombo}
      </div>

      <div>
        BPM:
        <input
          type="number"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          style={{ width: 60 }}
        />
      </div>

      {phase === "countdown" && <h1>{countdown}</h1>}
      {phase === "idle" && (
        <button onClick={() => startSession(false)}>Start Session</button>
      )}
      {phase === "hearing" && <h3>Listen...</h3>}
      {phase === "gap" && <h3>Get ready...</h3>}
      {phase === "entry" && <h3>Tap to lock the beat</h3>}

      {phase === "playing" && (
        <>
          <div style={{ position: "relative", height: 300, overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                top: 200,
                height: 4,
                background: lineFlash || "#ffffff",
                transition: "background 0.1s ease",
                left: 0,
                right: 0,
                boxShadow: "0 0 8px rgba(255,255,255,0.45)",
                zIndex: 1,
              }}
            />

            {sequence.map((type, i) => {
              if (!type) return null;

              const y =
                ((i * stepMs + startOffset - elapsedMs) / 1000) * scrollSpeed +
                200;

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

          <div
            style={{
              marginTop: 20,
              display: "flex",
              justifyContent: "center",
              gap: 20,
            }}
          >
            <button
              onClick={() => tap("kick")}
              style={{
                width: isTouchDevice ? 140 : 110,
                height: isTouchDevice ? 140 : 110,
                background: "#3498db",
                color: "white",
                borderRadius: 16,
              }}
            >
              KICK
            </button>

            <button
              onClick={() => tap("snare")}
              style={{
                width: isTouchDevice ? 140 : 110,
                height: isTouchDevice ? 140 : 110,
                background: "#9b59b6",
                color: "white",
                borderRadius: 16,
              }}
            >
              SNARE
            </button>
          </div>
        </>
      )}

      {phase === "result" && (
        <>
          {sessionScores.length === currentDrillLimit ? (
            <>
              <h3>
                Session Score:{" "}
                {Math.round(
                  sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length
                )}
                %
              </h3>
              <p>Drills: {sessionScores.join(" / ")}</p>

              {sessionFeedback && (
                <div
                  style={{
                    marginTop: 20,
                    textAlign: "left",
                    maxWidth: 700,
                    marginInline: "auto",
                    background: "#111",
                    border: "1px solid #333",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  {(recommendedSettings?.bpm !== null ||
                    recommendedSettings?.measures !== null ||
                    targetedReason) && (
                    <div
                      style={{
                        marginBottom: 20,
                        background: "#0d1b2a",
                        border: "1px solid #1b263b",
                        borderRadius: 12,
                        padding: 16,
                      }}
                    >
                      <h4 style={{ marginTop: 0 }}>Suggested next session</h4>

                      {targetedReason && (
                        <p>{getFocusExplanation(targetedReason)}</p>
                      )}

                      {recommendedSettings?.bpm !== null && (
                        <p>
                          BPM: {safeBpm} → {recommendedSettings.bpm}
                        </p>
                      )}

                      {recommendedSettings?.measures !== null && (
                        <p>
                          Measures: {measures} → {recommendedSettings.measures}
                        </p>
                      )}

                      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                        <button
                          onClick={() => {
                            if (recommendedSettings?.bpm !== null) {
                              setBpm(recommendedSettings.bpm);
                            }
                            if (recommendedSettings?.measures !== null) {
                              setMeasures(recommendedSettings.measures);
                            }
                            startSession(Boolean(targetedReason));
                          }}
                        >
                          Start Next Session
                        </button>

                        <button onClick={goToManualAdjust}>
                          Adjust Manually
                        </button>
                      </div>
                    </div>
                  )}

                  <h3 style={{ marginTop: 0 }}>{sessionFeedback.title}</h3>

                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ marginBottom: 8 }}>1. What happened</h4>
                    {sessionFeedback.issues.map((item, idx) => (
                      <p key={`issue-${idx}`} style={{ margin: "6px 0" }}>
                        - {item}
                      </p>
                    ))}
                  </div>

                  <div>
                    <h4 style={{ marginBottom: 8 }}>2. What to do next session</h4>
                    {sessionFeedback.actions.map((item, idx) => (
                      <p key={`action-${idx}`} style={{ margin: "6px 0" }}>
                        - {item}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <h3>Score: {score}%</h3>
          )}

          <p>Max Combo: {maxCombo}</p>
          <button onClick={() => startSession(false)}>Retry Session</button>
        </>
      )}
    </div>
  );
}