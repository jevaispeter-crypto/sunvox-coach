import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { curriculum } from "@/lib/curriculum";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function loadKnowledgeFolder(folderName) {
  const folderPath = path.join(process.cwd(), "knowledge", folderName);
  if (!fs.existsSync(folderPath)) return "";

  const files = fs.readdirSync(folderPath);
  let content = "";

  for (const file of files) {
    if (file.endsWith(".md")) {
      const filePath = path.join(folderPath, file);
      content += `\n\n--- ${file} ---\n${fs.readFileSync(filePath, "utf-8")}`;
    }
  }

  return content;
}

export async function POST(req) {
  try {
    const profilePath = path.join(process.cwd(), "data", "profile.json");
    const progressPath = path.join(process.cwd(), "data", "progress.json");

    const profile = {
      level: "beginner",
      dailyMinutes: 15,
    };

    const body = await req.json();

    let progress = body.progress || {
      currentOrder: 1,
    };

    const completedCount = progress.completedLessons?.length || 0;

    const isCheckpoint =
      progress.currentOrder > 1 &&
      (progress.currentOrder - 1) % 5 === 0 &&
      !body?.forceNextLesson;

    const lesson =
      curriculum.find((l) => l.order === progress.currentOrder) ||
      curriculum[0];

    const isAdvanced = progress.currentOrder >= 8;

    const theory = loadKnowledgeFolder("theory");
    const sunvox = loadKnowledgeFolder("sunvox");
    const bridge = loadKnowledgeFolder("bridge");

    const standardSystemPrompt = `

You are a strict but supportive music theory tutor and SunVox coach.

Your job:
- teach progressively
- build on prior lessons
- adapt to the user's weaknesses and strengths
- act like a real teacher, not a generic chatbot


RULES (GLOBAL):

- Start with a compact but complete lesson focused on one primary concept (STANDARD LESSON only)
- Teach the minimum knowledge required for real understanding and correct use
- Prioritize high-ROI knowledge
- Always connect theory to SunVox
- Avoid unnecessary abstraction
- Do not be generic
- The result must feel musical, not mechanical


STUDENT CONTEXT:

The student is learning:
- music theory
- SunVox
- composition
- sound design and modulation

LEARNING STAGE:
${isAdvanced ? "ADVANCED" : "FOUNDATION"}

--------------------------------------------------

STANDARD LESSON RULES:

- Introduce ONLY ONE new concept
- Combine with previous concepts if relevant
- The lesson must feel like a mini-class + guided practice

ADVANCED LESSONS:
- MUST combine the current concept with at least 2 previously learned concepts
- MUST explicitly name the concepts being combined
- MUST result in a short, musically usable output
- MUST resemble a real techno production task
- MUST include clear musical intent
- MUST stay buildable in under ${profile.dailyMinutes || 15} minutes
- MUST state the musical role (bass, groove, texture, etc.)

CONSTRAINTS:
- Do NOT introduce multiple new concepts
- Do NOT re-explain basics unless needed
- Do NOT give abstract instructions

QUALITY BAR:
- The student should feel like they created something musical

--------------------------------------------------

STANDARD LESSON STRUCTURE (STRICT):

# Lesson Title

## Concept
Explain clearly:
- what it is
- why it matters
- what to listen for
- common mistake

## In SunVox
Concrete steps

## Core Drill
One focused exercise

## One Change
One controlled variation

## Decision
Force comparison

## Reflection Prompt
Short question

## Integration (ADVANCED ONLY)
What concepts are being combined and why

Do not write more than necessary.
`;

    const checkpointSystemPrompt = `
You are a music production coach guiding a structured checkpoint session in SunVox.

This is NOT a lesson.

This is a guided application session.

Your role:
- help the student apply previously learned concepts
- guide them to build something musical
- do NOT teach new theory

--------------------------------------------------

RULES:

- Do NOT introduce new concepts
- Do NOT explain theory
- Do NOT include "Concept", "Core Drill", "One Change", or "Decision"
- Do NOT structure this like a lesson

- MUST combine at least 2–3 previously learned concepts
- MUST produce a musical result (groove, loop, texture)
- MUST feel like real music creation

- Keep instructions concrete and step-by-step
- Keep it achievable in under ${profile.dailyMinutes || 15} minutes

--------------------------------------------------

STRUCTURE (STRICT):

# Checkpoint Exercise: [Title]

## Goal
What the student will build

## Build Steps
Clear, sequential steps

## What To Listen For
What should improve musically

## Optional Variation
One simple improvement

## Reflection Prompt
Short, outcome-focused

--------------------------------------------------

If you output a Concept section or anything resembling a lesson, you are wrong.
`;

    const userPrompt = `
Student profile:
${JSON.stringify(profile, null, 2)}

Student progress:
${JSON.stringify(progress, null, 2)}

Current lesson:
${JSON.stringify(lesson, null, 2)}

Generate today's lesson.

STRICT RULES:
- Do NOT ask what the student wants
- Do NOT give multiple options
- Teach exactly this lesson only
- Keep it within ${profile.dailyMinutes || 15} minutes

ADAPTATION RULES:
- If the student has recorded weaknesses, prioritize clarifying those concepts.
- If the student struggled with a concept, revisit it using a different explanation or exercise.
- If the student found lessons easy, slightly increase difficulty or complexity.
- Use reflection and struggledWith fields to adjust how you teach.

Each lesson MUST:
- focus on ONE primary concept
- include a SunVox task
- include a perception goal
- include a forced comparison

Keep it practical, minimal, and structured.

QUALITY BAR:
- The Concept section must be more than a one-line definition.
- It should usually be 5-10 sentences, unless the concept is extremely simple.
- The student should be able to understand both the meaning and the practical use of the concept from this lesson alone.
- If the explanation is too short to teach real understanding, expand it.
- If the explanation contains fluff or textbook filler, compress it.

If the student has completed all lessons,
generate a new lesson by slightly increasing difficulty of previous topics.
`;

    // ✅ FIX: moved inside function and AFTER prompts
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: isCheckpoint ? checkpointSystemPrompt : standardSystemPrompt },
        { role: "system", content: "Theory Knowledge:\n" + theory },
        { role: "system", content: "SunVox Knowledge:\n" + sunvox },
        { role: "system", content: "Bridge Knowledge:\n" + bridge },
        { role: "user", content: userPrompt },
      ],
    });

    // ✅ checkpoint AFTER completion
    if (isCheckpoint) {
      return Response.json({
        lessonId: null,
        lessonTitle: `Checkpoint Session`,
        lessonText: completion.choices[0].message.content,
        isCheckpoint: true,
        progress: {
          ...progress,
          lastCheckpoint: completedCount,
        },
      });
    }

    return Response.json({
      lessonId: lesson.id,
      lessonTitle: `Lesson ${lesson.order} — ${lesson.topic}`,
      lessonText: completion.choices[0].message.content,
      progress,
    });
  } catch (error) {
    console.error("LESSON ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}