'use client';

import { useState } from 'react';
import { Briefcase, Plane, Users, GraduationCap, Building2, ArrowLeftRight, ChevronRight, ChevronLeft, FileText } from 'lucide-react';

interface VisaType {
  type: string;
  english: string;
  urdu: string;
  icon: React.ReactNode;
  description: string;
}

const visaTypes: VisaType[] = [
  {
    type: 'tourist',
    english: 'Tourist Visa',
    urdu: 'سیاحتی ویزا',
    icon: <Plane className="w-6 h-6" />,
    description: 'For tourism and sightseeing',
  },
  {
    type: 'visit',
    english: 'Visit Visa',
    urdu: 'وزٹ ویزا',
    icon: <Users className="w-6 h-6" />,
    description: 'For visiting family/friends',
  },
  {
    type: 'family',
    english: 'Family Visa',
    urdu: 'فیملی ویزا',
    icon: <Users className="w-6 h-6" />,
    description: 'For family reunion/joining spouse',
  },
  {
    type: 'work_professional',
    english: 'Work Visa (Professional)',
    urdu: 'ورک ویزا (پروفیشنل)',
    icon: <Briefcase className="w-6 h-6" />,
    description: 'For professionals and educated workers',
  },
  {
    type: 'work_skilled',
    english: 'Work Visa (Skilled Labor)',
    urdu: 'ورک ویزا (مزدور/ڈرائیور)',
    icon: <Briefcase className="w-6 h-6" />,
    description: 'For drivers, technicians, laborers',
  },
  {
    type: 'student',
    english: 'Student Visa',
    urdu: 'اسٹوڈنٹ ویزا',
    icon: <GraduationCap className="w-6 h-6" />,
    description: 'For studying abroad',
  },
  {
    type: 'business',
    english: 'Business Visa',
    urdu: 'بزنس ویزا',
    icon: <Building2 className="w-6 h-6" />,
    description: 'For business meetings/conferences',
  },
  {
    type: 'transit',
    english: 'Transit Visa',
    urdu: 'ٹرانزٹ ویزا',
    icon: <ArrowLeftRight className="w-6 h-6" />,
    description: 'For transit through a country',
  },
];

interface Props {
  country: string;
  onSelect: (visaType: string) => void;
  onBack: () => void;
}

export default function VisaTypeSelector({ country, onSelect, onBack }: Props) {
  const [selectedVisa, setSelectedVisa] = useState<string>('');

  const handleContinue = () => {
    if (selectedVisa) {
      onSelect(selectedVisa);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">What type of visa do you have?</h2>
        <p className="text-gray-600 mt-1 font-urdu">آپ کے پاس کس قسم کا ویزا ہے؟</p>
        <p className="text-sm text-beoe-primary mt-2">
          <FileText className="w-4 h-4 inline mr-1" />
          Different visa types require different documents
        </p>
      </div>

      {/* Visa Type Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visaTypes.map((visa) => (
          <button
            key={visa.type}
            onClick={() => setSelectedVisa(visa.type)}
            className={`p-4 rounded-lg border-2 transition-all text-left
              ${selectedVisa === visa.type
                ? 'border-beoe-primary bg-green-50'
                : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
              }`}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${selectedVisa === visa.type ? 'bg-beoe-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                {visa.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{visa.english}</p>
                <p className="text-sm text-gray-500 font-urdu">{visa.urdu}</p>
                <p className="text-xs text-gray-400 mt-1">{visa.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="pt-4 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
          <span className="font-urdu">واپس</span>
        </button>

        <button
          onClick={handleContinue}
          disabled={!selectedVisa}
          className={`flex-1 sm:flex-none px-8 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all
            ${selectedVisa
              ? 'bg-beoe-primary text-white hover:bg-beoe-secondary'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
        >
          <span>Continue</span>
          <span className="font-urdu">آگے بڑھیں</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
