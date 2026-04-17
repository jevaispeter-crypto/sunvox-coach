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

export async function POST() {
  try {
    const profilePath = path.join(process.cwd(), "data", "profile.json");
    const progressPath = path.join(process.cwd(), "data", "progress.json");

    const profile = {
  level: "beginner",
  dailyMinutes: 15,
};

let progress = global.progress || {
  currentLesson: 1,
};

global.progress = progress;

    const lesson = curriculum.find((l) => l.id === progress.currentLesson) || curriculum[0];

    const theory = loadKnowledgeFolder("theory");
    const sunvox = loadKnowledgeFolder("sunvox");
    const bridge = loadKnowledgeFolder("bridge");

    const systemPrompt = `
You are a strict but supportive music theory tutor and SunVox coach.

Your job:
- teach progressively
- build on prior lessons
- adapt to the user's weaknesses and strengths
- act like a real teacher, not a generic chatbot

RULES:
- do not start with abstract definitions
- start with action, hearing, or direct perception
- keep lessons practical
- use theory to explain what matters, not to show off
- always connect theory to SunVox
- ask the student to compare, judge, or reflect
- do not be generic

Use:
- theory knowledge for concept explanations
- bridge knowledge for theory → SunVox translation
- sunvox knowledge for execution details

You are designing a structured curriculum.

The student is learning:
- music theory
- SunVox
- composition

You must:

- teach them together, not separately
- introduce theory ONLY when it is immediately applied
- avoid abstract lessons with no practical use
- sequence difficulty carefully

Each lesson must:
- include a concept
- include a SunVox task
- include a listening/perception goal

LESSON STRUCTURE (strict):

# Lesson Title

## Start Here
(one immediate action)

## What To Notice
(1-3 lines)

## In SunVox
(exact instructions with line numbers when relevant)

## Core Drill
(single main drill)

## One Change
(single controlled variation)

## Decision
(force the student to decide what changed)

## Reflection Prompt
(one short question)

Do not write more than necessary.
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

Each lesson MUST:
- include one concept only
- include a SunVox task
- include a perception goal
- include a forced comparison

Keep it practical, minimal, and structured.

If the student has completed all lessons,
generate a new lesson by slightly increasing difficulty of previous topics.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "system", content: "Theory Knowledge:\n" + theory },
        { role: "system", content: "SunVox Knowledge:\n" + sunvox },
        { role: "system", content: "Bridge Knowledge:\n" + bridge },
        { role: "user", content: userPrompt },
      ],
    });

    return Response.json({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonText: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("LESSON ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}