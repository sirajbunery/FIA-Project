import { Router, Request, Response, NextFunction } from 'express';
import { interviewService } from '../services/interview.service';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { InterviewVisaType } from '../models/interview.types';

const router = Router();

const VALID_VISA_TYPES: InterviewVisaType[] = ['tourist', 'visit', 'family', 'work', 'student', 'business'];

/**
 * POST /api/interview/start
 * Start a new interview session
 */
router.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visaType, destinationCountry } = req.body;

    if (!visaType || !VALID_VISA_TYPES.includes(visaType)) {
      throw createError('Invalid visa type. Must be one of: ' + VALID_VISA_TYPES.join(', '), 400);
    }

    if (!destinationCountry) {
      throw createError('Destination country is required', 400);
    }

    logger.info(`Starting interview for ${visaType} visa to ${destinationCountry}`);

    const { sessionId, firstQuestion, totalQuestions } = await interviewService.startInterview(
      visaType,
      destinationCountry
    );

    res.json({
      success: true,
      sessionId,
      question: {
        id: firstQuestion.id,
        text: firstQuestion.text,
        textUrdu: firstQuestion.textUrdu,
        questionNumber: 1,
        totalQuestions,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/interview/answer
 * Submit an answer and get next question
 */
router.post('/answer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, answer, responseTimeMs } = req.body;

    if (!sessionId) {
      throw createError('Session ID is required', 400);
    }

    if (!answer || typeof answer !== 'string') {
      throw createError('Answer is required and must be a string', 400);
    }

    const result = await interviewService.submitAnswer(
      sessionId,
      answer.trim(),
      responseTimeMs || 0
    );

    const response: any = {
      success: true,
      questionNumber: result.questionNumber,
      scores: result.scores,
      feedback: result.feedback,
      flagged: result.flagged,
      isComplete: result.isComplete,
    };

    if (result.flagReason) {
      response.flagReason = result.flagReason;
    }

    if (result.nextQuestion && !result.isComplete) {
      response.nextQuestion = {
        id: result.nextQuestion.id,
        text: result.nextQuestion.text,
        textUrdu: result.nextQuestion.textUrdu,
        questionNumber: result.questionNumber + 1,
      };
    }

    res.json(response);
  } catch (error: any) {
    if (error.message === 'Session not found or expired') {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
});

/**
 * POST /api/interview/end
 * End the interview and get final results
 */
router.post('/end', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      throw createError('Session ID is required', 400);
    }

    const session = await interviewService.endInterview(sessionId);

    res.json({
      success: true,
      result: {
        sessionId: session.id,
        visaType: session.visaType,
        destinationCountry: session.destinationCountry,
        totalQuestions: session.totalQuestions,
        questionsAnswered: session.questionsAsked.length,
        overallScore: session.overallScore,
        passed: session.passed,
        feedback: session.feedback,
        improvements: session.improvements,
        scoreBreakdown: calculateAverageScores(session.questionsAsked),
        flaggedAnswers: session.questionsAsked.filter(q => q.flagged).length,
        duration: calculateDuration(session.startTime, session.endTime || new Date().toISOString()),
      },
    });
  } catch (error: any) {
    if (error.message === 'Session not found or expired') {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
});

/**
 * GET /api/interview/history
 * Get interview history
 */
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const history = await interviewService.getHistory(limit);

    res.json({
      success: true,
      history: history.map(session => ({
        sessionId: session.id,
        visaType: session.visaType,
        destinationCountry: session.destinationCountry,
        date: session.startTime,
        score: session.overallScore,
        passed: session.passed,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/interview/visa-types
 * Get available visa types for interview
 */
router.get('/visa-types', (req: Request, res: Response) => {
  const visaTypes = [
    { type: 'tourist', label: 'Tourist Visa', labelUrdu: 'سیاحتی ویزا', description: 'For tourism and sightseeing' },
    { type: 'visit', label: 'Visit Visa', labelUrdu: 'وزٹ ویزا', description: 'For visiting family or friends' },
    { type: 'family', label: 'Family Visa', labelUrdu: 'فیملی ویزا', description: 'For joining family members' },
    { type: 'work', label: 'Work Visa', labelUrdu: 'ورک ویزا', description: 'For employment abroad' },
    { type: 'student', label: 'Student Visa', labelUrdu: 'اسٹوڈنٹ ویزا', description: 'For studying abroad' },
    { type: 'business', label: 'Business Visa', labelUrdu: 'بزنس ویزا', description: 'For business activities' },
  ];

  res.json({ success: true, visaTypes });
});

// Helper functions
function calculateAverageScores(questions: any[]): any {
  if (questions.length === 0) {
    return { completeness: 0, clarity: 0, relevance: 0, confidence: 0, consistency: 0 };
  }

  const totals = questions.reduce(
    (acc, q) => ({
      completeness: acc.completeness + q.scores.completeness,
      clarity: acc.clarity + q.scores.clarity,
      relevance: acc.relevance + q.scores.relevance,
      confidence: acc.confidence + q.scores.confidence,
      consistency: acc.consistency + q.scores.consistency,
    }),
    { completeness: 0, clarity: 0, relevance: 0, confidence: 0, consistency: 0 }
  );

  const count = questions.length;
  return {
    completeness: Math.round(totals.completeness / count),
    clarity: Math.round(totals.clarity / count),
    relevance: Math.round(totals.relevance / count),
    confidence: Math.round(totals.confidence / count),
    consistency: Math.round(totals.consistency / count),
  };
}

function calculateDuration(start: string, end: string): string {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const durationMs = endTime - startTime;

  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export default router;
