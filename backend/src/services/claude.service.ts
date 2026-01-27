import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ValidationResult, ExtractedText, RequirementDetails, DocumentType } from '../models/types';

const VALIDATION_SYSTEM_PROMPT = `You are an expert travel document validator for Pakistan's Bureau of Emigration & Overseas Employment (BEOE).

Your role is to help Pakistani travelers verify their documents are complete before traveling internationally to prevent deportation/uploading at the airport by FIA Immigration.

When analyzing documents, check:

1. PASSPORT VALIDATION
   - Must be valid for 6+ months from travel date
   - Check for damage, missing pages indicators
   - Verify name matches other documents

2. VISA REQUIREMENTS
   - Appropriate visa type for purpose (work, visit, transit)
   - Valid for intended travel dates
   - Check sponsor information if applicable

3. BEOE REGISTRATION
   - Required for work-related travel to Gulf countries
   - Verify registration number format is valid
   - Check if exemption applies

4. DESTINATION-SPECIFIC REQUIREMENTS
   - Medical certificates (GAMCA for Saudi/Kuwait/UAE/Qatar/Bahrain/Oman)
   - Police clearance certificates
   - Employment contracts
   - Financial proof
   - Travel insurance

5. DOCUMENT CONSISTENCY
   - Names match across all documents
   - Dates are logical (no conflicts)
   - Information is current

Always respond in valid JSON format only. No additional text.`;

const RESPONSE_FORMAT = `{
  "status": "READY" | "INCOMPLETE" | "ISSUES",
  "ready_to_travel": boolean,
  "confidence_score": 0-100,
  "missing_documents": [
    {
      "document": "document name",
      "required": true | false,
      "reason": "why needed"
    }
  ],
  "concerns": [
    {
      "severity": "high" | "medium" | "low",
      "issue": "description",
      "resolution": "how to fix"
    }
  ],
  "recommendations": ["action items"],
  "next_steps": ["ordered list of what to do"],
  "urdu_summary": "اردو میں مکمل خلاصہ",
  "beoe_contacts": {
    "required": boolean,
    "office": "nearest office if needed",
    "phone": "phone number if available",
    "address": "address if available"
  }
}`;

export class ClaudeService {
  private client: Anthropic | null = null;

  constructor() {
    if (config.anthropicApiKey) {
      this.client = new Anthropic({
        apiKey: config.anthropicApiKey,
      });
    } else {
      logger.warn('Anthropic API key not configured. AI validation will be unavailable.');
    }
  }

  /**
   * Validate documents using Claude AI
   */
  async validateDocuments(
    documents: Array<{ type: DocumentType; extractedText: ExtractedText }>,
    destinationCountry: string,
    travelDate: string | null,
    countryRequirements: RequirementDetails | null
  ): Promise<ValidationResult> {
    if (!this.client) {
      return this.getDefaultValidationResult('AI service not configured');
    }

    try {
      const documentsSummary = documents.map(doc => ({
        type: doc.type,
        extracted_fields: doc.extractedText.fields,
        raw_text_preview: doc.extractedText.raw_text.substring(0, 500),
        ocr_confidence: doc.extractedText.confidence,
      }));

      const userMessage = `Please validate the following travel documents for a Pakistani traveler:

DESTINATION: ${destinationCountry}
TRAVEL DATE: ${travelDate || 'Not specified'}
TODAY'S DATE: ${new Date().toISOString().split('T')[0]}

COUNTRY REQUIREMENTS:
${countryRequirements ? JSON.stringify(countryRequirements, null, 2) : 'Using default requirements for ' + destinationCountry}

DOCUMENTS PROVIDED:
${JSON.stringify(documentsSummary, null, 2)}

Based on the above information, provide a complete validation assessment.
Respond ONLY with valid JSON in this exact format:
${RESPONSE_FORMAT}`;

      const response = await this.client.messages.create({
        model: config.claudeModel,
        max_tokens: 2048,
        system: VALIDATION_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse JSON response
      const result = this.parseValidationResponse(content.text);
      result.validated_at = new Date().toISOString();

      return result;
    } catch (error) {
      logger.error('Claude validation failed:', error);
      return this.getDefaultValidationResult('Validation service temporarily unavailable');
    }
  }

  /**
   * Identify document type using Claude AI
   */
  async identifyDocumentType(extractedText: ExtractedText): Promise<DocumentType> {
    if (!this.client) {
      return 'other';
    }

    try {
      const response = await this.client.messages.create({
        model: config.claudeModel,
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `Identify the type of this travel document from the extracted text.

Text: ${extractedText.raw_text.substring(0, 1000)}
Fields: ${JSON.stringify(extractedText.fields)}

Respond with ONLY one of these types (no explanation):
passport, visa, work_permit, beoe_registration, airline_ticket, medical_certificate, gamca_certificate, travel_insurance, bank_statement, hotel_booking, employment_contract, police_clearance, educational_certificate, other`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const docType = content.text.trim().toLowerCase().replace(/[^a-z_]/g, '') as DocumentType;
        return docType || 'other';
      }
    } catch (error) {
      logger.error('Document type identification failed:', error);
    }

    return 'other';
  }

  /**
   * Generate user-friendly response message
   */
  async generateResponseMessage(
    result: ValidationResult,
    includeUrdu: boolean = true
  ): Promise<{ english: string; urdu: string }> {
    let english = '';
    let urdu = result.urdu_summary;

    // Build English message
    if (result.status === 'READY') {
      english = '✅ VALIDATION COMPLETE - You are READY to travel!\n\n';
    } else if (result.status === 'INCOMPLETE') {
      english = '⚠️ VALIDATION INCOMPLETE - Some documents are missing\n\n';
    } else {
      english = '❌ ISSUES FOUND - Please review the concerns below\n\n';
    }

    english += `Confidence Score: ${result.confidence_score}%\n\n`;

    if (result.missing_documents.length > 0) {
      english += '📋 Missing Documents:\n';
      result.missing_documents.forEach((doc, i) => {
        english += `${i + 1}. ${doc.document} ${doc.required ? '(REQUIRED)' : '(Recommended)'}\n`;
        english += `   Reason: ${doc.reason}\n`;
      });
      english += '\n';
    }

    if (result.concerns.length > 0) {
      english += '⚠️ Concerns:\n';
      result.concerns.forEach((concern, i) => {
        const icon = concern.severity === 'high' ? '🔴' : concern.severity === 'medium' ? '🟡' : '🟢';
        english += `${icon} ${concern.issue}\n`;
        english += `   Solution: ${concern.resolution}\n`;
      });
      english += '\n';
    }

    if (result.next_steps.length > 0) {
      english += '📝 Next Steps:\n';
      result.next_steps.forEach((step, i) => {
        english += `${i + 1}. ${step}\n`;
      });
    }

    if (result.beoe_contacts.required && result.beoe_contacts.office) {
      english += `\n📞 BEOE Contact: ${result.beoe_contacts.office}`;
      if (result.beoe_contacts.phone) {
        english += ` - ${result.beoe_contacts.phone}`;
      }
    }

    return { english, urdu };
  }

  /**
   * Parse and validate Claude's JSON response
   */
  private parseValidationResponse(text: string): ValidationResult {
    try {
      // Clean up the response - remove any markdown formatting
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(cleanedText);

      // Validate and provide defaults
      return {
        status: parsed.status || 'ISSUES',
        ready_to_travel: parsed.ready_to_travel ?? false,
        confidence_score: parsed.confidence_score ?? 50,
        missing_documents: parsed.missing_documents || [],
        concerns: parsed.concerns || [],
        recommendations: parsed.recommendations || [],
        next_steps: parsed.next_steps || [],
        urdu_summary: parsed.urdu_summary || 'تصدیق مکمل',
        beoe_contacts: parsed.beoe_contacts || { required: false, office: null, phone: null, address: null },
        validated_at: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to parse validation response:', error);
      return this.getDefaultValidationResult('Failed to process validation');
    }
  }

  /**
   * Get default validation result for error cases
   */
  private getDefaultValidationResult(errorMessage: string): ValidationResult {
    return {
      status: 'ISSUES',
      ready_to_travel: false,
      confidence_score: 0,
      missing_documents: [],
      concerns: [
        {
          severity: 'high',
          issue: errorMessage,
          resolution: 'Please try again or contact support',
        },
      ],
      recommendations: ['Please resubmit your documents'],
      next_steps: ['Try uploading documents again', 'Contact support if issue persists'],
      urdu_summary: 'براہ کرم دوبارہ کوشش کریں',
      beoe_contacts: { required: false, office: null, phone: null, address: null },
      validated_at: new Date().toISOString(),
    };
  }
}

export const claudeService = new ClaudeService();
export default claudeService;
