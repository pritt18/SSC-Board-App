// src/services/progressService.ts

import { executeQuery } from '../database/database';

let tablesEnsured = false;

export const ensureProgressTables = async (): Promise<void> => {
  if (tablesEnsured) return;
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS pdf_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        pdf_id INTEGER NOT NULL,
        is_completed BOOLEAN DEFAULT 1,
        last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (pdf_id) REFERENCES pdfs(id) ON DELETE CASCADE,
        UNIQUE(user_id, pdf_id)
      )
    `);
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_pdf_progress_user ON pdf_progress(user_id)
    `);
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_pdf_progress_pdf ON pdf_progress(pdf_id)
    `);
    tablesEnsured = true;
  } catch (err) {
    console.warn('Could not ensure pdf_progress table:', err);
  }
};

/**
 * Record reading a PDF/book
 */
export const recordPdfProgress = async (
  userId: number,
  pdfId: number,
  subjectId?: number
): Promise<void> => {
  if (!userId || !pdfId) return;

  try {
    await ensureProgressTables();

    // 1. Record in pdf_progress
    await executeQuery(
      `INSERT OR REPLACE INTO pdf_progress (user_id, pdf_id, is_completed, last_read_at)
       VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
      [userId, pdfId]
    );

    // 2. Resolve subject_id if not passed
    let resolvedSubjectId = subjectId;
    if (!resolvedSubjectId) {
      const pdfRows = await executeQuery(
        `SELECT subject_id FROM pdfs WHERE id = ? LIMIT 1`,
        [pdfId]
      );
      if (pdfRows.length > 0 && pdfRows[0].subject_id) {
        resolvedSubjectId = pdfRows[0].subject_id;
      }
    }

    // 3. Update or Insert progress table for this subject
    if (resolvedSubjectId) {
      const existing = await executeQuery(
        `SELECT id FROM progress WHERE user_id = ? AND subject_id = ? LIMIT 1`,
        [userId, resolvedSubjectId]
      );

      if (existing.length > 0) {
        await executeQuery(
          `UPDATE progress 
           SET pdf_viewed = 1, last_accessed = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [existing[0].id]
        );
      } else {
        await executeQuery(
          `INSERT INTO progress (user_id, subject_id, pdf_viewed, last_accessed)
           VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
          [userId, resolvedSubjectId]
        );
      }
    }

    console.log(`[ProgressService] Recorded PDF progress: user ${userId}, pdf ${pdfId}, subject ${resolvedSubjectId}`);
  } catch (error) {
    console.error('[ProgressService] Error recording PDF progress:', error);
  }
};

/**
 * Record a Quiz attempt & completion
 */
export const recordQuizAttempt = async (
  userId: number,
  quizId: number,
  score: number,
  totalQuestions: number,
  timeTaken?: number
): Promise<void> => {
  if (!userId || !quizId) return;

  try {
    await ensureProgressTables();

    const correctAnswers = score;
    const wrongAnswers = Math.max(0, totalQuestions - score);
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    // 1. Insert into quiz_attempts
    await executeQuery(
      `INSERT INTO quiz_attempts (user_id, quiz_id, score, total_questions, correct_answers, wrong_answers, time_taken, attempted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, quizId, score, totalQuestions, correctAnswers, wrongAnswers, timeTaken || 0]
    );

    // 2. Resolve subject_id for quiz
    const quizRows = await executeQuery(
      `SELECT subject_id FROM quizzes WHERE id = ? LIMIT 1`,
      [quizId]
    );

    const subjectId = quizRows[0]?.subject_id;

    // 3. Update or Insert progress table for this subject
    if (subjectId) {
      const existing = await executeQuery(
        `SELECT id, quiz_attempts, quiz_score FROM progress WHERE user_id = ? AND subject_id = ? LIMIT 1`,
        [userId, subjectId]
      );

      if (existing.length > 0) {
        await executeQuery(
          `UPDATE progress 
           SET quiz_completed = 1, 
               quiz_score = MAX(quiz_score, ?), 
               quiz_attempts = quiz_attempts + 1, 
               last_accessed = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [percentage, existing[0].id]
        );
      } else {
        await executeQuery(
          `INSERT INTO progress (user_id, subject_id, quiz_completed, quiz_score, quiz_attempts, last_accessed)
           VALUES (?, ?, 1, ?, 1, CURRENT_TIMESTAMP)`,
          [userId, subjectId, percentage]
        );
      }
    }

    console.log(`[ProgressService] Recorded Quiz attempt: user ${userId}, quiz ${quizId}, score ${score}/${totalQuestions}`);
  } catch (error) {
    console.error('[ProgressService] Error recording quiz attempt:', error);
  }
};

/**
 * Record video progress
 */
export const recordVideoProgress = async (
  userId: number,
  videoId: number,
  positionMillis: number,
  durationMillis: number,
  isCompleted?: boolean
): Promise<void> => {
  if (!userId || !videoId) return;

  try {
    const completedFlag = isCompleted !== undefined
      ? (isCompleted ? 1 : 0)
      : (durationMillis > 0 && positionMillis >= durationMillis * 0.95 ? 1 : 0);

    // 1. Record in video_progress
    await executeQuery(
      `INSERT OR REPLACE INTO video_progress 
       (user_id, video_id, position_millis, duration_millis, is_completed, last_watched_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, videoId, positionMillis, durationMillis, completedFlag]
    );

    // 2. If completed, update subject in progress table
    if (completedFlag === 1) {
      const videoRows = await executeQuery(
        `SELECT subject_id FROM videos WHERE id = ? LIMIT 1`,
        [videoId]
      );
      const subjectId = videoRows[0]?.subject_id;
      if (subjectId) {
        const existing = await executeQuery(
          `SELECT id FROM progress WHERE user_id = ? AND subject_id = ? LIMIT 1`,
          [userId, subjectId]
        );
        if (existing.length > 0) {
          await executeQuery(
            `UPDATE progress 
             SET video_watched = 1, last_accessed = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [existing[0].id]
          );
        } else {
          await executeQuery(
            `INSERT INTO progress (user_id, subject_id, video_watched, last_accessed)
             VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
            [userId, subjectId]
          );
        }
      }
    }
  } catch (error) {
    console.error('[ProgressService] Error recording video progress:', error);
  }
};
