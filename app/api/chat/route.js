import fs from "fs";
import path from "path";
import { curriculum } from "@/lib/curriculum";

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function POST(req) {
  try {
    const body = await req.json();

    // ✅ SAFE INPUT HANDLING (THIS FIXES YOUR BUG)
    const lessonId = body.lessonId ?? 1;
    const reflection =
      typeof body.reflection === "string" ? body.reflection : "";
    const feltEasy = !!body.feltEasy;
    const struggledWith =
      typeof body.struggledWith === "string" ? body.struggledWith : "";

    const progressPath = path.join(process.cwd(), "data", "progress.json");

    const progress = readJson(progressPath, {
      currentLesson: 1,
      completedLessons: [],
      weaknesses: [],
      strengths: [],
      reflections: [],
    });

    // ✅ Ensure arrays exist
    progress.completedLessons = progress.completedLessons || [];
    progress.weaknesses = progress.weaknesses || [];
    progress.strengths = progress.strengths || [];
    progress.reflections = progress.reflections || [];

    // ✅ Save completion
    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }

    progress.reflections.push({
      lessonId,
      reflection,
      feltEasy,
      struggledWith,
      completedAt: new Date().toISOString(),
    });

    // ✅ Track weaknesses safely
    if (struggledWith && !progress.weaknesses.includes(struggledWith)) {
      progress.weaknesses.push(struggledWith);
    }

    // ✅ Move forward ONLY if manageable
    if (feltEasy) {
      const currentIndex = curriculum.findIndex((l) => l.id === lessonId);

      if (currentIndex >= 0 && currentIndex < curriculum.length - 1) {
        progress.currentLesson = curriculum[currentIndex + 1].id;
      }
    } else {
      // repeat same lesson
      progress.currentLesson = lessonId;
    }

    writeJson(progressPath, progress);

    return Response.json({
      ok: true,
      nextLesson: progress.currentLesson,
      progress,
    });
  } catch (error) {
    console.error("COMPLETE ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}