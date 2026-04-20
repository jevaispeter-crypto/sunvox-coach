import { curriculum } from "@/lib/curriculum";

export async function POST(req) {
  try {
    const body = await req.json();

    // =========================
    // ✅ SAFE INPUT HANDLING
    // =========================

    const lessonId =
      typeof body.lessonId === "number" && !isNaN(body.lessonId)
        ? body.lessonId
        : 1;

    const reflection =
      typeof body.reflection === "string" ? body.reflection : "";

    const feltEasy = !!body.feltEasy;

    const struggledWith =
      typeof body.struggledWith === "string" ? body.struggledWith : "";

    const incomingProgress =
      typeof body.progress === "object" && body.progress !== null
        ? body.progress
        : null;

    const currentLesson =
      curriculum.find((l) => l.id === lessonId) || curriculum[0];

    const currentOrder = currentLesson.order;

    // =========================
    // 🔥 USE CLIENT PROGRESS (FIX)
    // =========================

    let progress = incomingProgress || {
      currentOrder: 1,
      completedLessons: [],
      weaknesses: [],
      strengths: [],
      reflections: [],
    };

    // =========================
    // ✅ ENSURE STRUCTURE
    // =========================

    if (!Array.isArray(progress.completedLessons)) {
      progress.completedLessons = [];
    }

    if (!Array.isArray(progress.weaknesses)) {
      progress.weaknesses = [];
    }

    if (!Array.isArray(progress.strengths)) {
      progress.strengths = [];
    }

    if (!Array.isArray(progress.reflections)) {
      progress.reflections = [];
    }

    // =========================
    // 🧠 UPDATE PROGRESS
    // =========================

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

    if (struggledWith && !progress.weaknesses.includes(struggledWith)) {
      progress.weaknesses.push(struggledWith);
    }

    // =========================
    // 🚀 PROGRESSION LOGIC
    // =========================

    if (feltEasy) {
      const nextLesson = curriculum.find(
        (l) => l.order === currentOrder + 1
      );

      if (nextLesson) {
        progress.currentOrder = nextLesson.order;
      }
    } else {
      progress.currentOrder = currentOrder;
    }

    // =========================
    // ❌ REMOVE global.progress dependency
    // =========================

    return Response.json({
      ok: true,
      nextLesson: progress.currentOrder,
      progress,
    });
  } catch (error) {
    console.error("COMPLETE ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}