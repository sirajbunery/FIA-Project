'use client';

export default function Header() {
  return (
    <header className="bg-beoe-primary text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <span className="text-2xl">🇵🇰</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">BEOE Document Validator</h1>
              <p className="text-sm text-green-200">Travel Document Verification System</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-urdu">دستاویزات کی تصدیق</p>
            <p className="text-xs text-green-200">Bureau of Emigration & Overseas Employment</p>
          </div>
        </div>
      </div>
    </header>
  );
}
