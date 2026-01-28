'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, ChevronLeft, CheckCircle, Loader2, AlertCircle, Info } from 'lucide-react';
import axios from 'axios';

interface UploadedFile {
  file: File;
  preview: string;
  type: string;
}

interface DocumentRequirement {
  type: string;
  english: string;
  urdu: string;
}

interface VisaRequirements {
  required_documents: DocumentRequirement[];
  optional_documents: DocumentRequirement[];
  notes: string[];
  notes_urdu: string[];
}

interface Props {
  country: string;
  travelDate: string;
  visaType: string;
  onValidationComplete: (result: any) => void;
  onBack: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string) => void;
}

// Visa type labels for display
const visaTypeLabels: Record<string, { english: string; urdu: string }> = {
  tourist: { english: 'Tourist Visa', urdu: 'سیاحتی ویزا' },
  visit: { english: 'Visit Visa', urdu: 'وزٹ ویزا' },
  family: { english: 'Family Visa', urdu: 'فیملی ویزا' },
  work_professional: { english: 'Work Visa (Professional)', urdu: 'ورک ویزا (پروفیشنل)' },
  work_skilled: { english: 'Work Visa (Skilled Labor)', urdu: 'ورک ویزا (مزدور)' },
  student: { english: 'Student Visa', urdu: 'اسٹوڈنٹ ویزا' },
  business: { english: 'Business Visa', urdu: 'بزنس ویزا' },
  transit: { english: 'Transit Visa', urdu: 'ٹرانزٹ ویزا' },
};

// Fallback document types if API fails
const fallbackDocumentTypes = [
  { type: 'passport', english: 'Passport', urdu: 'پاسپورٹ' },
  { type: 'visa', english: 'Visa', urdu: 'ویزا' },
  { type: 'airline_ticket', english: 'Airline Ticket', urdu: 'ہوائی ٹکٹ' },
  { type: 'other', english: 'Other Document', urdu: 'دیگر دستاویز' },
];

export default function DocumentUploader({
  country,
  travelDate,
  visaType,
  onValidationComplete,
  onBack,
  isLoading,
  setIsLoading,
  setError
}: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Record<number, string>>({});
  const [requirements, setRequirements] = useState<VisaRequirements | null>(null);
  const [loadingRequirements, setLoadingRequirements] = useState(true);

  // Fetch visa-specific document requirements
  useEffect(() => {
    const fetchRequirements = async () => {
      if (!visaType) {
        setLoadingRequirements(false);
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const response = await axios.get(`${apiUrl}/api/validate/requirements/${visaType}`);

        if (response.data.success) {
          setRequirements({
            required_documents: response.data.required_documents,
            optional_documents: response.data.optional_documents,
            notes: response.data.notes,
            notes_urdu: response.data.notes_urdu,
          });
        }
      } catch (err) {
        console.error('Failed to fetch requirements:', err);
        // Use fallback if API fails
      } finally {
        setLoadingRequirements(false);
      }
    };

    fetchRequirements();
  }, [visaType]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: 'other',
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
    setSelectedTypes(prev => {
      const newTypes = { ...prev };
      delete newTypes[index];
      return newTypes;
    });
  };

  const updateFileType = (index: number, type: string) => {
    setSelectedTypes(prev => ({ ...prev, [index]: type }));
  };

  // Get all document types for dropdown
  const getAllDocumentTypes = () => {
    if (requirements) {
      const allDocs = [...requirements.required_documents, ...requirements.optional_documents];
      // Add 'other' if not present
      if (!allDocs.find(d => d.type === 'other')) {
        allDocs.push({ type: 'other', english: 'Other Document', urdu: 'دیگر دستاویز' });
      }
      return allDocs;
    }
    return fallbackDocumentTypes;
  };

  // Check if a document type has been uploaded
  const isDocumentUploaded = (docType: string) => {
    return Object.values(selectedTypes).includes(docType);
  };

  const handleValidate = async () => {
    if (files.length === 0) {
      setError('Please upload at least one document');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('destination_country', country);
      formData.append('visa_type', visaType);
      if (travelDate) {
        formData.append('travel_date', travelDate);
      }

      const types: string[] = [];
      files.forEach((f, index) => {
        formData.append('documents', f.file);
        types.push(selectedTypes[index] || 'other');
      });
      formData.append('document_types', JSON.stringify(types));

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await axios.post(`${apiUrl}/api/validate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minute timeout
      });

      if (response.data.success) {
        onValidationComplete(response.data.result);
      } else {
        setError(response.data.error || 'Validation failed');
      }
    } catch (err: any) {
      console.error('Validation error:', err);
      if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        setError('Cannot connect to server. Please make sure the backend is running.');
      } else {
        setError(err.response?.data?.error || 'Failed to validate documents. Please try again.');
      }
      setIsLoading(false);
    }
  };

  const visaLabel = visaTypeLabels[visaType] || { english: visaType, urdu: '' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-beoe-primary"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="text-right">
          <p className="text-sm text-gray-500">Destination</p>
          <p className="font-semibold text-beoe-primary">{country}</p>
          <p className="text-xs text-gray-600">{visaLabel.english}</p>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Upload Your Documents</h2>
        <p className="text-gray-600 mt-1 font-urdu">اپنی دستاویزات اپلوڈ کریں</p>
      </div>

      {/* Document Requirements Checklist */}
      {loadingRequirements ? (
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-2">Loading requirements...</p>
        </div>
      ) : requirements ? (
        <div className="space-y-4">
          {/* Required Documents */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              Required Documents (ضروری دستاویزات)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {requirements.required_documents.map(doc => (
                <div key={doc.type} className="flex items-center space-x-2 text-sm">
                  <span className={isDocumentUploaded(doc.type) ? 'text-green-600' : 'text-red-500'}>
                    {isDocumentUploaded(doc.type) ? '✓' : '•'}
                  </span>
                  <span className={`${isDocumentUploaded(doc.type) ? 'text-green-700' : 'text-gray-700'}`}>
                    {doc.english}
                  </span>
                  <span className="text-gray-400 font-urdu text-xs">({doc.urdu})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Documents */}
          {requirements.optional_documents.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center">
                <Info className="w-4 h-4 mr-2" />
                Optional Documents (اختیاری دستاویزات)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {requirements.optional_documents.map(doc => (
                  <div key={doc.type} className="flex items-center space-x-2 text-sm">
                    <span className={isDocumentUploaded(doc.type) ? 'text-green-600' : 'text-gray-400'}>
                      {isDocumentUploaded(doc.type) ? '✓' : '○'}
                    </span>
                    <span className="text-gray-700">{doc.english}</span>
                    <span className="text-gray-400 font-urdu text-xs">({doc.urdu})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {requirements.notes.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-700 mb-2">Important Notes:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {requirements.notes.map((note, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
              {requirements.notes_urdu.length > 0 && (
                <ul className="text-sm text-gray-600 font-urdu mt-2 space-y-1 text-right">
                  {requirements.notes_urdu.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Upload your travel documents:</h3>
          <p className="text-sm text-gray-600">Passport, Visa, Tickets, and any other relevant documents</p>
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700">
          {isDragActive ? 'Drop files here...' : 'Drag & drop documents here'}
        </p>
        <p className="text-sm text-gray-500 mt-1">or click to browse</p>
        <p className="text-sm text-gray-500 font-urdu mt-2">
          یہاں دستاویزات ڈالیں یا کلک کریں
        </p>
        <p className="text-xs text-gray-400 mt-4">
          Supported: JPEG, PNG, WebP, PDF (max 10MB each)
        </p>
      </div>

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Uploaded Documents ({files.length})
          </h3>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {file.file.type.startsWith('image/') ? (
                  <img
                    src={file.preview}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                    <FileText className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={selectedTypes[index] || 'other'}
                  onChange={(e) => updateFileType(index, e.target.value)}
                  className="text-sm border rounded p-1"
                >
                  <option value="other">Select type...</option>
                  {getAllDocumentTypes().map(doc => (
                    <option key={doc.type} value={doc.type}>{doc.english}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validate Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={handleValidate}
          disabled={files.length === 0 || isLoading}
          className={`px-8 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-all
            ${files.length > 0 && !isLoading
              ? 'bg-beoe-primary text-white hover:bg-beoe-secondary'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Validating...</span>
              <span className="font-urdu">تصدیق ہو رہی ہے</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Validate Documents</span>
              <span className="font-urdu">دستاویزات کی تصدیق کریں</span>
            </>
          )}
        </button>
      </div>

      {isLoading && (
        <div className="text-center text-sm text-gray-500">
          <p>This may take up to a minute. Please wait...</p>
          <p className="font-urdu">براہ کرم انتظار کریں</p>
        </div>
      )}
    </div>
  );
}
