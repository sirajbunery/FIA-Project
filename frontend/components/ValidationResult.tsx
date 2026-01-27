'use client';

import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Phone, MapPin, ArrowRight } from 'lucide-react';

interface ValidationResultData {
  status: 'READY' | 'INCOMPLETE' | 'ISSUES';
  ready_to_travel: boolean;
  confidence_score: number;
  missing_documents: Array<{ document: string; required: boolean; reason: string }>;
  concerns: Array<{ severity: 'high' | 'medium' | 'low'; issue: string; resolution: string }>;
  recommendations: string[];
  next_steps: string[];
  urdu_summary: string;
  beoe_contacts?: {
    required: boolean;
    office: string | null;
    phone: string | null;
    address: string | null;
  };
}

interface Props {
  result: ValidationResultData;
  country: string;
  onStartOver: () => void;
}

export default function ValidationResult({ result, country, onStartOver }: Props) {
  const getStatusConfig = () => {
    switch (result.status) {
      case 'READY':
        return {
          icon: CheckCircle,
          color: 'green',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-700',
          title: 'Ready to Travel!',
          titleUrdu: 'سفر کے لیے تیار!',
        };
      case 'INCOMPLETE':
        return {
          icon: AlertTriangle,
          color: 'yellow',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          title: 'Documents Incomplete',
          titleUrdu: 'دستاویزات نامکمل',
        };
      case 'ISSUES':
      default:
        return {
          icon: XCircle,
          color: 'red',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          title: 'Issues Found',
          titleUrdu: 'مسائل پائے گئے',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className={`${statusConfig.bgColor} ${statusConfig.borderColor} border-2 rounded-xl p-6 text-center`}>
        <StatusIcon className={`w-16 h-16 mx-auto ${statusConfig.textColor}`} />
        <h2 className={`text-2xl font-bold mt-4 ${statusConfig.textColor}`}>
          {statusConfig.title}
        </h2>
        <p className={`text-lg font-urdu ${statusConfig.textColor}`}>
          {statusConfig.titleUrdu}
        </p>
        <div className="mt-4">
          <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full">
            <span className="text-gray-600">Confidence Score:</span>
            <span className={`font-bold text-lg ${statusConfig.textColor}`}>
              {result.confidence_score}%
            </span>
          </div>
        </div>
      </div>

      {/* Urdu Summary */}
      {result.urdu_summary && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">اردو میں خلاصہ</h3>
          <p className="font-urdu text-lg text-gray-700 leading-relaxed">
            {result.urdu_summary}
          </p>
        </div>
      )}

      {/* Missing Documents */}
      {result.missing_documents.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-3 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Missing Documents (گمشدہ دستاویزات)
          </h3>
          <ul className="space-y-3">
            {result.missing_documents.map((doc, index) => (
              <li key={index} className="flex items-start space-x-3">
                <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${doc.required ? 'bg-red-500' : 'bg-yellow-500'}`} />
                <div>
                  <p className="font-medium text-gray-800">
                    {doc.document}
                    {doc.required && <span className="text-red-500 ml-2">(Required)</span>}
                  </p>
                  <p className="text-sm text-gray-600">{doc.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Concerns */}
      {result.concerns.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-3 flex items-center">
            <XCircle className="w-5 h-5 mr-2" />
            Concerns (خدشات)
          </h3>
          <ul className="space-y-4">
            {result.concerns.map((concern, index) => (
              <li key={index} className="border-l-4 pl-4 py-2"
                  style={{
                    borderColor: concern.severity === 'high' ? '#ef4444' :
                                 concern.severity === 'medium' ? '#f59e0b' : '#22c55e'
                  }}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    concern.severity === 'high' ? 'bg-red-100 text-red-700' :
                    concern.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {concern.severity.toUpperCase()}
                  </span>
                </div>
                <p className="font-medium text-gray-800">{concern.issue}</p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Solution:</span> {concern.resolution}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Steps */}
      {result.next_steps.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
            <ArrowRight className="w-5 h-5 mr-2" />
            Next Steps (اگلے اقدامات)
          </h3>
          <ol className="space-y-2">
            {result.next_steps.map((step, index) => (
              <li key={index} className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <span className="text-gray-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-3">
            Recommendations (سفارشات)
          </h3>
          <ul className="space-y-2">
            {result.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* BEOE Contact Info */}
      {result.beoe_contacts?.required && result.beoe_contacts.office && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-purple-800 mb-3 flex items-center">
            <Phone className="w-5 h-5 mr-2" />
            BEOE Office Contact (بی ای او ای دفتر)
          </h3>
          <div className="space-y-2">
            <p className="text-gray-700">
              <strong>Office:</strong> {result.beoe_contacts.office}
            </p>
            {result.beoe_contacts.phone && (
              <p className="text-gray-700">
                <strong>Phone:</strong> {result.beoe_contacts.phone}
              </p>
            )}
            {result.beoe_contacts.address && (
              <p className="text-gray-700 flex items-start">
                <MapPin className="w-4 h-4 mr-1 mt-1 flex-shrink-0" />
                {result.beoe_contacts.address}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
        <button
          onClick={onStartOver}
          className="px-6 py-3 bg-beoe-primary text-white rounded-lg font-semibold hover:bg-beoe-secondary transition-colors flex items-center justify-center space-x-2"
        >
          <RefreshCw className="w-5 h-5" />
          <span>Start New Validation</span>
        </button>
        <button
          onClick={() => window.print()}
          className="px-6 py-3 border-2 border-beoe-primary text-beoe-primary rounded-lg font-semibold hover:bg-green-50 transition-colors"
        >
          Print Results
        </button>
      </div>

      {/* Disclaimer */}
      <div className="text-center text-xs text-gray-500 pt-4 border-t">
        <p>
          This validation is for guidance only. Please verify all documents with official sources before traveling.
        </p>
        <p className="font-urdu mt-1">
          یہ تصدیق صرف رہنمائی کے لیے ہے۔ سفر سے پہلے تمام دستاویزات کی سرکاری ذرائع سے تصدیق کریں۔
        </p>
      </div>
    </div>
  );
}
