'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MessageCircle, X, ArrowRight, BarChart3 } from 'lucide-react';

export default function FloatingInterviewButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  // Don't show on interview page or results page
  const isInterviewPage = pathname === '/interview';
  const isResultsPage = pathname === '/results';

  useEffect(() => {
    // Show button after a short delay for better UX
    const timer = setTimeout(() => setIsVisible(true), 1000);

    // Check for existing results
    const checkResults = () => {
      const docResult = localStorage.getItem('documentResult');
      const intResult = localStorage.getItem('interviewResult');
      setHasResults(!!(docResult || intResult));
    };
    checkResults();

    // Listen for storage changes
    window.addEventListener('storage', checkResults);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', checkResults);
    };
  }, []);

  if (isInterviewPage || isResultsPage || !isVisible) return null;

  const handleClick = () => {
    if (isExpanded) {
      router.push('/interview');
    } else {
      setIsExpanded(true);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded Card */}
      {isExpanded && (
        <div className="absolute bottom-20 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-bounce-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-beoe-primary to-beoe-secondary p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-lg">🛂</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm">Immigration Interview</h3>
                  <p className="text-xs text-green-100 font-urdu">امیگریشن انٹرویو</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-gray-600 text-sm mb-3">
              Practice your immigration interview with AI. Get instant feedback and improve your confidence!
            </p>
            <p className="text-gray-500 text-xs font-urdu mb-4">
              AI کے ساتھ اپنے امیگریشن انٹرویو کی مشق کریں
            </p>

            <div className="space-y-2">
              <button
                onClick={() => router.push('/interview')}
                className="w-full py-3 bg-beoe-primary text-white rounded-xl font-semibold hover:bg-beoe-secondary transition-all flex items-center justify-center space-x-2 group"
              >
                <span>Take Interview</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {hasResults && (
                <button
                  onClick={() => router.push('/results')}
                  className="w-full py-2 border-2 border-beoe-primary text-beoe-primary rounded-xl font-semibold hover:bg-green-50 transition-all flex items-center justify-center space-x-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Check Results</span>
                </button>
              )}
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={handleClick}
        className={`group relative flex items-center justify-center transition-all duration-300 ${
          isExpanded
            ? 'w-14 h-14 bg-beoe-primary rounded-full shadow-lg hover:shadow-xl'
            : 'bg-gradient-to-r from-beoe-primary to-beoe-secondary rounded-full shadow-lg hover:shadow-xl'
        }`}
      >
        {isExpanded ? (
          <MessageCircle className="w-6 h-6 text-white" />
        ) : (
          <div className="flex items-center px-5 py-3 space-x-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-left pr-2">
              <span className="text-white font-semibold text-sm block">Take Interview</span>
              <span className="text-green-100 text-xs font-urdu">انٹرویو دیں</span>
            </div>
          </div>
        )}

        {/* Pulse animation when not expanded */}
        {!isExpanded && (
          <span className="absolute inset-0 rounded-full animate-ping bg-beoe-primary/30" />
        )}
      </button>
    </div>
  );
}
