import OpenAI from "openai";
import fs from "fs";
import path from "path";

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
    const { messages } = await req.json();

    const profile = readJson(path.join(process.cwd(), "data", "profile.json"), {});
    const progress = readJson(path.join(process.cwd(), "data", "progress.json"), {});

    const theory = loadKnowledgeFolder("theory");
    const sunvox = loadKnowledgeFolder("sunvox");
    const bridge = loadKnowledgeFolder("bridge");

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
        { role: "system", content: "Theory Knowledge:\n" + theory },
        { role: "system", content: "SunVox Knowledge:\n" + sunvox },
        { role: "system", content: "Bridge Knowledge:\n" + bridge },
        ...messages,
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