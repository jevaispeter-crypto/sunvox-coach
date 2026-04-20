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

    const lesson =
  curriculum.find((l) => l.order === progress.currentOrder) ||
  curriculum[0];

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
- Start with a compact but complete lesson on ONE concept.
- Teach the minimum knowledge required for real understanding and correct use.
- The lesson must be substantial enough to stand on its own: definition, why it matters, how it sounds/feels, common mistake, and how it applies in SunVox.
- Keep explanations concise, but never so short that the student cannot truly understand the concept.
- Do not give long academic background or unnecessary history.
- Prioritize high-ROI knowledge: what the student needs in order to hear it, use it, and avoid common errors.
- Systematically tie knowledge to action, hearing, or direct perception.
- Always connect theory to SunVox.
- Ask the student to compare, judge, or reflect.
- Do not be generic.
- Do not dump multiple loosely related concepts in one lesson.
- The lesson should feel like a strong mini-class followed by guided practice.

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

## Concept
Explain the concept clearly and concretely.
Include:
- what it is
- why it matters in music creation
- what the student should listen for / notice
- the most common beginner misunderstanding

## In SunVox
Give exact instructions for how to experience or apply the concept in SunVox.
Use concrete steps, line counts, pattern references, or module references when relevant.

## Core Drill
One focused exercise that directly trains this concept.

## One Change
One controlled variation that changes only one important parameter.

## Decision
Force the student to compare results and decide what changed or what worked better.

## Reflection Prompt
One short question that reveals whether the student actually understood the concept.

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

ADAPTATION RULES:
- If the student has recorded weaknesses, prioritize clarifying those concepts.
- If the student struggled with a concept, revisit it using a different explanation or exercise.
- If the student found lessons easy, slightly increase difficulty or complexity.
- Use reflection and struggledWith fields to adjust how you teach.

Each lesson MUST:
- include one concept only
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
      lessonTitle: `Lesson ${lesson.order} — ${lesson.topic}`,
      lessonText: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("LESSON ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}