import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { getSupabaseClient } from '../config/supabase';
import {
  InterviewSession,
  InterviewQuestion,
  QuestionAnswer,
  InterviewVisaType,
  INTERVIEW_QUESTIONS,
  DURATION_EXPECTATIONS,
  LOW_CONFIDENCE_PATTERNS,
  getQuestionsForVisaType,
} from '../models/interview.types';

interface ScoreBreakdown {
  completeness: number;
  clarity: number;
  relevance: number;
  confidence: number;
  consistency: number;
  total: number;
}

interface ActiveSession {
  session: InterviewSession;
  questions: InterviewQuestion[];
  currentIndex: number;
  previousAnswers: Map<string, string>; // For consistency checking
}

export class InterviewService {
  private supabase = getSupabaseClient();
  private activeSessions: Map<string, ActiveSession> = new Map();

  /**
   * Start a new interview session
   */
  async startInterview(
    visaType: InterviewVisaType,
    destinationCountry: string
  ): Promise<{ sessionId: string; firstQuestion: InterviewQuestion; totalQuestions: number }> {
    const sessionId = uuidv4();
    const questions = getQuestionsForVisaType(visaType, 10);

    const session: InterviewSession = {
      id: sessionId,
      visaType,
      destinationCountry,
      startTime: new Date().toISOString(),
      totalQuestions: questions.length,
      questionsAsked: [],
      overallScore: 0,
      passed: false,
      feedback: '',
      improvements: [],
    };

    // Store active session in memory
    this.activeSessions.set(sessionId, {
      session,
      questions,
      currentIndex: 0,
      previousAnswers: new Map(),
    });

    logger.info(`Interview started: ${sessionId} for ${visaType} visa to ${destinationCountry}`);

    return {
      sessionId,
      firstQuestion: questions[0],
      totalQuestions: questions.length,
    };
  }

  /**
   * Submit an answer and get the next question
   */
  async submitAnswer(
    sessionId: string,
    answer: string,
    responseTimeMs: number
  ): Promise<{
    scores: ScoreBreakdown;
    feedback: string;
    flagged: boolean;
    flagReason?: string;
    nextQuestion?: InterviewQuestion;
    questionNumber: number;
    isComplete: boolean;
  }> {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) {
      throw new Error('Session not found or expired');
    }

    const { session, questions, currentIndex, previousAnswers } = activeSession;
    const currentQuestion = questions[currentIndex];

    // Score the answer
    const { scores, feedback, flagged, flagReason } = this.scoreAnswer(
      currentQuestion,
      answer,
      session.visaType,
      previousAnswers
    );

    // Store answer for consistency checking
    previousAnswers.set(currentQuestion.id, answer.toLowerCase());

    // Record the answer
    const questionAnswer: QuestionAnswer = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.text,
      userAnswer: answer,
      responseTimeMs,
      scores,
      flagged,
      flagReason,
      feedback,
    };
    session.questionsAsked.push(questionAnswer);

    // Move to next question
    activeSession.currentIndex++;
    const isComplete = activeSession.currentIndex >= questions.length;
    const nextQuestion = isComplete ? undefined : questions[activeSession.currentIndex];

    return {
      scores,
      feedback,
      flagged,
      flagReason,
      nextQuestion,
      questionNumber: currentIndex + 1,
      isComplete,
    };
  }

  /**
   * End the interview and get final results
   */
  async endInterview(sessionId: string): Promise<InterviewSession> {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) {
      throw new Error('Session not found or expired');
    }

    const { session } = activeSession;
    session.endTime = new Date().toISOString();

    // Calculate overall score
    if (session.questionsAsked.length > 0) {
      const totalScore = session.questionsAsked.reduce((sum, q) => sum + q.scores.total, 0);
      session.overallScore = Math.round(totalScore / session.questionsAsked.length);
    }

    session.passed = session.overallScore >= 80;

    // Generate feedback and improvements
    const { feedback, improvements } = this.generateFeedback(session);
    session.feedback = feedback;
    session.improvements = improvements;

    // Save to database
    await this.saveSession(session);

    // Clean up active session
    this.activeSessions.delete(sessionId);

    logger.info(`Interview completed: ${sessionId}, Score: ${session.overallScore}, Passed: ${session.passed}`);

    return session;
  }

  /**
   * Score an individual answer
   */
  private scoreAnswer(
    question: InterviewQuestion,
    answer: string,
    visaType: InterviewVisaType,
    previousAnswers: Map<string, string>
  ): { scores: ScoreBreakdown; feedback: string; flagged: boolean; flagReason?: string } {
    const answerLower = answer.toLowerCase().trim();
    let scores: ScoreBreakdown = {
      completeness: 50,
      clarity: 50,
      relevance: 50,
      confidence: 50,
      consistency: 50,
      total: 0,
    };

    let flagged = false;
    let flagReason: string | undefined;
    let feedbackParts: string[] = [];

    // 1. Check for empty or very short answers
    if (answerLower.length < 2) {
      scores.completeness = 0;
      scores.clarity = 0;
      flagged = true;
      flagReason = 'Answer too short or empty';
      feedbackParts.push('Please provide a complete answer.');
    }

    // 2. Check for green flags (good answers)
    if (question.greenFlags) {
      const matchedGreenFlags = question.greenFlags.filter(flag =>
        answerLower.includes(flag.toLowerCase())
      );
      if (matchedGreenFlags.length > 0) {
        scores.relevance += 15 * matchedGreenFlags.length;
        scores.completeness += 10;
      }
    }

    // 3. Check for red flags (concerning answers)
    if (question.redFlags) {
      const matchedRedFlags = question.redFlags.filter(flag =>
        answerLower.includes(flag.toLowerCase())
      );
      if (matchedRedFlags.length > 0) {
        scores.relevance -= 20 * matchedRedFlags.length;
        flagged = true;
        flagReason = `Concerning response detected: ${matchedRedFlags.join(', ')}`;
        feedbackParts.push('This answer may raise concerns with immigration officers.');
      }
    }

    // 4. Check for low confidence patterns
    const confidenceIssues = LOW_CONFIDENCE_PATTERNS.filter(pattern =>
      answerLower.includes(pattern)
    );
    if (confidenceIssues.length > 0) {
      scores.confidence -= 15 * confidenceIssues.length;
      feedbackParts.push('Try to sound more confident. Avoid words like "maybe" or "I think".');
    }

    // 5. Duration-specific checks
    if (question.expectedAnswerType === 'duration') {
      const durationScore = this.checkDuration(answerLower, visaType);
      scores.relevance += durationScore.adjustment;
      if (durationScore.feedback) {
        feedbackParts.push(durationScore.feedback);
      }
      if (durationScore.flagged) {
        flagged = true;
        flagReason = durationScore.flagReason;
      }
    }

    // 6. Yes/No specific checks
    if (question.expectedAnswerType === 'yes_no') {
      if (answerLower.includes('yes') || answerLower.includes('no')) {
        scores.clarity += 20;
      } else {
        scores.clarity -= 10;
        feedbackParts.push('Please answer clearly with yes or no.');
      }
    }

    // 7. Return ticket specific check (critical for tourist/visit)
    if (question.id === 'u9' && (visaType === 'tourist' || visaType === 'visit')) {
      if (answerLower.includes('no') || answerLower.includes('not yet') || answerLower.includes("don't have")) {
        scores.relevance = 10;
        flagged = true;
        flagReason = 'No return ticket - major concern for tourist/visit visa';
        feedbackParts.push('Having a return ticket is essential for tourist and visit visas.');
      } else if (answerLower.includes('yes') || answerLower.includes('booked')) {
        scores.relevance = 100;
      }
    }

    // 8. Consistency check with previous answers
    const consistencyCheck = this.checkConsistency(question, answerLower, previousAnswers);
    scores.consistency += consistencyCheck.adjustment;
    if (consistencyCheck.feedback) {
      feedbackParts.push(consistencyCheck.feedback);
    }

    // 9. Apply scoring rules from question definition
    for (const rule of question.scoringRules) {
      const ruleResult = this.applyRule(rule, answerLower);
      if (ruleResult.applies) {
        scores[rule.category] += rule.score;
      }
    }

    // Normalize scores (0-100)
    scores.completeness = Math.max(0, Math.min(100, scores.completeness));
    scores.clarity = Math.max(0, Math.min(100, scores.clarity));
    scores.relevance = Math.max(0, Math.min(100, scores.relevance));
    scores.confidence = Math.max(0, Math.min(100, scores.confidence));
    scores.consistency = Math.max(0, Math.min(100, scores.consistency));

    // Calculate total (average of all categories)
    scores.total = Math.round(
      (scores.completeness + scores.clarity + scores.relevance + scores.confidence + scores.consistency) / 5
    );

    // Generate feedback
    const feedback = feedbackParts.length > 0
      ? feedbackParts.join(' ')
      : scores.total >= 80
        ? 'Good answer!'
        : scores.total >= 60
          ? 'Acceptable answer, but could be improved.'
          : 'This answer needs improvement.';

    return { scores, feedback, flagged, flagReason };
  }

  /**
   * Check if duration matches visa type expectations
   */
  private checkDuration(answer: string, visaType: InterviewVisaType): {
    adjustment: number;
    feedback?: string;
    flagged: boolean;
    flagReason?: string;
  } {
    const expectations = DURATION_EXPECTATIONS[visaType];

    // Extract numbers from answer
    const numbers = answer.match(/\d+/g);
    if (!numbers) {
      return { adjustment: -10, feedback: 'Please specify the duration clearly.', flagged: false };
    }

    const duration = parseInt(numbers[0]);

    // Check for concerning keywords
    if (answer.includes('forever') || answer.includes('permanent') || answer.includes('settle')) {
      return {
        adjustment: -40,
        feedback: 'Indicating permanent stay is a red flag for most visa types.',
        flagged: true,
        flagReason: 'Indicated permanent stay intention',
      };
    }

    // Check against expectations
    const isYears = answer.includes('year');
    const isMonths = answer.includes('month');
    const isDays = answer.includes('day') || answer.includes('week');

    let actualDays = duration;
    if (isYears) actualDays = duration * 365;
    else if (isMonths) actualDays = duration * 30;

    // Convert expectations to days for comparison
    let minDays = expectations.min;
    let maxDays = expectations.max;
    if (expectations.unit === 'years') {
      minDays *= 365;
      maxDays *= 365;
    } else if (expectations.unit === 'months') {
      minDays *= 30;
      maxDays *= 30;
    }

    if (visaType === 'tourist' && actualDays > 90) {
      return {
        adjustment: -30,
        feedback: 'Tourist visa stays are typically short (few weeks). Long stays may raise concerns.',
        flagged: true,
        flagReason: 'Duration too long for tourist visa',
      };
    }

    if (actualDays >= minDays && actualDays <= maxDays * 1.5) {
      return { adjustment: 20, feedback: 'Duration is appropriate.', flagged: false };
    }

    return { adjustment: 0, flagged: false };
  }

  /**
   * Check consistency with previous answers
   */
  private checkConsistency(
    question: InterviewQuestion,
    answer: string,
    previousAnswers: Map<string, string>
  ): { adjustment: number; feedback?: string } {
    // Check purpose vs duration consistency
    const purposeAnswer = previousAnswers.get('u4');
    const durationAnswer = previousAnswers.get('u5');

    if (purposeAnswer && question.id === 'u5') {
      if (purposeAnswer.includes('tourist') && answer.includes('year')) {
        return {
          adjustment: -20,
          feedback: 'Your stated duration seems inconsistent with tourist purpose.',
        };
      }
    }

    // Check destination consistency
    const destinationAnswer = previousAnswers.get('u3');
    if (destinationAnswer && question.id === 't1') {
      // Cities should match the destination country
      // This is simplified - real implementation would have country-city mapping
    }

    return { adjustment: 0 };
  }

  /**
   * Apply a single scoring rule
   */
  private applyRule(rule: any, answer: string): { applies: boolean } {
    switch (rule.type) {
      case 'contains':
        return { applies: answer.includes(String(rule.value).toLowerCase()) };
      case 'not_contains':
        return { applies: !answer.includes(String(rule.value).toLowerCase()) };
      case 'min_length':
        return { applies: answer.length >= Number(rule.value) };
      case 'max_length':
        return { applies: answer.length <= Number(rule.value) };
      case 'pattern':
        const regex = new RegExp(String(rule.value), 'i');
        return { applies: regex.test(answer) };
      default:
        return { applies: false };
    }
  }

  /**
   * Generate overall feedback and improvements
   */
  private generateFeedback(session: InterviewSession): { feedback: string; improvements: string[] } {
    const improvements: string[] = [];
    let feedback = '';

    const avgScores = {
      completeness: 0,
      clarity: 0,
      relevance: 0,
      confidence: 0,
      consistency: 0,
    };

    session.questionsAsked.forEach(q => {
      avgScores.completeness += q.scores.completeness;
      avgScores.clarity += q.scores.clarity;
      avgScores.relevance += q.scores.relevance;
      avgScores.confidence += q.scores.confidence;
      avgScores.consistency += q.scores.consistency;
    });

    const count = session.questionsAsked.length || 1;
    Object.keys(avgScores).forEach(key => {
      avgScores[key as keyof typeof avgScores] = Math.round(avgScores[key as keyof typeof avgScores] / count);
    });

    // Generate feedback based on scores
    if (session.passed) {
      feedback = `Excellent performance! You scored ${session.overallScore}% and demonstrated good preparation for your immigration interview.`;
    } else if (session.overallScore >= 60) {
      feedback = `Good effort! You scored ${session.overallScore}%. With some improvements, you'll be well prepared for your interview.`;
    } else {
      feedback = `You scored ${session.overallScore}%. More practice is recommended before your actual interview.`;
    }

    // Add specific improvements
    if (avgScores.completeness < 70) {
      improvements.push('Provide more complete answers with specific details.');
    }
    if (avgScores.clarity < 70) {
      improvements.push('Be clearer and more direct in your responses.');
    }
    if (avgScores.relevance < 70) {
      improvements.push('Make sure your answers directly address the questions asked.');
    }
    if (avgScores.confidence < 70) {
      improvements.push('Speak with more confidence. Avoid filler words like "maybe" or "I think".');
    }
    if (avgScores.consistency < 70) {
      improvements.push('Ensure your answers are consistent throughout the interview.');
    }

    // Check for flagged answers
    const flaggedCount = session.questionsAsked.filter(q => q.flagged).length;
    if (flaggedCount > 2) {
      improvements.push(`${flaggedCount} of your answers raised potential concerns. Review these carefully.`);
    }

    return { feedback, improvements };
  }

  /**
   * Save session to database
   */
  private async saveSession(session: InterviewSession): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('interview_sessions')
        .insert({
          id: session.id,
          visa_type: session.visaType,
          destination_country: session.destinationCountry,
          start_time: session.startTime,
          end_time: session.endTime,
          total_questions: session.totalQuestions,
          questions_asked: session.questionsAsked,
          overall_score: session.overallScore,
          passed: session.passed,
          feedback: session.feedback,
          improvements: session.improvements,
        });

      if (error) {
        logger.warn('Failed to save interview session:', error);
      }
    } catch (err) {
      logger.warn('Database save failed:', err);
    }
  }

  /**
   * Get interview history for a user
   */
  async getHistory(limit: number = 10): Promise<InterviewSession[]> {
    try {
      const { data, error } = await this.supabase
        .from('interview_sessions')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to get interview history:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      logger.error('Database query failed:', err);
      return [];
    }
  }

  /**
   * Get current question for a session
   */
  getCurrentQuestion(sessionId: string): InterviewQuestion | null {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) return null;

    const { questions, currentIndex } = activeSession;
    if (currentIndex >= questions.length) return null;

    return questions[currentIndex];
  }
}

export const interviewService = new InterviewService();
export default interviewService;
