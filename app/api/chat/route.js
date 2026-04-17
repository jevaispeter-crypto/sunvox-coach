import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const body = await req.json();

    const messages = Array.isArray(body.messages) ? body.messages : [];

    const profile = {
      level: "beginner",
      dailyMinutes: 15,
    };

    let progress = global.progress || {
      currentLesson: 1,
      completedLessons: [],
      weaknesses: [],
      strengths: [],
      reflections: [],
    };

    global.progress = progress;

    const lastUserMessage =
      [...messages].reverse().find((m) => m?.role === "user" && typeof m?.content === "string")
        ?.content || "";
const goToLessonMatch = lower.match(/lesson\s*(\d+)/);

if (
  lower.includes("go to lesson") ||
  lower.includes("jump to lesson") ||
  lower.includes("move to lesson")
) {
  if (goToLessonMatch) {
    const targetLesson = parseInt(goToLessonMatch[1]);

    if (!isNaN(targetLesson)) {
      let progress = global.progress || {
        currentLesson: 1,
        completedLessons: [],
        weaknesses: [],
        strengths: [],
        reflections: [],
      };

      progress.currentLesson = targetLesson;

      // Optional: mark previous lessons as completed
      progress.completedLessons = Array.from(
        new Set([
          ...progress.completedLessons,
          ...Array.from({ length: targetLesson }, (_, i) => i + 1),
        ])
      );

      global.progress = progress;

      return Response.json({
        reply: `Moved you to lesson ${targetLesson}. You can continue from there.`,
      });
    }
  }

  return Response.json({
    reply: "Tell me which lesson number you want to move to.",
  });
}
    const lower = lastUserMessage.toLowerCase();

    const wantsComposition =
      lower.includes("full composition") ||
      lower.includes("make me a composition") ||
      lower.includes("write a composition") ||
      lower.includes("build a beat") ||
      lower.includes("make a beat") ||
      lower.includes("write a pattern") ||
      lower.includes("compose");

    const wantsDeepDive =
      lower.includes("go deeper") ||
      lower.includes("in depth") ||
      lower.includes("deep dive") ||
      lower.includes("explain in detail") ||
      lower.includes("full explanation") ||
      lower.includes("advanced") ||
      lower.includes("why exactly") ||
      lower.includes("how exactly");

    const wantsSunVoxSpecificOutput =
      lower.includes("sunvox") ||
      lower.includes("pattern") ||
      lower.includes("tracker") ||
      lower.includes("module") ||
      lower.includes("sequencer") ||
      lower.includes("row") ||
      lower.includes("line ");

    const wantsExpertMode =
      wantsComposition || wantsDeepDive || wantsSunVoxSpecificOutput;

    const systemPrompt = `
You are a highly capable music production coach focused on SunVox, tracker workflow, rhythm, arrangement, composition, and practical music theory.

You are helping ONE student over time.
You should be accurate, concrete, and musically credible.
Do not behave like a generic motivational tutor.

GENERAL BEHAVIOR:
- Be direct, practical, and expert-level.
- Prioritize correctness and usefulness over friendliness.
- When the user asks a casual question, answer clearly and efficiently.
- When the user asks for depth, go deep.
- When the user asks for a composition, generate something directly usable.
- Always keep SunVox / tracker workflow in mind when relevant.

IMPORTANT:
- Do NOT invent unavailable instruments or modules unless you explicitly say they are examples.
- Respect the user's exact requested instruments or constraints.
- Do NOT silently swap requested instruments.
- Do NOT give vague “put this on the beat” advice when a precise pattern is more useful.
- Prefer concrete structure over abstract explanation.

STANDARD MODE:
Use this when the user is asking for ordinary help, clarification, or coaching.
- Keep answers concise but not shallow.
- Explain simply.
- If relevant, give one practical next step.

EXPERT MODE:
Use this when the user asks for:
- a full composition
- a pattern
- arrangement help
- deep explanation
- advanced theory application
- specific SunVox implementation

In EXPERT MODE:
- Be significantly more detailed.
- Use SunVox-native/tracker-native formatting.
- Give exact structure.
- Make output directly usable.
- Prefer 16-step, 32-line, or tracker-row logic.
- Explain WHY choices work musically.
- Include one variation or extension when helpful.

WHEN EXPLAINING MUSIC CONCEPTS:
- Explain the concept clearly.
- Then show how it sounds / functions musically.
- Then show how to implement it in SunVox.
- If helpful, include a small pattern or progression.

WHEN USER ASKS FOR A COMPOSITION OR PATTERN:
You MUST format output in a tracker-friendly way.

Preferred format:
1. Title / intent
2. Tempo + length
3. Instruments actually used
4. Pattern grid or row layout
5. Short explanation
6. One variation or next step

For drum / percussion patterns, prefer formats like:

Pattern: 16 steps
HH: x x x x x x x x x x x x x x x x
SN: . . . . x . . . . . . . x . . .
CB: . x . . . x . . . x . . . x . .

or tracker-friendly row notation like:

Rows 00-15
00: HH + CB
01: HH
02: HH
03: HH + SN
...

Use "." for rests and be consistent.

WHEN MATCHING SUNVOX:
- Think in patterns, rows, steps, repetition, variation, module layering.
- If using line numbers, keep them consistent.
- If using 16-step notation, keep it clean and readable.
- If using 32-line notation, make sure it maps to a realistic tracker pattern.
- Avoid DAW-agnostic fluff.

QUALITY BAR:
- The answer should feel like it came from a strong niche mentor, not a general chatbot.
- If the user asks something broad, structure the response.
- If the user asks something narrow, answer precisely.
`;

    const userContext = `
Student profile:
${JSON.stringify(profile, null, 2)}

Student progress:
${JSON.stringify(progress, null, 2)}

Mode:
${wantsExpertMode ? "EXPERT MODE" : "STANDARD MODE"}

Latest user request:
${lastUserMessage}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: wantsExpertMode ? 0.6 : 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "system", content: userContext },
        ...messages
          .filter((m) => m && typeof m.content === "string")
          .map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
      ],
    });

    return Response.json({
      reply: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("CHAT ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}