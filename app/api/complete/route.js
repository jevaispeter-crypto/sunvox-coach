import { curriculum } from "@/lib/curriculum";

export async function POST(req) {
  try {
    const body = await req.json();

    // ✅ SAFE INPUT HANDLING (CRITICAL FIX)
    const lessonId =
      typeof body.lessonId === "number" && !isNaN(body.lessonId)
        ? body.lessonId
        : 1;

    const reflection =
      typeof body.reflection === "string" ? body.reflection : "";

    const feltEasy = !!body.feltEasy;

    const struggledWith =
      typeof body.struggledWith === "string" ? body.struggledWith : "";

    // =========================
    // 🔥 IN-MEMORY STORAGE (Vercel-safe)
    // =========================

    let progress = global.progress || {
      currentLesson: 1,
      completedLessons: [],
      weaknesses: [],
      strengths: [],
      reflections: [],
    };

    // ✅ ENSURE ARRAYS EXIST (extra safety)
    progress.completedLessons = Array.isArray(progress.completedLessons)
      ? progress.completedLessons
      : [];

    progress.weaknesses = Array.isArray(progress.weaknesses)
      ? progress.weaknesses
      : [];

    progress.reflections = Array.isArray(progress.reflections)
      ? progress.reflections
      : [];

    // =========================
    // UPDATE PROGRESS
    // =========================

    if (
      typeof lessonId === "number" &&
      !progress.completedLessons.includes(lessonId)
    ) {
      progress.completedLessons.push(lessonId);
    }

    progress.reflections.push({
      lessonId,
      reflection,
      feltEasy,
      struggledWith,
      completedAt: new Date().toISOString(),
    });

    if (
      struggledWith &&
      typeof struggledWith === "string" &&
      !progress.weaknesses.includes(struggledWith)
    ) {
      progress.weaknesses.push(struggledWith);
    }

    // =========================
    // PROGRESSION LOGIC
    // =========================

    if (feltEasy) {
      const currentIndex = curriculum.findIndex((l) => l.id === lessonId);

      if (currentIndex >= 0 && currentIndex < curriculum.length - 1) {
        progress.currentLesson = curriculum[currentIndex + 1].id;
      }
    } else {
      progress.currentLesson = lessonId;
    }

    // Save back to global memory
    global.progress = progress;

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