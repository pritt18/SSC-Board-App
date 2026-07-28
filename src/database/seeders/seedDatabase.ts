import { executeQuery } from '../database';
import { classesData } from '../../data/classes';

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
    question:
      'What is 5 + 3?',
    optionA: '6',
    optionB: '7',
    optionC: '8',
    optionD: '9',
    correctAnswer: 'c',
    explanation:
      '5 + 3 equals 8.',
  },
  {
    question:
      'What is 10 - 4?',
    optionA: '5',
    optionB: '6',
    optionC: '7',
    optionD: '8',
    correctAnswer: 'b',
    explanation:
      '10 - 4 equals 6.',
  },
  {
    question:
      'What is 3 × 4?',
    optionA: '7',
    optionB: '10',
    optionC: '12',
    optionD: '14',
    correctAnswer: 'c',
    explanation:
      '3 multiplied by 4 equals 12.',
  },
  {
    question:
      'What is 20 ÷ 5?',
    optionA: '2',
    optionB: '3',
    optionC: '4',
    optionD: '5',
    correctAnswer: 'c',
    explanation:
      '20 divided by 5 equals 4.',
  },
  {
    question:
      'Which number is the largest?',
    optionA: '12',
    optionB: '25',
    optionC: '18',
    optionD: '20',
    correctAnswer: 'b',
    explanation:
      '25 is greater than 12, 18 and 20.',
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
        option_a_english,
        option_b_english,
        option_c_english,
        option_d_english,
        correct_answer,
        explanation_english
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        quizId,
        question.question,
        question.optionA,
        question.optionB,
        question.optionC,
        question.optionD,
        question.correctAnswer,
        question.explanation,
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

    console.log(
      'Database seeded successfully ✅',
    );
  } catch (error) {
    console.error(
      'Error seeding database:',
      error,
    );
  }
};

