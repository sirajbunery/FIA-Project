import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { logger } from '../utils/logger';

interface AnswerEvaluation {
  score: number; // 0-100
  completeness: number;
  clarity: number;
  relevance: number;
  confidence: number;
  consistency: number;
  isValid: boolean;
  feedback: string;
  feedbackUrdu: string;
  flags: string[];
  suggestions: string[];
  factCheck: {
    verified: boolean;
    issues: string[];
  };
  spellingErrors: string[];
  consistencyIssues: string[];
}

interface InterviewContext {
  visaType: string;
  destinationCountry: string;
  previousAnswers: Array<{ question: string; answer: string }>;
  language?: string; // 'english' or 'urdu'
}

// Models to try in order - if primary fails, try next
const FALLBACK_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-pro',
];

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private modelName: string = '';
  private verified: boolean = false;
  private rateLimited: boolean = false;
  private rateLimitResetTime: number = 0;

  constructor() {
    console.log('=== GEMINI SERVICE INIT ===');
    console.log('API Key exists:', !!config.geminiApiKey);
    console.log('API Key length:', config.geminiApiKey?.length || 0);
    console.log('API Key prefix:', config.geminiApiKey?.substring(0, 8) || 'none');
    console.log('Primary model:', config.geminiModel);

    if (config.geminiApiKey && config.geminiApiKey.length > 10) {
      try {
        this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
        this.modelName = config.geminiModel;
        this.model = this.genAI.getGenerativeModel({ model: this.modelName });
        console.log('✅ Gemini model object created with model:', this.modelName);
        // Run async verification — tries fallback models if primary fails
        this.verifyWithFallbacks();
      } catch (error) {
        logger.error('Failed to initialize Gemini:', error);
        console.error('❌ Failed to initialize Gemini:', error);
        this.model = null;
      }
    } else {
      logger.warn('Gemini API key not configured or too short');
      console.warn('⚠️ Gemini API key not configured or too short');
    }
  }

  /**
   * Try the primary model, then fallback models if it fails
   */
  private async verifyWithFallbacks(): Promise<void> {
    // Try primary model first
    const primaryWorked = await this.tryVerifyModel(this.modelName);
    if (primaryWorked) return;

    // Try fallback models
    console.log('🔄 Primary model failed, trying fallback models...');
    for (const fallbackModel of FALLBACK_MODELS) {
      if (fallbackModel === this.modelName) continue; // Skip already-tried primary
      const worked = await this.tryVerifyModel(fallbackModel);
      if (worked) {
        console.log(`✅ Switched to fallback model: ${fallbackModel}`);
        return;
      }
    }

    console.error('❌❌❌ ALL MODELS FAILED. AI will not be available.');
    console.error('❌ Check your API key at https://aistudio.google.com/apikey');
    console.error('❌ Check quota at https://ai.google.dev/gemini-api/docs/rate-limits');
    // Keep model object alive — rate limits may reset
    // Don't set this.model = null for 429 errors
  }

  /**
   * Try to verify a specific model. Returns true if it works.
   */
  private async tryVerifyModel(modelName: string): Promise<boolean> {
    if (!this.genAI) return false;

    try {
      console.log(`🔄 Testing model: ${modelName}...`);
      const testModel = this.genAI.getGenerativeModel({ model: modelName });
      const result = await testModel.generateContent('Say "OK"');
      const response = await result.response;
      const text = response.text();
      console.log(`✅✅✅ MODEL "${modelName}" VERIFIED! Response: ${text.substring(0, 50)}`);

      // Use this working model
      this.model = testModel;
      this.modelName = modelName;
      this.verified = true;
      this.rateLimited = false;
      logger.info(`Gemini API verified with model: ${modelName}`);
      return true;
    } catch (error: any) {
      const msg = error?.message || '';
      const is429 = msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests');
      const is404 = msg.includes('404') || msg.includes('not found');

      if (is429) {
        console.warn(`⚠️ Model "${modelName}" rate limited (429). Quota may be exhausted.`);
        // Don't null out model — rate limits are temporary
        this.rateLimited = true;
        this.rateLimitResetTime = Date.now() + 60000; // Retry after 60s
      } else if (is404) {
        console.warn(`⚠️ Model "${modelName}" not found (404). Trying next...`);
      } else {
        console.error(`❌ Model "${modelName}" error:`, msg.substring(0, 200));
      }
      return false;
    }
  }

  /**
   * Make an API call with retry logic for rate limits
   */
  private async callWithRetry(prompt: string, maxRetries: number = 2): Promise<string | null> {
    if (!this.model && !this.genAI) return null;

    // If rate limited but reset time passed, clear the flag
    if (this.rateLimited && Date.now() > this.rateLimitResetTime) {
      console.log('⏰ Rate limit reset time passed, retrying...');
      this.rateLimited = false;
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Re-create model if needed (e.g., after rate limit reset)
        if (!this.model && this.genAI) {
          this.model = this.genAI.getGenerativeModel({ model: this.modelName });
        }
        if (!this.model) return null;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Success — clear rate limit flag
        if (this.rateLimited) {
          this.rateLimited = false;
          this.verified = true;
          console.log('✅ Rate limit cleared, AI is working again!');
        }

        return text;
      } catch (error: any) {
        const msg = error?.message || '';
        const is429 = msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests');

        if (is429 && attempt < maxRetries) {
          // Extract retry delay if available, default to 5 seconds
          const delayMatch = msg.match(/retry in (\d+)/i);
          const delaySec = delayMatch ? Math.min(parseInt(delayMatch[1]), 30) : 5 * (attempt + 1);
          console.log(`⏳ Rate limited, waiting ${delaySec}s before retry ${attempt + 1}/${maxRetries}...`);
          await this.sleep(delaySec * 1000);
          continue;
        }

        if (is429) {
          this.rateLimited = true;
          this.rateLimitResetTime = Date.now() + 60000;
          console.error('❌ Rate limit exceeded after retries. Will retry on next request.');
        }

        throw error;
      }
    }
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isAvailable(): boolean {
    // Available if we have a model object OR genAI to recreate it
    const available = this.model !== null || (this.genAI !== null && this.modelName !== '');
    console.log(`🔍 isAvailable(): model=${!!this.model}, genAI=${!!this.genAI}, rateLimited=${this.rateLimited}, verified=${this.verified}, result=${available}`);
    return available;
  }

  isVerified(): boolean {
    return this.verified;
  }

  isRateLimited(): boolean {
    return this.rateLimited;
  }

  getModelName(): string {
    return this.modelName;
  }

  /**
   * Test endpoint - run a simple AI evaluation to verify everything works
   */
  async testEvaluation(): Promise<{ working: boolean; model?: string; response?: string; error?: string }> {
    try {
      const text = await this.callWithRetry(
        'You are an immigration officer. Rate this answer: Question: "What is your name?" Answer: "My name is Ahmed Khan." Respond with JSON: {"score": 85, "feedback": "Good clear answer"}'
      );
      if (text) {
        return { working: true, model: this.modelName, response: text.substring(0, 200) };
      }
      return { working: false, model: this.modelName, error: 'No response from model' };
    } catch (error: any) {
      return { working: false, model: this.modelName, error: error?.message || 'Unknown error' };
    }
  }

  /**
   * Evaluate an answer using AI - comprehensive verification
   */
  async evaluateAnswer(
    question: string,
    answer: string,
    context: InterviewContext
  ): Promise<AnswerEvaluation> {
    console.log('=== EVALUATE ANSWER CALLED ===');
    console.log('📝 Model available:', !!this.model, 'Verified:', this.verified, 'RateLimited:', this.rateLimited);
    console.log('📝 Question:', question.substring(0, 50));
    console.log('📝 Answer:', answer.substring(0, 50));

    if (!this.isAvailable()) {
      console.log('⚠️ No model available, using fallback');
      return this.getFallbackEvaluation(answer);
    }

    try {
      console.log('🤖 Building prompt and calling Gemini...');
      const prompt = this.buildEvaluationPrompt(question, answer, context);
      console.log('🤖 Prompt length:', prompt.length);

      const text = await this.callWithRetry(prompt);
      if (!text) {
        console.log('⚠️ No response from Gemini, using fallback');
        return this.getFallbackEvaluation(answer);
      }

      console.log('✅ Gemini raw response:', text.substring(0, 300));
      const parsed = this.parseEvaluationResponse(text, answer);
      console.log('✅ Parsed evaluation:', { score: parsed.score, feedback: parsed.feedback.substring(0, 50) });
      return parsed;
    } catch (error: any) {
      console.error('❌ GEMINI EVALUATION ERROR:', error?.message || error);
      logger.error('Gemini evaluation error:', error);
      return this.getFallbackEvaluation(answer);
    }
  }

  /**
   * Generate final interview assessment
   */
  async generateFinalAssessment(context: InterviewContext): Promise<{
    overallScore: number;
    passed: boolean;
    feedback: string;
    feedbackUrdu: string;
    improvements: string[];
    strengths: string[];
    concerns: string[];
  }> {
    console.log('=== GENERATE FINAL ASSESSMENT ===');
    console.log('📊 Model available:', !!this.model, 'QA count:', context.previousAnswers.length);

    if (!this.isAvailable()) {
      console.log('⚠️ No model, using fallback assessment');
      return this.getFallbackAssessment(context);
    }

    try {
      const isUrdu = context.language === 'urdu';
      const languageNote = isUrdu
        ? `CRITICAL: Respond in Urdu for "feedback", "feedbackUrdu", "improvements", "strengths", "concerns".`
        : `Provide "feedback" in English and "feedbackUrdu" in Urdu.`;

      const prompt = `You are a senior immigration officer at Pakistan's FIA (Federal Investigation Agency). You have just completed a ${context.visaType} visa interview for a Pakistani applicant traveling to ${context.destinationCountry}.

Complete Interview Transcript:
${context.previousAnswers.map((qa, i) => `Question ${i + 1}: ${qa.question}\nApplicant's Answer: ${qa.answer}`).join('\n\n')}

Analyze the ENTIRE interview holistically. Consider:
1. Were answers consistent throughout? Any contradictions?
2. Was the stated purpose credible and well-supported?
3. Did the applicant provide specific details (names, dates, places)?
4. Were there vague or evasive answers?
5. Did answers match expectations for a ${context.visaType} visa?
6. Were factual claims verifiable (real universities, companies, places)?
7. Did the applicant seem prepared and confident?

Scoring:
- 80-100: Well prepared, consistent, specific, believable
- 60-79: Adequate but some gaps or minor concerns
- 40-59: Significant issues - vague answers, inconsistencies
- 0-39: Major problems - evasive, contradictory, suspicious

${languageNote}

You MUST respond with ONLY valid JSON, no other text:
{
  "overallScore": <number 0-100>,
  "passed": <true if score >= 60>,
  "feedback": "<detailed assessment paragraph>",
  "feedbackUrdu": "<assessment in Urdu>",
  "improvements": ["<specific area 1>", "<specific area 2>"],
  "strengths": ["<strength 1>", "<strength 2>"],
  "concerns": ["<concern 1 if any>"]
}`;

      console.log('🤖 Calling Gemini for final assessment...');
      const text = await this.callWithRetry(prompt);
      if (!text) {
        console.log('⚠️ No response for final assessment, using fallback');
        return this.getFallbackAssessment(context);
      }

      console.log('✅ Final assessment raw response:', text.substring(0, 300));

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ Parsed final assessment:', { score: parsed.overallScore, passed: parsed.passed });
        return {
          overallScore: parsed.overallScore || 50,
          passed: parsed.passed ?? (parsed.overallScore >= 60),
          feedback: parsed.feedback || 'Assessment complete.',
          feedbackUrdu: parsed.feedbackUrdu || 'تشخیص مکمل۔',
          improvements: parsed.improvements || [],
          strengths: parsed.strengths || [],
          concerns: parsed.concerns || [],
        };
      }
      console.error('❌ Could not parse JSON from final assessment');
    } catch (error: any) {
      console.error('❌ Final assessment error:', error?.message || error);
      logger.error('Failed to generate final assessment:', error);
    }

    return this.getFallbackAssessment(context);
  }

  private buildEvaluationPrompt(
    question: string,
    answer: string,
    context: InterviewContext
  ): string {
    const isUrdu = context.language === 'urdu';

    return `You are a senior immigration officer at Pakistan's FIA (Federal Investigation Agency). You are evaluating answers in a ${context.visaType} visa interview practice session.

CONTEXT:
- Visa Type: ${context.visaType}
- Destination Country: ${context.destinationCountry}
- Interview Language: ${context.language || 'english'}
- Previous exchanges: ${context.previousAnswers.length > 0
  ? context.previousAnswers.map(qa => `Q: "${qa.question}" → A: "${qa.answer}"`).join(' | ')
  : 'This is the first question'}

CURRENT:
- Question asked: "${question}"
- Applicant answered: "${answer}"

EVALUATE thoroughly:

1. RELEVANCE: Does the answer actually address the question? Is it on-topic?
2. COMPLETENESS: Is it detailed enough? Does it include specifics (names, dates, amounts)?
3. CLARITY: Is it clear and well-structured? No rambling or confusion?
4. CONFIDENCE: Does it sound confident? No "maybe", "I think", "not sure"?
5. CONSISTENCY: Does it contradict any previous answer?
6. FACTUAL CHECK: Any names, institutions, places mentioned - are they plausible?
7. RED FLAGS: Anything that would concern a real immigration officer?

For ${context.visaType} visa, specifically check:
${this.getVisaSpecificCriteria(context.visaType)}

${isUrdu ? 'IMPORTANT: Provide feedback and suggestions in Urdu since the applicant is using Urdu.' : 'Provide feedback in English and feedbackUrdu in Urdu.'}

Respond with ONLY this JSON (no markdown, no backticks, no explanation):
{
  "score": <0-100 overall score>,
  "completeness": <0-100>,
  "clarity": <0-100>,
  "relevance": <0-100>,
  "confidence": <0-100>,
  "consistency": <0-100>,
  "isValid": <true/false - is this a real answer to the question>,
  "feedback": "<2-3 sentence feedback in ${isUrdu ? 'Urdu' : 'English'}>",
  "feedbackUrdu": "<feedback in Urdu>",
  "flags": [<list of concerns/red flags, empty if none>],
  "suggestions": [<list of improvement suggestions in ${isUrdu ? 'Urdu' : 'English'}>],
  "factCheck": {"verified": <true/false>, "issues": [<list of factual issues>]},
  "spellingErrors": [<any spelling errors found>],
  "consistencyIssues": [<any contradictions with previous answers>]
}`;
  }

  private getVisaSpecificCriteria(visaType: string): string {
    const criteria: Record<string, string> = {
      tourist: `- Does the applicant have a clear travel plan?
- Is the budget realistic?
- Are there strong ties to Pakistan (job, family, property)?
- Is the duration reasonable (typically 1-4 weeks)?
- Does the applicant have hotel bookings and return ticket?`,
      student: `- Is the university name real and correctly spelled?
- Does the course/program exist at that university?
- Is the funding source credible (scholarship, family, savings)?
- Does the applicant plan to return to Pakistan after studies?
- Are the academic qualifications mentioned realistic?`,
      work: `- Is the company name real?
- Does the job title match the applicant's qualifications?
- Is the salary realistic for the position and country?
- What is the contract duration?
- Where will the applicant live?`,
      visit: `- Is the relationship with the host person clearly stated?
- Are the sponsor's details specific (name, job, address)?
- Is the visit duration reasonable?
- Are return plans clearly stated?`,
      family: `- Is the family relationship clearly stated?
- Are the sponsor's occupation and address specific?
- Are living arrangements specified?
- Is the duration and purpose clear?`,
      business: `- Is the business purpose specific (meetings, conference, trade)?
- Is the inviting company named?
- Is the applicant's own company detailed?
- Is the trip duration appropriate for business?`,
    };
    return criteria[visaType] || criteria.tourist;
  }

  private parseEvaluationResponse(text: string, answer: string): AnswerEvaluation {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ Successfully parsed AI evaluation JSON');
        return {
          score: parsed.score ?? 50,
          completeness: parsed.completeness ?? parsed.score ?? 50,
          clarity: parsed.clarity ?? parsed.score ?? 50,
          relevance: parsed.relevance ?? parsed.score ?? 50,
          confidence: parsed.confidence ?? parsed.score ?? 50,
          consistency: parsed.consistency ?? parsed.score ?? 50,
          isValid: parsed.isValid !== false,
          feedback: parsed.feedback || 'Answer evaluated.',
          feedbackUrdu: parsed.feedbackUrdu || 'جواب کا جائزہ لیا گیا۔',
          flags: Array.isArray(parsed.flags) ? parsed.flags : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
          factCheck: parsed.factCheck || { verified: true, issues: [] },
          spellingErrors: Array.isArray(parsed.spellingErrors) ? parsed.spellingErrors : [],
          consistencyIssues: Array.isArray(parsed.consistencyIssues) ? parsed.consistencyIssues : [],
        };
      }
      console.error('❌ No JSON found in Gemini response');
    } catch (error) {
      console.error('❌ Failed to parse evaluation JSON:', error);
      logger.error('Failed to parse evaluation response:', error);
    }

    return this.getFallbackEvaluation(answer);
  }

  private getFallbackEvaluation(answer: string): AnswerEvaluation {
    console.log('⚠️ Using FALLBACK evaluation (AI not available)');
    const length = answer.trim().length;
    const score = length > 50 ? 70 : length > 20 ? 50 : 30;

    return {
      score,
      completeness: score,
      clarity: score,
      relevance: score,
      confidence: score,
      consistency: score,
      isValid: length > 5,
      feedback: length > 20 ? '[No AI] Answer recorded. AI evaluation unavailable.' : '[No AI] Please provide more detail.',
      feedbackUrdu: length > 20 ? '[AI دستیاب نہیں] جواب ریکارڈ کیا گیا۔' : '[AI دستیاب نہیں] براہ کرم مزید تفصیل دیں۔',
      flags: length < 10 ? ['Answer too brief'] : [],
      suggestions: length < 20 ? ['Provide more specific details'] : [],
      factCheck: { verified: true, issues: [] },
      spellingErrors: [],
      consistencyIssues: [],
    };
  }

  private getFallbackAssessment(context: InterviewContext) {
    console.log('⚠️ Using FALLBACK assessment (AI not available)');
    const avgLength = context.previousAnswers.reduce((sum, qa) => sum + qa.answer.length, 0) /
      Math.max(context.previousAnswers.length, 1);

    const score = avgLength > 50 ? 65 : avgLength > 30 ? 55 : 45;

    return {
      overallScore: score,
      passed: score >= 60,
      feedback: '[No AI] Interview completed. AI evaluation was not available for this session.',
      feedbackUrdu: '[AI دستیاب نہیں] انٹرویو مکمل ہوا۔ اس سیشن کے لیے AI تشخیص دستیاب نہیں تھی۔',
      improvements: ['Provide more detailed answers', 'Be more specific about dates and names'],
      strengths: ['Completed all questions'],
      concerns: avgLength < 30 ? ['Answers were too brief'] : [],
    };
  }
}

export const geminiService = new GeminiService();
export default geminiService;
