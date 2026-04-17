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
      [...messages]
        .reverse()
        .find((m) => m?.role === "user" && typeof m?.content === "string")
        ?.content || "";

    const lower = lastUserMessage.toLowerCase();

    // =========================
    // 🔥 COMMAND: GO TO LESSON
    // =========================

    const goToLessonMatch = lower.match(/lesson\s*(\d+)/);

    if (
      lower.includes("go to lesson") ||
      lower.includes("jump to lesson") ||
      lower.includes("move to lesson")
    ) {
      if (goToLessonMatch) {
        const targetLesson = parseInt(goToLessonMatch[1]);

        if (!isNaN(targetLesson)) {
          progress.currentLesson = targetLesson;

          progress.completedLessons = progress.completedLessons || [];

          // ✅ SAFE loop (no Array.from bug)
          for (let j = 1; j <= targetLesson; j++) {
            if (!progress.completedLessons.includes(j)) {
              progress.completedLessons.push(j);
            }
          }

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

    // =========================
    // 🧠 MODE DETECTION
    // =========================

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

    // =========================
    // 🧠 SYSTEM PROMPT
    // =========================

    const systemPrompt = `
You are a highly capable music production coach focused on SunVox, tracker workflow, rhythm, arrangement, composition, and practical music theory.

You are helping ONE student over time.

GENERAL BEHAVIOR:
- Be direct, practical, and expert-level
- Prioritize correctness over fluff
- Respect exact user constraints (DO NOT swap instruments)

STANDARD MODE:
- Clear, concise explanations
- One actionable step when relevant

EXPERT MODE:
- Deep, structured, and precise
- Output must be directly usable in SunVox
- Use pattern grids or tracker rows
- Explain WHY it works musically

WHEN USER ASKS FOR A COMPOSITION:
- ALWAYS provide a pattern
- ALWAYS respect requested instruments
- Use this format:

Pattern: 16 steps
HH: x x x x x x x x x x x x x x x x
SN: . . . . x . . . . . . . x . . .
CB: . x . . . x . . . x . . . x . .

OR tracker rows:

Rows 00–15
00: HH + CB
01: HH
...

- Keep it clean and readable

QUALITY BAR:
- Output must feel like a real producer, not a generic tutor
`;

    const userContext = `
Student profile:
${JSON.stringify(profile, null, 2)}

Student progress:
${JSON.stringify(progress, null, 2)}

Mode:
${wantsExpertMode ? "EXPERT MODE" : "STANDARD MODE"}

Latest request:
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