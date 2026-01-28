'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useVoiceInterview } from '@/hooks/useVoiceInterview';
import {
  AlertTriangle,
  MessageCircle,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  User,
  Shield,
  ChevronRight,
  RotateCcw,
  Clock,
  TrendingUp,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Keyboard,
  Sparkles,
} from 'lucide-react';

// Types
interface Question {
  id: string;
  text: string;
  textUrdu: string;
  questionNumber: number;
  totalQuestions?: number;
}

interface ScoreBreakdown {
  completeness: number;
  clarity: number;
  relevance: number;
  confidence: number;
  consistency: number;
  total: number;
}

interface ChatMessage {
  type: 'officer' | 'user' | 'system' | 'feedback';
  text: string;
  textUrdu?: string;
  timestamp: Date;
  scores?: ScoreBreakdown;
  feedback?: string;
  feedbackUrdu?: string;
  flagged?: boolean;
  aiPowered?: boolean;
  flags?: string[];
  suggestions?: string[];
  factCheck?: { verified: boolean; issues: string[] };
  spellingErrors?: string[];
}

interface FinalResult {
  overallScore: number;
  passed: boolean;
  feedback: string;
  feedbackUrdu?: string;
  improvements: string[];
  strengths?: string[];
  concerns?: string[];
  scoreBreakdown: Omit<ScoreBreakdown, 'total'>;
  flaggedAnswers: number;
  duration: string;
  aiPowered?: boolean;
}

type InterviewMode = 'text' | 'voice';
type VoiceLanguage = 'en-US' | 'ur-PK';

type Step = 'disclaimer' | 'setup' | 'interview' | 'result';

const visaTypes = [
  { type: 'tourist', label: 'Tourist Visa', labelUrdu: 'سیاحتی ویزا', icon: '✈️' },
  { type: 'visit', label: 'Visit Visa', labelUrdu: 'وزٹ ویزا', icon: '👥' },
  { type: 'family', label: 'Family Visa', labelUrdu: 'فیملی ویزا', icon: '👨‍👩‍👧‍👦' },
  { type: 'work', label: 'Work Visa', labelUrdu: 'ورک ویزا', icon: '💼' },
  { type: 'student', label: 'Student Visa', labelUrdu: 'اسٹوڈنٹ ویزا', icon: '🎓' },
  { type: 'business', label: 'Business Visa', labelUrdu: 'بزنس ویزا', icon: '🏢' },
];

const countries = [
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
];

export default function InterviewPage() {
  const router = useRouter();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('disclaimer');
  const [selectedVisa, setSelectedVisa] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(10);

  // Voice mode state
  const [interviewMode, setInterviewMode] = useState<InterviewMode>('text');
  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>('en-US');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isAiPowered, setIsAiPowered] = useState(false);

  // Voice hook
  const {
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    isSupported: voiceSupported,
    error: voiceError,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearTranscript,
  } = useVoiceInterview({
    language: voiceLanguage,
    onTranscript: (text) => {
      console.log('📝 onTranscript received:', text);
      console.log('📝 Current interview mode:', interviewMode);
      if (interviewMode === 'voice') {
        console.log('📝 Setting answer with voice text');
        setAnswer(prev => {
          const newAnswer = (prev + ' ' + text).trim();
          console.log('📝 New answer:', newAnswer);
          return newAnswer;
        });
      }
    },
    onError: (error) => {
      console.error('🎤 Voice error:', error);
    },
  });

  // Log voice state changes
  useEffect(() => {
    console.log('🎤 Voice state - isListening:', isListening, 'isSpeaking:', isSpeaking, 'voiceSupported:', voiceSupported);
    if (voiceError) {
      console.error('🎤 Voice error state:', voiceError);
    }
  }, [isListening, isSpeaking, voiceSupported, voiceError]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Focus input when question changes
  useEffect(() => {
    if (currentQuestion && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentQuestion]);

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const simulateTyping = async (text: string, textUrdu?: string, callback?: () => void) => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));
    setIsTyping(false);
    addMessage({
      type: 'officer',
      text,
      textUrdu,
      timestamp: new Date(),
    });

    // Speak the text if voice mode is enabled
    if (interviewMode === 'voice' && autoSpeak) {
      const textToSpeak = voiceLanguage === 'ur-PK' && textUrdu ? textUrdu : text;
      speak(textToSpeak, voiceLanguage === 'ur-PK' ? 'ur' : 'en');
    }

    if (callback) callback();
  };

  const startInterview = async () => {
    if (!selectedVisa || !selectedCountry) return;

    setIsLoading(true);
    setStep('interview');

    try {
      // Welcome message
      addMessage({
        type: 'system',
        text: 'Interview Started - Please answer all questions honestly and clearly.',
        timestamp: new Date(),
      });

      await simulateTyping(
        'Good day. I am the immigration officer. I will ask you some questions about your travel. Please answer clearly.',
        'السلام علیکم۔ میں امیگریشن آفیسر ہوں۔ میں آپ سے کچھ سوالات پوچھوں گا۔ براہ کرم واضح جواب دیں۔'
      );

      const interviewLanguage = voiceLanguage === 'ur-PK' ? 'urdu' : 'english';
      console.log('🚀 Starting interview with:', { visaType: selectedVisa, destinationCountry: selectedCountry, language: interviewLanguage });

      const response = await axios.post(`${apiUrl}/api/interview/start`, {
        visaType: selectedVisa,
        destinationCountry: selectedCountry,
        language: interviewLanguage,
      });

      if (response.data.success) {
        setSessionId(response.data.sessionId);
        const q = response.data.question;
        setTotalQuestions(q.totalQuestions);
        setCurrentQuestion(q);
        setQuestionStartTime(Date.now());

        await simulateTyping(q.text, q.textUrdu);
      }
    } catch (err: any) {
      console.error('Failed to start interview:', err);
      console.error('Error details:', err?.response?.data || err?.message);
      const errorMsg = err?.response?.data?.error || err?.message || 'Unknown error';
      addMessage({
        type: 'system',
        text: `Failed to start interview: ${errorMsg}`,
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || !sessionId || !currentQuestion) return;

    const responseTimeMs = Date.now() - questionStartTime;
    const userAnswer = answer.trim();
    setAnswer('');

    // Add user message
    addMessage({
      type: 'user',
      text: userAnswer,
      timestamp: new Date(),
    });

    setIsLoading(true);

    try {
      const interviewLanguage = voiceLanguage === 'ur-PK' ? 'urdu' : 'english';
      console.log('📤 Submitting answer:', { sessionId, answer: userAnswer.substring(0, 50), language: interviewLanguage });

      const response = await axios.post(`${apiUrl}/api/interview/answer`, {
        sessionId,
        answer: userAnswer,
        responseTimeMs,
        language: interviewLanguage,
      });

      console.log('📥 Answer response:', {
        aiPowered: response.data.aiPowered,
        score: response.data.scores?.total,
        hasFeedbackUrdu: !!response.data.feedbackUrdu,
        flags: response.data.flags?.length || 0,
      });

      if (response.data.success) {
        // Track AI powered status
        if (response.data.aiPowered) {
          setIsAiPowered(true);
        }

        // Show feedback - use Urdu feedback for Urdu interviews
        const feedbackText = interviewLanguage === 'urdu' && response.data.feedbackUrdu
          ? response.data.feedbackUrdu
          : response.data.feedback;

        addMessage({
          type: 'feedback',
          text: feedbackText,
          textUrdu: response.data.feedbackUrdu,
          timestamp: new Date(),
          scores: response.data.scores,
          flagged: response.data.flagged,
          aiPowered: response.data.aiPowered,
          flags: response.data.flags,
          suggestions: response.data.suggestions,
          factCheck: response.data.factCheck,
          spellingErrors: response.data.spellingErrors,
        });

        if (response.data.isComplete) {
          // End interview
          await endInterview();
        } else if (response.data.nextQuestion) {
          // Short pause before next question
          await new Promise(resolve => setTimeout(resolve, 1000));

          const nextQ = response.data.nextQuestion;
          setCurrentQuestion(nextQ);
          setQuestionStartTime(Date.now());

          await simulateTyping(nextQ.text, nextQ.textUrdu);
        }
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      addMessage({
        type: 'system',
        text: 'Failed to submit answer. Please try again.',
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const endInterview = async () => {
    setIsLoading(true);

    try {
      await simulateTyping(
        'Thank you for your cooperation. Your interview is complete.',
        'آپ کے تعاون کا شکریہ۔ آپ کا انٹرویو مکمل ہوگیا۔'
      );

      const response = await axios.post(`${apiUrl}/api/interview/end`, {
        sessionId,
      });

      if (response.data.success) {
        const result = response.data.result;
        setFinalResult(result);

        // Store interview result in localStorage
        const interviewResult = {
          ...result,
          visaType: selectedVisa,
          country: selectedCountry,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem('interviewResult', JSON.stringify(interviewResult));

        setStep('result');
      }
    } catch (err) {
      console.error('Failed to end interview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  };

  const restartInterview = () => {
    setStep('disclaimer');
    setSelectedVisa('');
    setSelectedCountry('');
    setSessionId('');
    setCurrentQuestion(null);
    setMessages([]);
    setFinalResult(null);
  };

  // Render Disclaimer
  if (step === 'disclaimer') {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
        <Header />
        <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-10 h-10 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Practice Interview Disclaimer</h1>
              <p className="text-gray-600 font-urdu mt-1">انٹرویو پریکٹس کی ہدایات</p>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
              <h2 className="font-bold text-yellow-800 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                IMPORTANT NOTES
              </h2>
              <ul className="space-y-3 text-sm text-yellow-900">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>This is for <strong>educational and practice purposes only</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Real immigration interviews <strong>may vary significantly</strong> by country and officer</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>This tool <strong>does NOT guarantee success</strong> at real immigration checkpoints</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Always <strong>verify official requirements</strong> with your destination country's embassy</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Real officers <strong>may ask additional or different questions</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>The score is only an <strong>estimate of your preparedness</strong></span>
                </li>
              </ul>
            </div>

            <p className="text-center text-gray-600 mb-6">
              Use this tool to build confidence, but always prepare with official resources as well.
            </p>

            <button
              onClick={() => setStep('setup')}
              className="w-full py-4 bg-beoe-primary text-white rounded-xl font-semibold hover:bg-beoe-secondary transition-all flex items-center justify-center space-x-2 transform hover:scale-[1.02]"
            >
              <span>I Understand - Start Practice</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // Render Setup
  if (step === 'setup') {
    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
        <Header />
        <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-beoe-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-beoe-primary" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Setup Your Interview</h1>
              <p className="text-gray-600 font-urdu mt-1">اپنا انٹرویو سیٹ اپ کریں</p>
            </div>

            {/* Visa Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Visa Type (ویزا کی قسم)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visaTypes.map(visa => (
                  <button
                    key={visa.type}
                    onClick={() => setSelectedVisa(visa.type)}
                    className={`p-4 rounded-xl border-2 transition-all text-center transform hover:scale-105
                      ${selectedVisa === visa.type
                        ? 'border-beoe-primary bg-green-50 shadow-md'
                        : 'border-gray-200 hover:border-green-300'
                      }`}
                  >
                    <span className="text-2xl block mb-1">{visa.icon}</span>
                    <span className="text-sm font-medium text-gray-800 block">{visa.label}</span>
                    <span className="text-xs text-gray-500 font-urdu">{visa.labelUrdu}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Country Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Destination Country (منزل کا ملک)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {countries.map(country => (
                  <button
                    key={country.code}
                    onClick={() => setSelectedCountry(country.code)}
                    className={`p-3 rounded-xl border-2 transition-all text-center transform hover:scale-105
                      ${selectedCountry === country.code
                        ? 'border-beoe-primary bg-green-50 shadow-md'
                        : 'border-gray-200 hover:border-green-300'
                      }`}
                  >
                    <span className="text-xl block">{country.flag}</span>
                    <span className="text-xs font-medium text-gray-800">{country.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interview Mode Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Interview Mode (انٹرویو کا طریقہ)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setInterviewMode('text')}
                  className={`p-4 rounded-xl border-2 transition-all text-center transform hover:scale-105
                    ${interviewMode === 'text'
                      ? 'border-beoe-primary bg-green-50 shadow-md'
                      : 'border-gray-200 hover:border-green-300'
                    }`}
                >
                  <Keyboard className="w-8 h-8 mx-auto mb-2 text-beoe-primary" />
                  <span className="text-sm font-medium text-gray-800 block">Type Answers</span>
                  <span className="text-xs text-gray-500 font-urdu">ٹائپ کریں</span>
                </button>
                <button
                  onClick={() => setInterviewMode('voice')}
                  disabled={!voiceSupported}
                  className={`p-4 rounded-xl border-2 transition-all text-center transform hover:scale-105
                    ${interviewMode === 'voice'
                      ? 'border-beoe-primary bg-green-50 shadow-md'
                      : 'border-gray-200 hover:border-green-300'
                    }
                    ${!voiceSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Mic className="w-8 h-8 mx-auto mb-2 text-beoe-primary" />
                  <span className="text-sm font-medium text-gray-800 block">Voice Interview</span>
                  <span className="text-xs text-gray-500 font-urdu">بول کر جواب دیں</span>
                  {!voiceSupported && (
                    <span className="text-xs text-red-500 block mt-1">Not supported in this browser</span>
                  )}
                </button>
              </div>
            </div>

            {/* Voice Language Selection (shown only in voice mode) */}
            {interviewMode === 'voice' && voiceSupported && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Voice Language (زبان)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setVoiceLanguage('en-US')}
                    className={`p-3 rounded-xl border-2 transition-all text-center
                      ${voiceLanguage === 'en-US'
                        ? 'border-beoe-primary bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                      }`}
                  >
                    <span className="text-lg">🇬🇧</span>
                    <span className="text-sm font-medium text-gray-800 block">English</span>
                  </button>
                  <button
                    onClick={() => setVoiceLanguage('ur-PK')}
                    className={`p-3 rounded-xl border-2 transition-all text-center
                      ${voiceLanguage === 'ur-PK'
                        ? 'border-beoe-primary bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                      }`}
                  >
                    <span className="text-lg">🇵🇰</span>
                    <span className="text-sm font-medium text-gray-800 block font-urdu">اردو</span>
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-center">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSpeak}
                      onChange={(e) => setAutoSpeak(e.target.checked)}
                      className="w-4 h-4 text-beoe-primary rounded"
                    />
                    <span className="text-sm text-gray-600">Auto-speak questions</span>
                  </label>
                </div>
              </div>
            )}

            {/* AI Badge */}
            <div className="mb-6 flex items-center justify-center">
              <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-full border border-purple-200">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-purple-700">Powered by AI - Smart Verification</span>
              </div>
            </div>

            <button
              onClick={startInterview}
              disabled={!selectedVisa || !selectedCountry || isLoading}
              className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02]
                ${selectedVisa && selectedCountry
                  ? 'bg-beoe-primary text-white hover:bg-beoe-secondary'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <MessageCircle className="w-5 h-5" />
                  <span>Start Interview</span>
                  <span className="font-urdu">انٹرویو شروع کریں</span>
                </>
              )}
            </button>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // Render Interview Chat
  if (step === 'interview') {
    return (
      <main className="min-h-screen flex flex-col bg-gray-100">
        <Header />
        <div className="flex-1 container mx-auto px-4 py-4 max-w-3xl flex flex-col">
          {/* Progress Bar */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                Question {currentQuestion?.questionNumber || 1} of {totalQuestions}
              </span>
              <span className="text-sm text-beoe-primary font-medium">
                {Math.round(((currentQuestion?.questionNumber || 1) / totalQuestions) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-beoe-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${((currentQuestion?.questionNumber || 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          {/* Chat Container */}
          <div
            ref={chatContainerRef}
            className="flex-1 bg-white rounded-xl shadow-lg p-4 overflow-y-auto mb-4 space-y-4"
            style={{ maxHeight: 'calc(100vh - 320px)' }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}
              >
                {msg.type === 'officer' && (
                  <div className="flex items-start max-w-[80%]">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white mr-3 flex-shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="bg-blue-50 rounded-2xl rounded-tl-none p-4">
                      <p className="text-gray-800">{msg.text}</p>
                      {msg.textUrdu && (
                        <p className="text-gray-600 font-urdu text-sm mt-2 border-t pt-2">{msg.textUrdu}</p>
                      )}
                    </div>
                  </div>
                )}

                {msg.type === 'user' && (
                  <div className="flex items-start max-w-[80%]">
                    <div className="bg-beoe-primary text-white rounded-2xl rounded-tr-none p-4">
                      <p>{msg.text}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center ml-3 flex-shrink-0">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                )}

                {msg.type === 'system' && (
                  <div className="w-full text-center">
                    <span className="inline-block bg-gray-200 text-gray-600 text-sm px-4 py-2 rounded-full">
                      {msg.text}
                    </span>
                  </div>
                )}

                {msg.type === 'feedback' && (
                  <div className="w-full">
                    <div className={`p-3 rounded-lg text-sm ${
                      msg.flagged ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        {msg.flagged ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        <span className={msg.flagged ? 'text-red-700' : 'text-green-700'}>
                          Score: {msg.scores?.total}%
                        </span>
                        {msg.aiPowered && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                            <Sparkles className="w-3 h-3" />
                            <span>AI</span>
                          </span>
                        )}
                      </div>
                      <p className={msg.flagged ? 'text-red-600' : 'text-green-600'}>{msg.text}</p>

                      {/* AI-enriched feedback details */}
                      {msg.flags && msg.flags.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-red-200">
                          <p className="text-xs font-semibold text-red-700 mb-1">Concerns:</p>
                          {msg.flags.map((flag, i) => (
                            <p key={i} className="text-xs text-red-600">- {flag}</p>
                          ))}
                        </div>
                      )}

                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <p className="text-xs font-semibold text-blue-700 mb-1">Suggestions:</p>
                          {msg.suggestions.map((suggestion, i) => (
                            <p key={i} className="text-xs text-blue-600">- {suggestion}</p>
                          ))}
                        </div>
                      )}

                      {msg.factCheck && !msg.factCheck.verified && msg.factCheck.issues.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-orange-200">
                          <p className="text-xs font-semibold text-orange-700 mb-1">Fact Check Issues:</p>
                          {msg.factCheck.issues.map((issue, i) => (
                            <p key={i} className="text-xs text-orange-600">- {issue}</p>
                          ))}
                        </div>
                      )}

                      {msg.spellingErrors && msg.spellingErrors.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-yellow-200">
                          <p className="text-xs font-semibold text-yellow-700 mb-1">Spelling Issues:</p>
                          <p className="text-xs text-yellow-600">{msg.spellingErrors.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-start animate-pulse">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white mr-3">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="bg-blue-50 rounded-2xl rounded-tl-none p-4">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            {/* Voice Status Bar */}
            {interviewMode === 'voice' && (
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {isListening && (
                    <div className="flex items-center space-x-2 text-red-500">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium">Listening...</span>
                    </div>
                  )}
                  {isSpeaking && (
                    <div className="flex items-center space-x-2 text-blue-500">
                      <Volume2 className="w-4 h-4 animate-pulse" />
                      <span className="text-sm font-medium">Speaking...</span>
                    </div>
                  )}
                </div>
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="text-sm text-gray-500 hover:text-red-500 flex items-center space-x-1"
                  >
                    <VolumeX className="w-4 h-4" />
                    <span>Stop</span>
                  </button>
                )}
              </div>
            )}

            {/* Interim Transcript Display */}
            {interviewMode === 'voice' && interimTranscript && (
              <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 italic">{interimTranscript}</p>
              </div>
            )}

            <div className="flex items-center space-x-3">
              {/* Voice Mode Toggle Button */}
              {interviewMode === 'voice' && voiceSupported && (
                <button
                  onClick={() => {
                    console.log('🎤 Mic button clicked!');
                    console.log('🎤 isListening:', isListening);
                    if (isListening) {
                      console.log('🎤 Stopping listening...');
                      stopListening();
                    } else {
                      console.log('🎤 Starting listening...');
                      clearTranscript();
                      startListening();
                    }
                  }}
                  disabled={isLoading || isTyping || !currentQuestion || isSpeaking}
                  className={`p-3 rounded-xl transition-all transform hover:scale-105 ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  } ${(isLoading || isTyping || !currentQuestion || isSpeaking) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
              )}

              <input
                ref={inputRef}
                type="text"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={interviewMode === 'voice'
                  ? "Speak or type your answer... (بولیں یا لکھیں)"
                  : "Type your answer... (جواب لکھیں)"}
                disabled={isLoading || isTyping || !currentQuestion}
                className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-beoe-primary focus:outline-none disabled:bg-gray-100"
              />
              <button
                onClick={() => {
                  if (isListening) stopListening();
                  submitAnswer();
                }}
                disabled={!answer.trim() || isLoading || isTyping}
                className={`p-3 rounded-xl transition-all transform hover:scale-105
                  ${answer.trim() && !isLoading
                    ? 'bg-beoe-primary text-white hover:bg-beoe-secondary'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Send className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Voice Error Display */}
            {interviewMode === 'voice' && voiceError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{voiceError}</p>
              </div>
            )}

            {/* Voice Mode Hint */}
            {interviewMode === 'voice' && !isListening && !isSpeaking && !voiceError && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Click the microphone button and speak your answer clearly
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Render Results
  if (step === 'result' && finalResult) {
    const passed = finalResult.passed;

    return (
      <main className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
        <Header />
        <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
            {/* Score Header */}
            <div className={`text-center p-8 rounded-2xl mb-6 ${passed ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                passed ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {passed ? (
                  <CheckCircle className="w-12 h-12 text-green-600" />
                ) : (
                  <XCircle className="w-12 h-12 text-red-600" />
                )}
              </div>

              <h1 className={`text-4xl font-bold mb-2 ${passed ? 'text-green-700' : 'text-red-700'}`}>
                {finalResult.overallScore}%
              </h1>

              <p className={`text-xl font-semibold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
              </p>
              <p className={`font-urdu ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {passed ? 'کامیاب' : 'مزید تیاری کی ضرورت ہے'}
              </p>

              <div className="flex items-center justify-center space-x-4 mt-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {finalResult.duration}
                </span>
                {finalResult.flaggedAnswers > 0 && (
                  <span className="flex items-center text-red-500">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {finalResult.flaggedAnswers} flagged
                  </span>
                )}
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h2 className="font-semibold text-gray-800 mb-2">Feedback</h2>
              <p className="text-gray-600">{finalResult.feedback}</p>
              {finalResult.feedbackUrdu && (
                <p className="text-gray-500 font-urdu mt-3 pt-3 border-t border-gray-200">{finalResult.feedbackUrdu}</p>
              )}
            </div>

            {/* Strengths */}
            {finalResult.strengths && finalResult.strengths.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                <h2 className="font-semibold text-green-800 mb-3">Strengths</h2>
                <ul className="space-y-2">
                  {finalResult.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start text-sm text-green-900">
                      <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Concerns */}
            {finalResult.concerns && finalResult.concerns.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                <h2 className="font-semibold text-red-800 mb-3">Concerns</h2>
                <ul className="space-y-2">
                  {finalResult.concerns.map((concern, idx) => (
                    <li key={idx} className="flex items-start text-sm text-red-900">
                      <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 text-red-500 flex-shrink-0" />
                      <span>{concern}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Score Breakdown */}
            <div className="mb-6">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Score Breakdown
              </h2>
              <div className="space-y-3">
                {Object.entries(finalResult.scoreBreakdown).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-gray-600">{key}</span>
                      <span className="font-medium">{value}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Improvements */}
            {finalResult.improvements.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
                <h2 className="font-semibold text-yellow-800 mb-3">Areas for Improvement</h2>
                <ul className="space-y-2">
                  {finalResult.improvements.map((improvement, idx) => (
                    <li key={idx} className="flex items-start text-sm text-yellow-900">
                      <span className="mr-2">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Powered Badge */}
            {finalResult.aiPowered && (
              <div className="mb-4 flex items-center justify-center">
                <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-full border border-purple-200">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-purple-700">AI-Powered Evaluation</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={restartInterview}
                className="flex-1 py-3 bg-beoe-primary text-white rounded-xl font-semibold hover:bg-beoe-secondary transition-all flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Practice Again</span>
              </button>
              <button
                onClick={() => router.push('/results')}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all flex items-center justify-center space-x-2"
              >
                <TrendingUp className="w-5 h-5" />
                <span>View Combined Results</span>
              </button>
              <button
                onClick={() => {
                  console.log('Navigating to home...');
                  router.push('/');
                }}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return null;
}
