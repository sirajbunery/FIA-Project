'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Image, ChevronLeft, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

interface UploadedFile {
  file: File;
  preview: string;
  type: string;
}

interface Props {
  country: string;
  travelDate: string;
  onValidationComplete: (result: any) => void;
  onBack: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string) => void;
}

const documentTypes = [
  { id: 'passport', label: 'Passport', urdu: 'پاسپورٹ', required: true },
  { id: 'visa', label: 'Visa', urdu: 'ویزا', required: true },
  { id: 'beoe_registration', label: 'BEOE Registration', urdu: 'بی ای او ای رجسٹریشن', required: false },
  { id: 'gamca_certificate', label: 'GAMCA/Medical', urdu: 'میڈیکل سرٹیفکیٹ', required: false },
  { id: 'airline_ticket', label: 'Airline Ticket', urdu: 'ہوائی ٹکٹ', required: true },
  { id: 'employment_contract', label: 'Employment Contract', urdu: 'ملازمت کا معاہدہ', required: false },
];

export default function DocumentUploader({
  country,
  travelDate,
  onValidationComplete,
  onBack,
  isLoading,
  setIsLoading,
  setError
}: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Record<number, string>>({});

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
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Upload Your Documents</h2>
        <p className="text-gray-600 mt-1">اپنی دستاویزات اپلوڈ کریں</p>
      </div>

      {/* Document Types Checklist */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Required Documents:</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {documentTypes.map(doc => (
            <div key={doc.id} className="flex items-center space-x-2 text-sm">
              <span className={doc.required ? 'text-red-500' : 'text-gray-400'}>
                {files.some((f, i) => selectedTypes[i] === doc.id) ? '✓' : doc.required ? '•' : '○'}
              </span>
              <span className="text-gray-700">{doc.label}</span>
            </div>
          ))}
        </div>
      </div>

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
                  {documentTypes.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.label}</option>
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
