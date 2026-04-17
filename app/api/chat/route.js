import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const body = await req.json();

    // ✅ SAFE messages handling
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const profile = {
      level: "beginner",
      dailyMinutes: 15,
    };

    // 🔥 VERCEL-SAFE MEMORY
    let progress = global.progress || {
      currentLesson: 1,
      completedLessons: [],
      weaknesses: [],
      strengths: [],
      reflections: [],
    };

    global.progress = progress;

    const systemPrompt = `
You are a music theory tutor and SunVox coach helping ONE student.

You are NOT generating lessons here.
You are answering questions, clarifying confusion, and helping the student improve.

---

CORE BEHAVIOR:

- Be clear and practical
- Adapt to the student's level and progress
- Reference their past lessons when useful
- Focus on understanding and application

---

WHEN EXPLAINING:

- Start simple
- Use examples
- Keep explanations concise (3–6 lines unless needed)
- Avoid unnecessary jargon

---

WHEN RELEVANT:

- Show how to apply the concept in SunVox
- Use simple patterns or line numbers
- Suggest a small experiment if helpful

---

DO NOT:

- force lesson structure
- generate full lessons unless explicitly asked
- be overly verbose
- give abstract theory without application

---

STYLE:

- Talk like a teacher helping a student 1-on-1
- Clear, direct, helpful
`;

    const userContext = `
Student profile:
${JSON.stringify(profile, null, 2)}

Student progress:
${JSON.stringify(progress, null, 2)}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "system", content: userContext },

        // ✅ SAFE message pipeline
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