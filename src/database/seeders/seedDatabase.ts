import { executeQuery } from '../database';
import { classesData } from '../../data/classes';
import { textbookPdfs } from './textbookPdfsData';
import { textbookVideos } from './textbookVideosData';


const simpleHash = async (
  password: string,
): Promise<string> => {
  return btoa(password + 'salt');
};

export const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // -----------------------------------------
    // 1. SEED CLASSES
    // -----------------------------------------

    console.log('Checking classes...');

    for (const cls of classesData) {
      const existingClass = await executeQuery(
        `
        SELECT id
        FROM classes
        WHERE class_number = ?
        LIMIT 1
        `,
        [cls.class_number],
      );

      if (
        !existingClass ||
        existingClass.length === 0
      ) {
        await executeQuery(
          `
          INSERT INTO classes (
            class_number,
            name_english,
            name_marathi,
            description_english,
            description_marathi
          )
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            cls.class_number,
            cls.name_english,
            cls.name_marathi,
            cls.description_english || '',
            cls.description_marathi || '',
          ],
        );

        console.log(
          `Class ${cls.class_number} added`,
        );
      }
    }

    // -----------------------------------------
    // 2. SEED ADMIN USER
    // -----------------------------------------

    console.log('Checking admin user...');

    const existingAdmin = await executeQuery(
      `
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      ['admin@sscboard.com'],
    );

    if (
      !existingAdmin ||
      existingAdmin.length === 0
    ) {
      const hashedPassword =
        await simpleHash('Admin@123');

      await executeQuery(
        `
        INSERT INTO users (
          username,
          email,
          password_hash,
          full_name,
          role
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          'admin',
          'admin@sscboard.com',
          hashedPassword,
          'System Administrator',
          'admin',
        ],
      );

      console.log('Admin user created');
    }

    // -----------------------------------------
    // 3. SUBJECT DATA
    // -----------------------------------------

    const subjects = [
      {
        name_english: 'Mathematics',
        name_marathi: 'गणित',
        icon: '➕',
      },
      {
        name_english: 'Science',
        name_marathi: 'विज्ञान',
        icon: '🔬',
      },
      {
        name_english: 'English',
        name_marathi: 'इंग्रजी',
        icon: '📚',
      },
      {
        name_english: 'Marathi',
        name_marathi: 'मराठी',
        icon: '📖',
      },
      {
        name_english: 'Hindi',
        name_marathi: 'हिंदी',
        icon: '📕',
      },
      {
        name_english: 'History',
        name_marathi: 'इतिहास',
        icon: '🏛️',
      },
      {
        name_english: 'Geography',
        name_marathi: 'भूगोल',
        icon: '🌍',
      },
      {
        name_english: 'Environmental Studies',
        name_marathi: 'परिसर अभ्यास',
        icon: '🌱',
      },
      {
        name_english: 'Play, Do, Learn',
        name_marathi: 'खेळू, करू, शिकू',
        icon: '🎨',
      },
    ];

    // -----------------------------------------
    // 4. SEED SUBJECTS FOR ALL CLASSES
    // -----------------------------------------

    console.log(
      'Seeding subjects for all classes...',
    );

    const allClasses = await executeQuery(
      `
      SELECT id, class_number
      FROM classes
      ORDER BY class_number ASC
      `,
      [],
    );

    for (const classItem of allClasses) {
      for (const subject of subjects) {
        await executeQuery(
          `
          INSERT OR IGNORE INTO subjects (
            class_id,
            name_english,
            name_marathi,
            icon
          )
          VALUES (?, ?, ?, ?)
          `,
          [
            classItem.id,
            subject.name_english,
            subject.name_marathi,
            subject.icon,
          ],
        );
      }

      console.log(
        `Subjects checked for Class ${classItem.class_number}`,
      );
    }

    // -----------------------------------------
    // 5. GET CLASS 3 MATHEMATICS SUBJECT
    // -----------------------------------------

    console.log(
      'Checking sample learning content...',
    );

    const class3 = await executeQuery(
      `
      SELECT id
      FROM classes
      WHERE class_number = ?
      LIMIT 1
      `,
      [3],
    );

    if (
      class3 &&
      class3.length > 0
    ) {
      const mathematics =
        await executeQuery(
          `
          SELECT id
          FROM subjects
          WHERE class_id = ?
            AND name_english = ?
          LIMIT 1
          `,
          [
            class3[0].id,
            'Mathematics',
          ],
        );

      if (
        mathematics &&
        mathematics.length > 0
      ) {
        const subjectId =
          mathematics[0].id;

        // -------------------------------------
        // 6. SEED SAMPLE VIDEO
        // -------------------------------------

        const existingVideo =
          await executeQuery(
            `
            SELECT id
            FROM videos
            WHERE subject_id = ?
              AND video_url = ?
            LIMIT 1
            `,
            [
              subjectId,
              'sample-video.mp4',
            ],
          );

        if (
          !existingVideo ||
          existingVideo.length === 0
        ) {
          await executeQuery(
            `
            INSERT INTO videos (
              subject_id,
              title_english,
              title_marathi,
              description_english,
              description_marathi,
              video_url,
              subtitle_url,
              sort_order
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              subjectId,
              'Sample Video',
              'नमुना व्हिडिओ',
              'Sample offline video lesson',
              'नमुना ऑफलाइन व्हिडिओ धडा',
              'sample-video.mp4',
              'sample-video.srt',
              1,
            ],
          );
        } else {
          /*
           * Important:
           * Updates an already seeded video too.
           */
          await executeQuery(
            `
            UPDATE videos

            SET subtitle_url = ?

            WHERE id = ?
            `,
            [
              'sample-video.srt',
              existingVideo[0].id,
            ],
          );
        }

        // -------------------------------------
        // 7. SEED SAMPLE PDF
        // -------------------------------------

        const existingPdf =
          await executeQuery(
            `
            SELECT id
            FROM pdfs
            WHERE subject_id = ?
              AND pdf_url = ?
            LIMIT 1
            `,
            [
              subjectId,
              'sample.pdf',
            ],
          );

        if (
          !existingPdf ||
          existingPdf.length === 0
        ) {
          await executeQuery(
            `
            INSERT INTO pdfs (
              subject_id,
              title_english,
              title_marathi,
              description_english,
              description_marathi,
              pdf_url,
              sort_order
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
              subjectId,
              'Sample PDF',
              'नमुना पीडीएफ',
              'Sample offline study material',
              'नमुना ऑफलाइन अभ्यास साहित्य',
              'sample.pdf',
              1,
            ],
          );

          console.log(
            'Sample PDF added',
          );
        }

        // -------------------------------------
        // 8. SEED SAMPLE QUIZ
        // -------------------------------------

        console.log('Checking sample quiz...');

        const existingQuiz = await executeQuery(
          `
          SELECT id
          FROM quizzes
          WHERE subject_id = ?
            AND title_english = ?
          LIMIT 1
          `,
          [
            subjectId,
            'Mathematics Practice Quiz',
          ],
        );

        let quizId: number;

        if (
          existingQuiz &&
          existingQuiz.length > 0
        ) {
          quizId = existingQuiz[0].id;

          console.log(
            'Sample quiz already exists',
          );
        } else {
          await executeQuery(
            `
            INSERT INTO quizzes (
              subject_id,
              title_english,
              title_marathi,
              description_english,
              description_marathi,
              type,
              total_questions,
              time_limit,
              passing_percentage,
              is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              subjectId,
              'Mathematics Practice Quiz',
              'गणित सराव प्रश्नमंजुषा',
              'Practice basic mathematics questions',
              'मूलभूत गणित प्रश्नांचा सराव',
              'practice_mcq',
              5,
              5,
              40,
              1,
            ],
          );

          const createdQuiz =
            await executeQuery(
              `
              SELECT id
              FROM quizzes
              WHERE subject_id = ?
                AND title_english = ?
              LIMIT 1
              `,
              [
                subjectId,
                'Mathematics Practice Quiz',
              ],
            );

          quizId = createdQuiz[0].id;

          console.log(
            'Sample quiz created',
          );
        }

        // -------------------------------------
        // 9. SEED SAMPLE QUESTIONS
        // -------------------------------------

        const questions = [
          {
            question: 'What is 5 + 3?',
            question_marathi: '5 + 3 म्हणजे काय?',
            optionA: '6',
            optionA_marathi: '६',
            optionB: '7',
            optionB_marathi: '७',
            optionC: '8',
            optionC_marathi: '८',
            optionD: '9',
            optionD_marathi: '९',
            correctAnswer: 'c',
            explanation: '5 + 3 equals 8.',
            explanation_marathi: '5 + 3 म्हणजे 8.',
          },
          {
            question: 'What is 10 - 4?',
            question_marathi: '10 - 4 म्हणजे काय?',
            optionA: '5',
            optionA_marathi: '५',
            optionB: '6',
            optionB_marathi: '६',
            optionC: '7',
            optionC_marathi: '७',
            optionD: '8',
            optionD_marathi: '८',
            correctAnswer: 'b',
            explanation: '10 - 4 equals 6.',
            explanation_marathi: '10 - 4 म्हणजे 6.',
          },
          {
            question: 'What is 3 × 4?',
            question_marathi: '3 × 4 म्हणजे काय?',
            optionA: '7',
            optionA_marathi: '७',
            optionB: '10',
            optionB_marathi: '१०',
            optionC: '12',
            optionC_marathi: '१२',
            optionD: '14',
            optionD_marathi: '१४',
            correctAnswer: 'c',
            explanation: '3 multiplied by 4 equals 12.',
            explanation_marathi: '3 ला 4 ने गुणले म्हणजे 12.',
          },
          {
            question: 'What is 20 ÷ 5?',
            question_marathi: '20 ÷ 5 म्हणजे काय?',
            optionA: '2',
            optionA_marathi: '२',
            optionB: '3',
            optionB_marathi: '३',
            optionC: '4',
            optionC_marathi: '४',
            optionD: '5',
            optionD_marathi: '५',
            correctAnswer: 'c',
            explanation: '20 divided by 5 equals 4.',
            explanation_marathi: '20 ला 5 ने भागले म्हणजे 4.',
          },
          {
            question: 'Which number is the largest?',
            question_marathi: 'कोणती संख्या सर्वात मोठी आहे?',
            optionA: '12',
            optionA_marathi: '१२',
            optionB: '25',
            optionB_marathi: '२५',
            optionC: '18',
            optionC_marathi: '१८',
            optionD: '20',
            optionD_marathi: '२०',
            correctAnswer: 'b',
            explanation: '25 is greater than 12, 18 and 20.',
            explanation_marathi: '25 ही 12, 18 आणि 20 पेक्षा मोठी आहे.',
          },
        ];

        const existingQuestions =
          await executeQuery(
            `
            SELECT id
            FROM questions
            WHERE quiz_id = ?
            `,
            [quizId],
          );

        if (
          !existingQuestions ||
          existingQuestions.length === 0
        ) {
          for (
            const question of questions
          ) {
            await executeQuery(
              `
              INSERT INTO questions (
                quiz_id,
                question_text_english,
                question_text_marathi,
                option_a_english,
                option_a_marathi,
                option_b_english,
                option_b_marathi,
                option_c_english,
                option_c_marathi,
                option_d_english,
                option_d_marathi,
                correct_answer,
                explanation_english,
                explanation_marathi
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `,
              [
                quizId,
                question.question,
                question.question_marathi,
                question.optionA,
                question.optionA_marathi,
                question.optionB,
                question.optionB_marathi,
                question.optionC,
                question.optionC_marathi,
                question.optionD,
                question.optionD_marathi,
                question.correctAnswer,
                question.explanation,
                question.explanation_marathi,
              ],
            );
          }

          console.log(
            '5 sample quiz questions added',
          );
        } else {
          console.log(
            'Sample quiz questions already exist',
          );
        }

        console.log(
          'Sample learning content checked successfully',
        );
      } else {
        console.log(
          'Class 3 Mathematics subject not found',
        );
      }
    } else {
      console.log(
        'Class 3 not found',
      );
    }

    // -----------------------------------------
    // 9. SEED MAHARASHTRA BOARD TEXTBOOK PDFS
    // -----------------------------------------
    console.log('Seeding Maharashtra Board textbook PDFs...');

    const getSubjectIconForSeed = (name: string): string => {
      const n = name.toLowerCase();
      if (n.includes('math')) return '➕';
      if (n.includes('sci')) return '🔬';
      if (n.includes('eng')) return '📚';
      if (n.includes('mar')) return '📖';
      if (n.includes('hin')) return '📕';
      if (n.includes('hist')) return '🏛️';
      if (n.includes('geo')) return '🌍';
      if (n.includes('san')) return '🕉️';
      if (n.includes('def') || n.includes('force')) return '🛡️';
      if (n.includes('water')) return '💧';
      if (n.includes('art') || n.includes('kala') || n.includes('music')) return '🎨';
      if (n.includes('phys')) return '⚽';
      if (n.includes('work') || n.includes('play')) return '🛠️';
      if (n.includes('env') || n.includes('world')) return '🌱';
      return '📚';
    };

    for (const book of textbookPdfs) {
      const classRows = await executeQuery(
        `SELECT id FROM classes WHERE class_number = ? LIMIT 1`,
        [book.classNumber]
      );
      if (!classRows || classRows.length === 0) continue;
      const classId = classRows[0].id;

      // Find or create subject for this class
      let subjectRows = await executeQuery(
        `SELECT id FROM subjects WHERE class_id = ? AND LOWER(name_english) = LOWER(?) LIMIT 1`,
        [classId, book.subjectEnglish]
      );

      let subjectId: number;
      if (!subjectRows || subjectRows.length === 0) {
        const icon = getSubjectIconForSeed(book.subjectEnglish);
        await executeQuery(
          `INSERT INTO subjects (class_id, name_english, name_marathi, icon, is_active)
           VALUES (?, ?, ?, ?, 1)`,
          [classId, book.subjectEnglish, book.subjectMarathi, icon]
        );
        subjectRows = await executeQuery(
          `SELECT id FROM subjects WHERE class_id = ? AND LOWER(name_english) = LOWER(?) LIMIT 1`,
          [classId, book.subjectEnglish]
        );
      }
      subjectId = subjectRows[0].id;

      const pdfUrl = `file:///E:/SoftspireSolution/Document/ssc book content/${book.relativePath}`;

      const existingPdf = await executeQuery(
        `SELECT id FROM pdfs WHERE subject_id = ? AND (title_english = ? OR pdf_url = ?) LIMIT 1`,
        [subjectId, book.titleEnglish, pdfUrl]
      );

      if (!existingPdf || existingPdf.length === 0) {
        await executeQuery(
          `INSERT INTO pdfs (
            subject_id,
            title_english,
            title_marathi,
            description_english,
            description_marathi,
            pdf_url,
            medium,
            sort_order,
            is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
          [
            subjectId,
            book.titleEnglish,
            book.titleMarathi,
            book.descriptionEnglish,
            book.descriptionMarathi,
            pdfUrl,
            book.medium,
          ]
        );
      } else {
        await executeQuery(
          `UPDATE pdfs 
           SET title_english = ?, title_marathi = ?, description_english = ?, description_marathi = ?, pdf_url = ?, medium = ?, is_active = 1
           WHERE id = ?`,
          [
            book.titleEnglish,
            book.titleMarathi,
            book.descriptionEnglish,
            book.descriptionMarathi,
            pdfUrl,
            book.medium,
            existingPdf[0].id,
          ]
        );
      }
    }

    console.log(
      'Maharashtra Board textbook PDFs seeded successfully',
    );

    // -----------------------------------------
    // 10. SEED MAHARASHTRA BOARD VIDEOS
    // -----------------------------------------
    console.log('Seeding Maharashtra Board textbook videos...');

    for (const vid of textbookVideos) {
      const classRows = await executeQuery(
        `SELECT id FROM classes WHERE class_number = ? LIMIT 1`,
        [vid.classNumber]
      );
      if (!classRows || classRows.length === 0) continue;
      const classId = classRows[0].id;

      // Find or create subject for this class
      let subjectRows = await executeQuery(
        `SELECT id FROM subjects WHERE class_id = ? AND LOWER(name_english) = LOWER(?) LIMIT 1`,
        [classId, vid.subjectEnglish]
      );

      let subjectId: number;
      if (!subjectRows || subjectRows.length === 0) {
        await executeQuery(
          `INSERT INTO subjects (class_id, name_english, name_marathi, icon, is_active)
           VALUES (?, ?, ?, '📚', 1)`,
          [classId, vid.subjectEnglish, vid.subjectMarathi]
        );
        subjectRows = await executeQuery(
          `SELECT id FROM subjects WHERE class_id = ? AND LOWER(name_english) = LOWER(?) LIMIT 1`,
          [classId, vid.subjectEnglish]
        );
      }
      subjectId = subjectRows[0].id;

      const existingVideo = await executeQuery(
        `SELECT id FROM videos WHERE subject_id = ? AND (title_english = ? OR video_url = ?) LIMIT 1`,
        [subjectId, vid.titleEnglish, vid.videoUrl]
      );

      if (!existingVideo || existingVideo.length === 0) {
        await executeQuery(
          `INSERT INTO videos (
            subject_id,
            title_english,
            title_marathi,
            description_english,
            description_marathi,
            video_url,
            medium,
            sort_order,
            is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            subjectId,
            vid.titleEnglish,
            vid.titleMarathi,
            vid.descriptionEnglish,
            vid.descriptionMarathi,
            vid.videoUrl,
            vid.medium,
            vid.sortOrder,
          ]
        );
      } else {
        await executeQuery(
          `UPDATE videos
           SET title_english = ?, title_marathi = ?, description_english = ?, description_marathi = ?, video_url = ?, medium = ?, sort_order = ?, is_active = 1
           WHERE id = ?`,
          [
            vid.titleEnglish,
            vid.titleMarathi,
            vid.descriptionEnglish,
            vid.descriptionMarathi,
            vid.videoUrl,
            vid.medium,
            vid.sortOrder,
            existingVideo[0].id,
          ]
        );
      }
    }

    console.log(
      'Maharashtra Board textbook videos seeded successfully',
    );

    console.log(
      'Database seeded successfully',
    );

  } catch (error) {
    console.error(
      'Error seeding database:',
      error,
    );
  }
};