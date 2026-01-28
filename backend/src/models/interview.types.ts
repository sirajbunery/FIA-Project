// Interview Types and Question Bank

export type InterviewVisaType = 'tourist' | 'visit' | 'family' | 'work' | 'student' | 'business';

export interface InterviewQuestion {
  id: string;
  text: string;
  textUrdu: string;
  category: 'universal' | 'visa_specific';
  visaTypes: InterviewVisaType[] | 'all';
  expectedAnswerType: 'text' | 'duration' | 'yes_no' | 'date' | 'number' | 'name' | 'address';
  scoringRules: ScoringRule[];
  followUpQuestions?: string[]; // IDs of follow-up questions
  redFlags?: string[]; // Patterns that raise concerns
  greenFlags?: string[]; // Patterns that indicate good answers
}

export interface ScoringRule {
  type: 'contains' | 'not_contains' | 'min_length' | 'max_length' | 'pattern' | 'duration_check' | 'consistency';
  value: string | number | RegExp;
  score: number; // Points to add/subtract
  category: 'completeness' | 'clarity' | 'relevance' | 'confidence' | 'consistency';
  reason?: string;
}

export interface QuestionAnswer {
  questionId: string;
  questionText: string;
  userAnswer: string;
  responseTimeMs: number;
  scores: {
    completeness: number;
    clarity: number;
    relevance: number;
    confidence: number;
    consistency: number;
    total: number;
  };
  flagged: boolean;
  flagReason?: string;
  feedback?: string;
}

export interface InterviewSession {
  id: string;
  visaType: InterviewVisaType;
  destinationCountry: string;
  startTime: string;
  endTime?: string;
  totalQuestions: number;
  questionsAsked: QuestionAnswer[];
  overallScore: number;
  passed: boolean;
  feedback: string;
  improvements: string[];
}

// Question Bank
export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  // ============ UNIVERSAL QUESTIONS ============
  {
    id: 'u1',
    text: 'What is your full name as written in your passport?',
    textUrdu: 'آپ کا پورا نام جو پاسپورٹ میں لکھا ہے؟',
    category: 'universal',
    visaTypes: 'all',
    expectedAnswerType: 'name',
    scoringRules: [
      { type: 'min_length', value: 3, score: 20, category: 'completeness', reason: 'Name too short' },
      { type: 'pattern', value: '^[A-Za-z\\s]+$', score: 20, category: 'clarity', reason: 'Name should contain only letters' },
    ],
    greenFlags: ['muhammad', 'khan', 'ahmed', 'ali'],
  },
  {
    id: 'u2',
    text: 'What is your nationality?',
    textUrdu: 'آپ کی قومیت کیا ہے؟',
    category: 'universal',
    visaTypes: 'all',
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'contains', value: 'pakistan', score: 30, category: 'relevance', reason: 'Clear nationality' },
    ],
    greenFlags: ['pakistani', 'pakistan'],
    redFlags: ['dont know', 'not sure'],
  },
  {
    id: 'u3',
    text: 'Which country are you traveling to?',
    textUrdu: 'آپ کس ملک جا رہے ہیں؟',
    category: 'universal',
    visaTypes: 'all',
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'min_length', value: 3, score: 20, category: 'completeness' },
    ],
    greenFlags: ['saudi', 'uae', 'dubai', 'qatar', 'uk', 'usa', 'canada', 'malaysia'],
  },
  {
    id: 'u4',
    text: 'What is the purpose of your visit?',
    textUrdu: 'آپ کے سفر کا مقصد کیا ہے؟',
    category: 'universal',
    visaTypes: 'all',
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'min_length', value: 5, score: 15, category: 'completeness' },
    ],
    greenFlags: ['work', 'job', 'employment', 'visit family', 'tourism', 'holiday', 'study', 'business meeting'],
    redFlags: ['not sure', 'dont know', 'maybe'],
  },
  {
    id: 'u5',
    text: 'How long do you plan to stay?',
    textUrdu: 'آپ کتنے دن رہنے کا ارادہ رکھتے ہیں؟',
    category: 'universal',
    visaTypes: 'all',
    expectedAnswerType: 'duration',
    scoringRules: [
      { type: 'duration_check', value: 'visa_appropriate', score: 30, category: 'relevance' },
    ],
    redFlags: ['forever', 'permanent', 'dont know', 'as long as possible'],
  },
  {
    id: 'u6',
    text: 'Where will you be staying during your visit?',
    textUrdu: 'آپ اپنے قیام کے دوران کہاں رہیں گے؟',
    category: 'universal',
    visaTypes: 'all',
    expectedAnswerType: 'address',
    scoringRules: [
      { type: 'min_length', value: 10, score: 20, category: 'completeness' },
    ],
    greenFlags: ['hotel', 'with family', 'with brother', 'with sister', 'company accommodation', 'hostel', 'apartment'],
    redFlags: ['dont know', 'not sure', 'will find'],
  },
  {
    id: 'u7',
    text: 'Is this your first time visiting this country?',
    textUrdu: 'کیا آپ پہلی بار اس ملک جا رہے ہیں؟',
    category: 'universal',
    visaTypes: 'all',
    expectedAnswerType: 'yes_no',
    scoringRules: [
      { type: 'pattern', value: '(yes|no|first time|been before|visited)', score: 25, category: 'clarity' },
    ],
  },
  {
    id: 'u8',
    text: 'What is your current occupation?',
    textUrdu: 'آپ کا موجودہ پیشہ کیا ہے؟',
    category: 'universal',
    visaTypes: 'all',
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'min_length', value: 3, score: 20, category: 'completeness' },
    ],
    greenFlags: ['engineer', 'doctor', 'teacher', 'driver', 'technician', 'businessman', 'student', 'accountant'],
    redFlags: ['unemployed', 'nothing', 'no job'],
  },
  {
    id: 'u9',
    text: 'Do you have a return ticket?',
    textUrdu: 'کیا آپ کے پاس واپسی کا ٹکٹ ہے؟',
    category: 'universal',
    visaTypes: 'all',
    expectedAnswerType: 'yes_no',
    scoringRules: [
      { type: 'contains', value: 'yes', score: 30, category: 'relevance' },
      { type: 'contains', value: 'no', score: -20, category: 'relevance', reason: 'No return ticket is a concern' },
    ],
    redFlags: ['no', 'not yet', 'will buy later'],
    greenFlags: ['yes', 'booked', 'confirmed'],
  },
  {
    id: 'u10',
    text: 'Who is sponsoring your trip?',
    textUrdu: 'آپ کے سفر کا خرچہ کون اٹھا رہا ہے؟',
    category: 'universal',
    visaTypes: 'all',
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'min_length', value: 5, score: 20, category: 'completeness' },
    ],
    greenFlags: ['myself', 'company', 'employer', 'brother', 'father', 'family', 'scholarship'],
  },

  // ============ TOURIST VISA QUESTIONS ============
  {
    id: 't1',
    text: 'Which cities or places do you plan to visit?',
    textUrdu: 'آپ کون سے شہر یا جگہیں دیکھنا چاہتے ہیں؟',
    category: 'visa_specific',
    visaTypes: ['tourist'],
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'min_length', value: 5, score: 20, category: 'completeness' },
    ],
    greenFlags: ['makkah', 'madinah', 'dubai', 'abu dhabi', 'london', 'paris'],
    redFlags: ['dont know', 'anywhere'],
  },
  {
    id: 't2',
    text: 'Do you have hotel reservations?',
    textUrdu: 'کیا آپ نے ہوٹل بک کروایا ہے؟',
    category: 'visa_specific',
    visaTypes: ['tourist'],
    expectedAnswerType: 'yes_no',
    scoringRules: [
      { type: 'contains', value: 'yes', score: 25, category: 'relevance' },
      { type: 'contains', value: 'booked', score: 25, category: 'relevance' },
    ],
    greenFlags: ['yes', 'booked', 'confirmed', 'reservation'],
    redFlags: ['no', 'will book', 'not yet'],
  },
  {
    id: 't3',
    text: 'How much money are you carrying for this trip?',
    textUrdu: 'آپ اس سفر کے لیے کتنی رقم لے کر جا رہے ہیں؟',
    category: 'visa_specific',
    visaTypes: ['tourist'],
    expectedAnswerType: 'number',
    scoringRules: [
      { type: 'pattern', value: '\\d+', score: 20, category: 'completeness' },
    ],
    redFlags: ['nothing', 'no money', 'dont have'],
  },
  {
    id: 't4',
    text: 'Do you have travel insurance?',
    textUrdu: 'کیا آپ کے پاس ٹریول انشورنس ہے؟',
    category: 'visa_specific',
    visaTypes: ['tourist'],
    expectedAnswerType: 'yes_no',
    scoringRules: [
      { type: 'contains', value: 'yes', score: 20, category: 'relevance' },
    ],
    greenFlags: ['yes', 'have insurance'],
  },

  // ============ FAMILY/VISIT VISA QUESTIONS ============
  {
    id: 'f1',
    text: 'Who are you visiting? What is their name?',
    textUrdu: 'آپ کس سے ملنے جا رہے ہیں؟ ان کا نام؟',
    category: 'visa_specific',
    visaTypes: ['family', 'visit'],
    expectedAnswerType: 'name',
    scoringRules: [
      { type: 'min_length', value: 3, score: 25, category: 'completeness' },
    ],
    greenFlags: ['brother', 'sister', 'father', 'mother', 'husband', 'wife', 'son', 'daughter', 'uncle', 'aunt'],
  },
  {
    id: 'f2',
    text: 'What is your relationship with the sponsor?',
    textUrdu: 'سپانسر سے آپ کا کیا رشتہ ہے؟',
    category: 'visa_specific',
    visaTypes: ['family', 'visit'],
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'pattern', value: '(brother|sister|father|mother|husband|wife|son|daughter|uncle|aunt|cousin|friend)', score: 30, category: 'relevance' },
    ],
    greenFlags: ['brother', 'sister', 'father', 'mother', 'husband', 'wife', 'son', 'daughter'],
    redFlags: ['stranger', 'dont know', 'agent'],
  },
  {
    id: 'f3',
    text: 'What is your sponsor\'s occupation?',
    textUrdu: 'آپ کے سپانسر کا پیشہ کیا ہے؟',
    category: 'visa_specific',
    visaTypes: ['family', 'visit'],
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'min_length', value: 3, score: 20, category: 'completeness' },
    ],
    greenFlags: ['engineer', 'doctor', 'teacher', 'driver', 'technician', 'businessman', 'manager'],
    redFlags: ['dont know', 'not sure'],
  },
  {
    id: 'f4',
    text: 'What is your sponsor\'s address?',
    textUrdu: 'آپ کے سپانسر کا پتہ کیا ہے؟',
    category: 'visa_specific',
    visaTypes: ['family', 'visit'],
    expectedAnswerType: 'address',
    scoringRules: [
      { type: 'min_length', value: 15, score: 25, category: 'completeness' },
    ],
    redFlags: ['dont know', 'not sure', 'will tell'],
  },
  {
    id: 'f5',
    text: 'Will you be staying at your sponsor\'s residence?',
    textUrdu: 'کیا آپ اپنے سپانسر کے گھر رہیں گے؟',
    category: 'visa_specific',
    visaTypes: ['family', 'visit'],
    expectedAnswerType: 'yes_no',
    scoringRules: [
      { type: 'pattern', value: '(yes|no)', score: 20, category: 'clarity' },
    ],
  },

  // ============ WORK VISA QUESTIONS ============
  {
    id: 'w1',
    text: 'What company will you be working for?',
    textUrdu: 'آپ کس کمپنی میں کام کریں گے؟',
    category: 'visa_specific',
    visaTypes: ['work'],
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'min_length', value: 3, score: 25, category: 'completeness' },
    ],
    redFlags: ['dont know', 'not sure', 'any company'],
  },
  {
    id: 'w2',
    text: 'What is your job title/position?',
    textUrdu: 'آپ کی ملازمت کا عہدہ کیا ہے؟',
    category: 'visa_specific',
    visaTypes: ['work'],
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'min_length', value: 3, score: 25, category: 'completeness' },
    ],
    greenFlags: ['driver', 'engineer', 'technician', 'welder', 'electrician', 'plumber', 'chef', 'manager', 'accountant'],
    redFlags: ['dont know', 'any job'],
  },
  {
    id: 'w3',
    text: 'What will be your monthly salary?',
    textUrdu: 'آپ کی ماہانہ تنخواہ کتنی ہوگی؟',
    category: 'visa_specific',
    visaTypes: ['work'],
    expectedAnswerType: 'number',
    scoringRules: [
      { type: 'pattern', value: '\\d+', score: 20, category: 'completeness' },
    ],
    redFlags: ['dont know', 'not sure'],
  },
  {
    id: 'w4',
    text: 'How long is your employment contract?',
    textUrdu: 'آپ کا ملازمت کا معاہدہ کتنے عرصے کا ہے؟',
    category: 'visa_specific',
    visaTypes: ['work'],
    expectedAnswerType: 'duration',
    scoringRules: [
      { type: 'pattern', value: '(1|2|3|one|two|three)\\s*(year|years)', score: 25, category: 'relevance' },
    ],
    greenFlags: ['1 year', '2 years', '3 years', 'one year', 'two years'],
  },
  {
    id: 'w5',
    text: 'Where will you live during your employment?',
    textUrdu: 'ملازمت کے دوران آپ کہاں رہیں گے؟',
    category: 'visa_specific',
    visaTypes: ['work'],
    expectedAnswerType: 'address',
    scoringRules: [
      { type: 'min_length', value: 5, score: 20, category: 'completeness' },
    ],
    greenFlags: ['company accommodation', 'company provided', 'labor camp', 'sharing'],
    redFlags: ['dont know', 'not sure'],
  },
  {
    id: 'w6',
    text: 'Do you have any previous work experience abroad?',
    textUrdu: 'کیا آپ نے پہلے بیرون ملک کام کیا ہے؟',
    category: 'visa_specific',
    visaTypes: ['work'],
    expectedAnswerType: 'yes_no',
    scoringRules: [
      { type: 'pattern', value: '(yes|no|first time|worked|never)', score: 20, category: 'clarity' },
    ],
  },

  // ============ STUDENT VISA QUESTIONS ============
  {
    id: 's1',
    text: 'Which university/college will you be attending?',
    textUrdu: 'آپ کون سی یونیورسٹی/کالج میں پڑھیں گے؟',
    category: 'visa_specific',
    visaTypes: ['student'],
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'min_length', value: 5, score: 25, category: 'completeness' },
    ],
    redFlags: ['dont know', 'not sure', 'any university'],
  },
  {
    id: 's2',
    text: 'What course or program will you study?',
    textUrdu: 'آپ کون سا کورس یا پروگرام پڑھیں گے؟',
    category: 'visa_specific',
    visaTypes: ['student'],
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'min_length', value: 5, score: 25, category: 'completeness' },
    ],
    greenFlags: ['engineering', 'medicine', 'computer', 'business', 'mba', 'masters', 'bachelor', 'phd'],
    redFlags: ['dont know', 'not sure'],
  },
  {
    id: 's3',
    text: 'How will you pay for your education?',
    textUrdu: 'آپ اپنی تعلیم کا خرچہ کیسے ادا کریں گے؟',
    category: 'visa_specific',
    visaTypes: ['student'],
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'min_length', value: 5, score: 20, category: 'completeness' },
    ],
    greenFlags: ['scholarship', 'parents', 'father', 'family', 'savings', 'education loan'],
    redFlags: ['dont know', 'not sure'],
  },
  {
    id: 's4',
    text: 'What are your plans after completing your studies?',
    textUrdu: 'پڑھائی مکمل کرنے کے بعد آپ کا کیا ارادہ ہے؟',
    category: 'visa_specific',
    visaTypes: ['student'],
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'contains', value: 'return', score: 30, category: 'relevance' },
      { type: 'contains', value: 'pakistan', score: 20, category: 'relevance' },
    ],
    greenFlags: ['return to pakistan', 'come back', 'serve my country', 'return home'],
    redFlags: ['stay', 'settle', 'permanent', 'never come back'],
  },

  // ============ BUSINESS VISA QUESTIONS ============
  {
    id: 'b1',
    text: 'What is the purpose of your business trip?',
    textUrdu: 'آپ کے کاروباری سفر کا مقصد کیا ہے؟',
    category: 'visa_specific',
    visaTypes: ['business'],
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'min_length', value: 10, score: 20, category: 'completeness' },
    ],
    greenFlags: ['meeting', 'conference', 'exhibition', 'trade', 'negotiation', 'contract', 'partnership'],
    redFlags: ['dont know', 'not sure'],
  },
  {
    id: 'b2',
    text: 'Which company or organization invited you?',
    textUrdu: 'کس کمپنی یا تنظیم نے آپ کو دعوت دی؟',
    category: 'visa_specific',
    visaTypes: ['business'],
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'min_length', value: 5, score: 25, category: 'completeness' },
    ],
    redFlags: ['no one', 'myself', 'dont know'],
  },
  {
    id: 'b3',
    text: 'What is your company name and your position?',
    textUrdu: 'آپ کی کمپنی کا نام اور آپ کا عہدہ کیا ہے؟',
    category: 'visa_specific',
    visaTypes: ['business'],
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'min_length', value: 10, score: 25, category: 'completeness' },
    ],
    greenFlags: ['owner', 'director', 'manager', 'ceo', 'partner'],
  },
  {
    id: 'b4',
    text: 'Who is paying for this business trip?',
    textUrdu: 'اس کاروباری سفر کا خرچہ کون اٹھا رہا ہے؟',
    category: 'visa_specific',
    visaTypes: ['business'],
    expectedAnswerType: 'text',
    scoringRules: [
      { type: 'min_length', value: 3, score: 20, category: 'completeness' },
    ],
    greenFlags: ['company', 'myself', 'my company', 'inviting company', 'host company'],
  },
];

// Duration expectations by visa type
export const DURATION_EXPECTATIONS: Record<InterviewVisaType, { min: number; max: number; unit: 'days' | 'months' | 'years' }> = {
  tourist: { min: 5, max: 30, unit: 'days' },
  visit: { min: 7, max: 90, unit: 'days' },
  family: { min: 1, max: 12, unit: 'months' },
  work: { min: 1, max: 3, unit: 'years' },
  student: { min: 1, max: 5, unit: 'years' },
  business: { min: 3, max: 30, unit: 'days' },
};

// Filler words that indicate low confidence
export const LOW_CONFIDENCE_PATTERNS = [
  'um', 'uh', 'maybe', 'i think', 'i guess', 'not sure', 'dont know',
  "don't know", 'possibly', 'perhaps', 'might', 'could be', 'i suppose'
];

// Get questions for a specific visa type
export function getQuestionsForVisaType(visaType: InterviewVisaType, count: number = 10): InterviewQuestion[] {
  const universalQuestions = INTERVIEW_QUESTIONS.filter(
    q => q.category === 'universal' && (q.visaTypes === 'all' || q.visaTypes.includes(visaType))
  );

  const visaSpecificQuestions = INTERVIEW_QUESTIONS.filter(
    q => q.category === 'visa_specific' && q.visaTypes !== 'all' && q.visaTypes.includes(visaType)
  );

  // Take 6 universal + 4 visa-specific (or adjust if not enough)
  const selectedUniversal = universalQuestions.slice(0, 6);
  const selectedSpecific = visaSpecificQuestions.slice(0, 4);

  const combined = [...selectedUniversal, ...selectedSpecific];

  // Shuffle for variety
  return combined.sort(() => Math.random() - 0.5).slice(0, count);
}
