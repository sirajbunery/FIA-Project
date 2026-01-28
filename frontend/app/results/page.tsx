'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  MessageCircle,
  ArrowRight,
  RotateCcw,
  TrendingUp,
  Clock,
} from 'lucide-react';

interface DocumentResult {
  status: 'READY' | 'INCOMPLETE' | 'ISSUES';
  confidence_score: number;
  country: string;
  visaType: string;
  travelDate: string;
  timestamp: string;
  missing_documents?: Array<{ document: string; required: boolean; reason: string }>;
  concerns?: Array<{ severity: 'high' | 'medium' | 'low'; issue: string; resolution: string }>;
}

interface InterviewResult {
  overallScore: number;
  passed: boolean;
  feedback: string;
  improvements: string[];
  visaType: string;
  country: string;
  timestamp: string;
  scoreBreakdown?: Record<string, number>;
}

export default function ResultsPage() {
  const router = useRouter();
  const [documentResult, setDocumentResult] = useState<DocumentResult | null>(null);
  const [interviewResult, setInterviewResult] = useState<InterviewResult | null>(null);

  useEffect(() => {
    // Load results from localStorage
    const docResult = localStorage.getItem('documentResult');
    const intResult = localStorage.getItem('interviewResult');

    if (docResult) {
      setDocumentResult(JSON.parse(docResult));
    }
    if (intResult) {
      setInterviewResult(JSON.parse(intResult));
    }
  }, []);

  const hasDocumentResult = documentResult !== null;
  const hasInterviewResult = interviewResult !== null;
  const hasBothResults = hasDocumentResult && hasInterviewResult;

  // Calculate overall readiness
  const getOverallReadiness = () => {
    if (!hasBothResults) return null;

    const docScore = documentResult!.confidence_score;
    const intScore = interviewResult!.overallScore;
    const docPassed = documentResult!.status === 'READY';
    const intPassed = interviewResult!.passed;

    const overallScore = Math.round((docScore + intScore) / 2);
    const overallPassed = docPassed && intPassed;

    return { overallScore, overallPassed, docScore, intScore, docPassed, intPassed };
  };

  const getImprovementPriority = () => {
    if (!hasBothResults) return null;

    const docScore = documentResult!.confidence_score;
    const intScore = interviewResult!.overallScore;

    if (docScore < intScore) {
      return {
        priority: 'documents',
        message: 'Focus on completing your document requirements first.',
        messageUrdu: 'پہلے اپنی دستاویزات کی ضروریات مکمل کریں۔',
        icon: FileText,
      };
    } else if (intScore < docScore) {
      return {
        priority: 'interview',
        message: 'Practice your interview responses to improve confidence.',
        messageUrdu: 'اپنے انٹرویو جوابات کی مشق کریں۔',
        icon: MessageCircle,
      };
    } else {
      return {
        priority: 'both',
        message: 'Both areas need equal attention. Keep practicing!',
        messageUrdu: 'دونوں شعبوں پر برابر توجہ دیں۔',
        icon: TrendingUp,
      };
    }
  };

  const clearResults = () => {
    localStorage.removeItem('documentResult');
    localStorage.removeItem('interviewResult');
    setDocumentResult(null);
    setInterviewResult(null);
  };

  const overall = getOverallReadiness();
  const improvement = getImprovementPriority();

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
      <Header />
      <div className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Your Travel Readiness</h1>
          <p className="text-gray-600 font-urdu mt-1">آپ کی سفر کی تیاری</p>
        </div>

        {/* No Results */}
        {!hasDocumentResult && !hasInterviewResult && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center animate-fade-in">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Results Yet</h2>
            <p className="text-gray-600 mb-6">
              Complete document validation and interview practice to see your combined results.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-beoe-primary text-white rounded-xl font-semibold hover:bg-beoe-secondary transition-all flex items-center justify-center space-x-2"
              >
                <FileText className="w-5 h-5" />
                <span>Validate Documents</span>
              </button>
              <button
                onClick={() => router.push('/interview')}
                className="px-6 py-3 border-2 border-beoe-primary text-beoe-primary rounded-xl font-semibold hover:bg-green-50 transition-all flex items-center justify-center space-x-2"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Take Interview</span>
              </button>
            </div>
          </div>
        )}

        {/* Combined Results */}
        {(hasDocumentResult || hasInterviewResult) && (
          <div className="space-y-6 animate-fade-in">
            {/* Overall Score - Only shown when both results exist */}
            {hasBothResults && overall && (
              <div className={`rounded-2xl shadow-xl p-8 text-center ${
                overall.overallPassed ? 'bg-green-50' : 'bg-yellow-50'
              }`}>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  overall.overallPassed ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {overall.overallPassed ? (
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-12 h-12 text-yellow-600" />
                  )}
                </div>

                <h2 className={`text-5xl font-bold mb-2 ${
                  overall.overallPassed ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {overall.overallScore}%
                </h2>

                <p className={`text-xl font-semibold ${
                  overall.overallPassed ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {overall.overallPassed ? 'TRAVEL READY' : 'NEEDS IMPROVEMENT'}
                </p>
                <p className={`font-urdu ${
                  overall.overallPassed ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {overall.overallPassed ? 'سفر کے لیے تیار' : 'مزید بہتری کی ضرورت'}
                </p>

                {/* Score Comparison */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl ${overall.docPassed ? 'bg-green-100' : 'bg-red-100'}`}>
                    <FileText className={`w-6 h-6 mx-auto mb-2 ${overall.docPassed ? 'text-green-600' : 'text-red-600'}`} />
                    <p className="text-sm text-gray-600">Documents</p>
                    <p className={`text-2xl font-bold ${overall.docPassed ? 'text-green-700' : 'text-red-700'}`}>
                      {overall.docScore}%
                    </p>
                  </div>
                  <div className={`p-4 rounded-xl ${overall.intPassed ? 'bg-green-100' : 'bg-red-100'}`}>
                    <MessageCircle className={`w-6 h-6 mx-auto mb-2 ${overall.intPassed ? 'text-green-600' : 'text-red-600'}`} />
                    <p className="text-sm text-gray-600">Interview</p>
                    <p className={`text-2xl font-bold ${overall.intPassed ? 'text-green-700' : 'text-red-700'}`}>
                      {overall.intScore}%
                    </p>
                  </div>
                </div>

                {/* Improvement Priority */}
                {!overall.overallPassed && improvement && (
                  <div className="mt-6 p-4 bg-white rounded-xl border-2 border-yellow-200">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <improvement.icon className="w-5 h-5 text-yellow-600" />
                      <span className="font-semibold text-yellow-800">Priority Focus</span>
                    </div>
                    <p className="text-gray-700">{improvement.message}</p>
                    <p className="text-gray-600 font-urdu text-sm mt-1">{improvement.messageUrdu}</p>
                  </div>
                )}
              </div>
            )}

            {/* Document Result Card */}
            {hasDocumentResult && documentResult && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      documentResult.status === 'READY' ? 'bg-green-100' :
                      documentResult.status === 'INCOMPLETE' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      <FileText className={`w-6 h-6 ${
                        documentResult.status === 'READY' ? 'text-green-600' :
                        documentResult.status === 'INCOMPLETE' ? 'text-yellow-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Document Validation</h3>
                      <p className="text-sm text-gray-500 font-urdu">دستاویزات کی تصدیق</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    documentResult.status === 'READY' ? 'bg-green-100 text-green-700' :
                    documentResult.status === 'INCOMPLETE' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {documentResult.confidence_score}%
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-medium ${
                      documentResult.status === 'READY' ? 'text-green-600' :
                      documentResult.status === 'INCOMPLETE' ? 'text-yellow-600' : 'text-red-600'
                    }`}>{documentResult.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Destination</span>
                    <span className="font-medium">{documentResult.country}</span>
                  </div>
                  {documentResult.visaType && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Visa Type</span>
                      <span className="font-medium capitalize">{documentResult.visaType.replace('_', ' ')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Validated</span>
                    <span>{new Date(documentResult.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>

                {!hasInterviewResult && (
                  <button
                    onClick={() => router.push('/interview')}
                    className="mt-4 w-full py-2 border-2 border-beoe-primary text-beoe-primary rounded-xl font-semibold hover:bg-green-50 transition-all flex items-center justify-center space-x-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Take Interview to Complete</span>
                  </button>
                )}
              </div>
            )}

            {/* Interview Result Card */}
            {hasInterviewResult && interviewResult && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      interviewResult.passed ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <MessageCircle className={`w-6 h-6 ${
                        interviewResult.passed ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Interview Practice</h3>
                      <p className="text-sm text-gray-500 font-urdu">انٹرویو کی مشق</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    interviewResult.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {interviewResult.overallScore}%
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-medium ${interviewResult.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {interviewResult.passed ? 'PASSED' : 'NEEDS PRACTICE'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Destination</span>
                    <span className="font-medium">{interviewResult.country}</span>
                  </div>
                  {interviewResult.visaType && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Visa Type</span>
                      <span className="font-medium capitalize">{interviewResult.visaType}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Completed</span>
                    <span>{new Date(interviewResult.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>

                {interviewResult.improvements && interviewResult.improvements.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs font-semibold text-yellow-800 mb-1">Areas to Improve:</p>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      {interviewResult.improvements.slice(0, 2).map((item, idx) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {!hasDocumentResult && (
                  <button
                    onClick={() => router.push('/')}
                    className="mt-4 w-full py-2 border-2 border-beoe-primary text-beoe-primary rounded-xl font-semibold hover:bg-green-50 transition-all flex items-center justify-center space-x-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Validate Documents to Complete</span>
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              {!hasBothResults && (
                <button
                  onClick={() => router.push(hasDocumentResult ? '/interview' : '/')}
                  className="flex-1 py-3 bg-beoe-primary text-white rounded-xl font-semibold hover:bg-beoe-secondary transition-all flex items-center justify-center space-x-2"
                >
                  <span>{hasDocumentResult ? 'Complete Interview' : 'Complete Validation'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={clearResults}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Start Fresh</span>
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
