'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import CountrySelector from '@/components/CountrySelector';
import VisaTypeSelector from '@/components/VisaTypeSelector';
import DocumentUploader from '@/components/DocumentUploader';
import ValidationResult from '@/components/ValidationResult';
import Footer from '@/components/Footer';

interface ValidationResultData {
  status: 'READY' | 'INCOMPLETE' | 'ISSUES';
  ready_to_travel: boolean;
  confidence_score: number;
  missing_documents: Array<{ document: string; required: boolean; reason: string }>;
  concerns: Array<{ severity: 'high' | 'medium' | 'low'; issue: string; resolution: string }>;
  recommendations: string[];
  next_steps: string[];
  urdu_summary: string;
}

type Step = 'country' | 'visa' | 'upload' | 'result';

export default function Home() {
  const [step, setStep] = useState<Step>('country');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [travelDate, setTravelDate] = useState<string>('');
  const [selectedVisaType, setSelectedVisaType] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResultData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleCountrySelect = (country: string, date: string) => {
    setSelectedCountry(country);
    setTravelDate(date);
    setStep('visa');
    setError('');
  };

  const handleVisaTypeSelect = (visaType: string) => {
    setSelectedVisaType(visaType);
    setStep('upload');
    setError('');
  };

  const handleValidationComplete = (result: ValidationResultData) => {
    setValidationResult(result);
    setStep('result');
    setIsLoading(false);

    // Store validation result in localStorage
    const documentResult = {
      ...result,
      country: selectedCountry,
      visaType: selectedVisaType,
      travelDate,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('documentResult', JSON.stringify(documentResult));
  };

  const handleStartOver = () => {
    setStep('country');
    setSelectedCountry('');
    setTravelDate('');
    setSelectedVisaType('');
    setValidationResult(null);
    setError('');
  };

  const getStepNumber = (currentStep: Step): number => {
    const steps: Step[] = ['country', 'visa', 'upload', 'result'];
    return steps.indexOf(currentStep) + 1;
  };

  const isStepCompleted = (checkStep: Step): boolean => {
    const steps: Step[] = ['country', 'visa', 'upload', 'result'];
    return steps.indexOf(step) > steps.indexOf(checkStep);
  };

  return (
    <main className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 min-w-max px-4">
            <StepIndicator
              number={1}
              label="Country"
              labelUrdu="ملک"
              active={step === 'country'}
              completed={isStepCompleted('country')}
            />
            <div className={`w-8 sm:w-16 h-1 ${isStepCompleted('country') ? 'bg-beoe-primary' : 'bg-gray-300'}`} />
            <StepIndicator
              number={2}
              label="Visa Type"
              labelUrdu="ویزا کی قسم"
              active={step === 'visa'}
              completed={isStepCompleted('visa')}
            />
            <div className={`w-8 sm:w-16 h-1 ${isStepCompleted('visa') ? 'bg-beoe-primary' : 'bg-gray-300'}`} />
            <StepIndicator
              number={3}
              label="Documents"
              labelUrdu="دستاویزات"
              active={step === 'upload'}
              completed={isStepCompleted('upload')}
            />
            <div className={`w-8 sm:w-16 h-1 ${step === 'result' ? 'bg-beoe-primary' : 'bg-gray-300'}`} />
            <StepIndicator
              number={4}
              label="Results"
              labelUrdu="نتائج"
              active={step === 'result'}
              completed={false}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="card">
          {step === 'country' && (
            <CountrySelector onSelect={handleCountrySelect} />
          )}

          {step === 'visa' && (
            <VisaTypeSelector
              country={selectedCountry}
              onSelect={handleVisaTypeSelect}
              onBack={() => setStep('country')}
            />
          )}

          {step === 'upload' && (
            <DocumentUploader
              country={selectedCountry}
              travelDate={travelDate}
              visaType={selectedVisaType}
              onValidationComplete={handleValidationComplete}
              onBack={() => setStep('visa')}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              setError={setError}
            />
          )}

          {step === 'result' && validationResult && (
            <ValidationResult
              result={validationResult}
              country={selectedCountry}
              visaType={selectedVisaType}
              onStartOver={handleStartOver}
            />
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}

function StepIndicator({
  number,
  label,
  labelUrdu,
  active,
  completed
}: {
  number: number;
  label: string;
  labelUrdu: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base
          ${active ? 'bg-beoe-primary' : completed ? 'bg-beoe-secondary' : 'bg-gray-300'}`}
      >
        {completed ? '✓' : number}
      </div>
      <span className={`mt-2 text-xs sm:text-sm ${active ? 'text-beoe-primary font-semibold' : 'text-gray-500'}`}>
        {label}
      </span>
      <span className={`text-xs font-urdu ${active ? 'text-beoe-primary' : 'text-gray-400'}`}>
        {labelUrdu}
      </span>
    </div>
  );
}
