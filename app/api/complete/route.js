import { curriculum } from "@/lib/curriculum";

export async function POST(req) {
  try {
    const body = await req.json();
    const { lessonId, reflection, feltEasy, struggledWith } = body;

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

    // =========================
    // UPDATE PROGRESS
    // =========================

    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }

    progress.reflections.push({
      lessonId,
      reflection: reflection || "",
      feltEasy: !!feltEasy,
      struggledWith: struggledWith || "",
      completedAt: new Date().toISOString(),
    });

    if (struggledWith && !progress.weaknesses.includes(struggledWith)) {
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