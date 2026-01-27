'use client';

import { useState } from 'react';
import { MapPin, Calendar, ChevronRight } from 'lucide-react';

interface Country {
  code: string;
  name: string;
  nameUrdu: string;
  flag: string;
  popular?: boolean;
}

const countries: Country[] = [
  { code: 'SA', name: 'Saudi Arabia', nameUrdu: 'سعودی عرب', flag: '🇸🇦', popular: true },
  { code: 'AE', name: 'United Arab Emirates', nameUrdu: 'متحدہ عرب امارات', flag: '🇦🇪', popular: true },
  { code: 'QA', name: 'Qatar', nameUrdu: 'قطر', flag: '🇶🇦', popular: true },
  { code: 'KW', name: 'Kuwait', nameUrdu: 'کویت', flag: '🇰🇼', popular: true },
  { code: 'OM', name: 'Oman', nameUrdu: 'عمان', flag: '🇴🇲', popular: true },
  { code: 'BH', name: 'Bahrain', nameUrdu: 'بحرین', flag: '🇧🇭', popular: true },
  { code: 'MY', name: 'Malaysia', nameUrdu: 'ملائیشیا', flag: '🇲🇾' },
  { code: 'GB', name: 'United Kingdom', nameUrdu: 'برطانیہ', flag: '🇬🇧' },
  { code: 'US', name: 'United States', nameUrdu: 'امریکہ', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', nameUrdu: 'کینیڈا', flag: '🇨🇦' },
];

interface Props {
  onSelect: (country: string, date: string) => void;
}

export default function CountrySelector({ onSelect }: Props) {
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [travelDate, setTravelDate] = useState<string>('');
  const [showAllCountries, setShowAllCountries] = useState(false);

  const popularCountries = countries.filter(c => c.popular);
  const otherCountries = countries.filter(c => !c.popular);

  const handleContinue = () => {
    if (selectedCountry) {
      onSelect(selectedCountry, travelDate);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Where are you traveling?</h2>
        <p className="text-gray-600 mt-1">آپ کہاں سفر کر رہے ہیں؟</p>
      </div>

      {/* Popular Destinations */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center">
          <MapPin className="w-4 h-4 mr-2" />
          Popular Destinations (مقبول مقامات)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {popularCountries.map((country) => (
            <button
              key={country.code}
              onClick={() => setSelectedCountry(country.code)}
              className={`p-4 rounded-lg border-2 transition-all text-left
                ${selectedCountry === country.code
                  ? 'border-beoe-primary bg-green-50'
                  : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{country.flag}</span>
                <div>
                  <p className="font-medium text-gray-800">{country.name}</p>
                  <p className="text-sm text-gray-500 font-urdu">{country.nameUrdu}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Other Countries */}
      {showAllCountries && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-3">Other Countries</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {otherCountries.map((country) => (
              <button
                key={country.code}
                onClick={() => setSelectedCountry(country.code)}
                className={`p-4 rounded-lg border-2 transition-all text-left
                  ${selectedCountry === country.code
                    ? 'border-beoe-primary bg-green-50'
                    : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{country.flag}</span>
                  <div>
                    <p className="font-medium text-gray-800">{country.name}</p>
                    <p className="text-sm text-gray-500 font-urdu">{country.nameUrdu}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!showAllCountries && (
        <button
          onClick={() => setShowAllCountries(true)}
          className="text-beoe-primary hover:underline text-sm"
        >
          Show more countries...
        </button>
      )}

      {/* Travel Date */}
      <div className="pt-4 border-t">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Calendar className="w-4 h-4 inline mr-2" />
          Travel Date (Optional) - سفر کی تاریخ
        </label>
        <input
          type="date"
          value={travelDate}
          onChange={(e) => setTravelDate(e.target.value)}
          min={today}
          className="w-full sm:w-64 p-3 border rounded-lg focus:ring-2 focus:ring-beoe-primary focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Helps verify passport validity (پاسپورٹ کی درستگی کی تصدیق کے لیے)
        </p>
      </div>

      {/* Continue Button */}
      <div className="pt-4">
        <button
          onClick={handleContinue}
          disabled={!selectedCountry}
          className={`w-full sm:w-auto px-8 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all
            ${selectedCountry
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
