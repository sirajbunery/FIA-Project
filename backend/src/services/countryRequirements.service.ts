import { getSupabaseClient } from '../config/supabase';
import { logger } from '../utils/logger';
import { RequirementDetails, CountryRequirement } from '../models/types';

// Default requirements database
const DEFAULT_REQUIREMENTS: Record<string, RequirementDetails> = {
  SA: {
    // Saudi Arabia
    visa_required: true,
    beoe_registration: true,
    medical_required: true,
    medical_type: 'GAMCA',
    police_clearance: true,
    travel_insurance: false,
    minimum_passport_validity_months: 6,
    additional_documents: [
      'Employment contract (for work visa)',
      'Sponsor letter',
      'Mofa attestation',
      'Educational certificates (attested)',
    ],
    special_notes: [
      'GAMCA medical is mandatory for work visa',
      'BEOE registration required for all work-related travel',
      'Iqama required for returning residents',
      'Women may need mahram consent for certain visa types',
    ],
    embassy_info: {
      address: 'House 5, Street 25, F-6/2, Islamabad',
      phone: '+92-51-2870601',
      email: 'pkemb@mofa.gov.sa',
      website: 'https://www.saudiembassy.org.pk',
    },
  },
  AE: {
    // UAE
    visa_required: true,
    beoe_registration: true,
    medical_required: true,
    medical_type: 'GAMCA',
    police_clearance: false,
    travel_insurance: false,
    minimum_passport_validity_months: 6,
    additional_documents: [
      'Employment contract (for work visa)',
      'Emirates ID (for residents)',
      'Sponsor copy of visa',
    ],
    special_notes: [
      'GAMCA medical required for work visa',
      'Visit visa available on arrival for some categories',
      'BEOE registration mandatory for employment visa',
    ],
    embassy_info: {
      address: 'House 1, Street 22, F-6/2, Islamabad',
      phone: '+92-51-2824175',
      email: 'islamabad@mofa.gov.ae',
      website: 'https://www.mofaic.gov.ae',
    },
  },
  QA: {
    // Qatar
    visa_required: true,
    beoe_registration: true,
    medical_required: true,
    medical_type: 'GAMCA',
    police_clearance: false,
    travel_insurance: false,
    minimum_passport_validity_months: 6,
    additional_documents: [
      'Employment contract',
      'QID (for residents)',
      'NOC from sponsor (for residents)',
    ],
    special_notes: [
      'GAMCA medical mandatory for work visa',
      'Visit visa available through Hayya portal',
      'BEOE registration required for employment',
    ],
    embassy_info: {
      address: 'House 24, Street 14, F-7/2, Islamabad',
      phone: '+92-51-2654040',
      email: 'islamabad@mofa.gov.qa',
      website: 'https://islamabad.embassy.qa',
    },
  },
  OM: {
    // Oman
    visa_required: true,
    beoe_registration: true,
    medical_required: true,
    medical_type: 'GAMCA',
    police_clearance: true,
    travel_insurance: false,
    minimum_passport_validity_months: 6,
    additional_documents: [
      'Employment contract',
      'Police clearance certificate',
      'Educational certificates (attested)',
    ],
    special_notes: [
      'GAMCA medical required for work visa',
      'Police clearance mandatory',
      'BEOE registration required',
    ],
    embassy_info: {
      address: 'House 15, Street 53, F-7/4, Islamabad',
      phone: '+92-51-2655175',
      email: 'islamabad@mofa.gov.om',
      website: 'https://www.oman.org.pk',
    },
  },
  KW: {
    // Kuwait
    visa_required: true,
    beoe_registration: true,
    medical_required: true,
    medical_type: 'GAMCA',
    police_clearance: true,
    travel_insurance: false,
    minimum_passport_validity_months: 6,
    additional_documents: [
      'Employment contract',
      'Educational certificates (attested)',
      'Police clearance',
    ],
    special_notes: [
      'GAMCA medical mandatory',
      'Police clearance required',
      'BEOE registration mandatory for work visa',
    ],
    embassy_info: {
      address: 'House 13-A, Street 25, F-6/2, Islamabad',
      phone: '+92-51-2824925',
      email: 'info@kuwaitembassy.pk',
      website: 'https://www.kuwaitembassy.pk',
    },
  },
  BH: {
    // Bahrain
    visa_required: true,
    beoe_registration: true,
    medical_required: true,
    medical_type: 'GAMCA',
    police_clearance: false,
    travel_insurance: false,
    minimum_passport_validity_months: 6,
    additional_documents: [
      'Employment contract',
      'NOC from current sponsor (for residents)',
    ],
    special_notes: [
      'GAMCA medical required for work visa',
      'BEOE registration mandatory',
      'Visit visa may be obtained on arrival',
    ],
    embassy_info: {
      address: 'House 10, Street 87, G-6/3, Islamabad',
      phone: '+92-51-2825682',
      email: 'islamabad.mission@mofa.gov.bh',
      website: 'https://www.mofa.gov.bh',
    },
  },
  MY: {
    // Malaysia
    visa_required: false,
    beoe_registration: false,
    medical_required: false,
    medical_type: null,
    police_clearance: false,
    travel_insurance: true,
    minimum_passport_validity_months: 6,
    additional_documents: [
      'Return ticket',
      'Hotel booking',
      'Sufficient funds proof',
    ],
    special_notes: [
      'Visa not required for tourism (up to 30 days)',
      'Work visa requires separate process',
      'Travel insurance recommended',
    ],
    embassy_info: {
      address: 'House 224, Street 50, F-10/4, Islamabad',
      phone: '+92-51-2102797',
      email: 'mwislamabad@kln.gov.my',
      website: 'https://www.kln.gov.my/islamabad',
    },
  },
  GB: {
    // UK
    visa_required: true,
    beoe_registration: false,
    medical_required: false,
    medical_type: null,
    police_clearance: true,
    travel_insurance: true,
    minimum_passport_validity_months: 6,
    additional_documents: [
      'Bank statements (6 months)',
      'Employment letter',
      'Property documents',
      'Invitation letter (if visiting)',
      'Hotel booking',
      'Travel itinerary',
    ],
    special_notes: [
      'Apply through VFS Global',
      'Biometrics required',
      'Interview may be required',
      'Processing time 3-4 weeks',
    ],
    embassy_info: {
      address: 'British High Commission, Diplomatic Enclave, Islamabad',
      phone: '+92-51-2012000',
      email: 'enquiries.islamabad@fcdo.gov.uk',
      website: 'https://www.gov.uk/world/pakistan',
    },
  },
  US: {
    // USA
    visa_required: true,
    beoe_registration: false,
    medical_required: false,
    medical_type: null,
    police_clearance: true,
    travel_insurance: true,
    minimum_passport_validity_months: 6,
    additional_documents: [
      'DS-160 confirmation',
      'Bank statements',
      'Employment letter',
      'Property documents',
      'Ties to Pakistan proof',
    ],
    special_notes: [
      'Interview required at US Embassy/Consulate',
      'Long wait times for appointments',
      'Apply well in advance',
      'Visa denial common - prepare thoroughly',
    ],
    embassy_info: {
      address: 'Diplomatic Enclave, Ramna 5, Islamabad',
      phone: '+92-51-201-4000',
      email: 'support-pakistan@ustraveldocs.com',
      website: 'https://pk.usembassy.gov',
    },
  },
  CA: {
    // Canada
    visa_required: true,
    beoe_registration: false,
    medical_required: true,
    medical_type: 'Panel Physician',
    police_clearance: true,
    travel_insurance: true,
    minimum_passport_validity_months: 6,
    additional_documents: [
      'Bank statements',
      'Employment letter',
      'Property documents',
      'Invitation letter (if applicable)',
      'Travel history',
    ],
    special_notes: [
      'Apply online through IRCC',
      'Biometrics required',
      'Medical exam may be required',
      'Processing time varies',
    ],
    embassy_info: {
      address: 'High Commission of Canada, Diplomatic Enclave, G-5, Islamabad',
      phone: '+92-51-208-6000',
      email: 'isbad@international.gc.ca',
      website: 'https://www.canada.ca/pakistan',
    },
  },
};

// Country name to code mapping
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'saudi arabia': 'SA',
  'saudi': 'SA',
  'ksa': 'SA',
  'uae': 'AE',
  'united arab emirates': 'AE',
  'dubai': 'AE',
  'abu dhabi': 'AE',
  'qatar': 'QA',
  'oman': 'OM',
  'kuwait': 'KW',
  'bahrain': 'BH',
  'malaysia': 'MY',
  'uk': 'GB',
  'united kingdom': 'GB',
  'england': 'GB',
  'britain': 'GB',
  'usa': 'US',
  'united states': 'US',
  'america': 'US',
  'canada': 'CA',
  'singapore': 'SG',
  'turkey': 'TR',
  'germany': 'DE',
  'france': 'FR',
  'italy': 'IT',
  'spain': 'ES',
  'australia': 'AU',
  'new zealand': 'NZ',
  'japan': 'JP',
  'china': 'CN',
  'south korea': 'KR',
  'korea': 'KR',
};

export class CountryRequirementsService {
  private supabase = getSupabaseClient();
  private cache: Map<string, { data: RequirementDetails; timestamp: number }> = new Map();
  private cacheTTL = 3600000; // 1 hour

  /**
   * Normalize country input to country code
   */
  normalizeCountryCode(input: string): string {
    const normalized = input.toLowerCase().trim();

    // Check if already a valid code
    if (normalized.length === 2 && DEFAULT_REQUIREMENTS[normalized.toUpperCase()]) {
      return normalized.toUpperCase();
    }

    // Check name mapping
    return COUNTRY_NAME_TO_CODE[normalized] || input.toUpperCase().substring(0, 2);
  }

  /**
   * Get requirements for a country
   */
  async getRequirements(countryInput: string): Promise<RequirementDetails | null> {
    const countryCode = this.normalizeCountryCode(countryInput);

    // Check cache
    const cached = this.cache.get(countryCode);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Try database first
    try {
      const { data, error } = await this.supabase
        .from('country_requirements')
        .select('requirements')
        .eq('country_code', countryCode)
        .single();

      if (!error && data) {
        const requirements = data.requirements as RequirementDetails;
        this.cache.set(countryCode, { data: requirements, timestamp: Date.now() });
        return requirements;
      }
    } catch (err) {
      logger.warn('Database query failed, using default requirements');
    }

    // Fall back to default requirements
    const defaultReq = DEFAULT_REQUIREMENTS[countryCode];
    if (defaultReq) {
      this.cache.set(countryCode, { data: defaultReq, timestamp: Date.now() });
      return defaultReq;
    }

    // Return generic requirements for unknown countries
    return this.getGenericRequirements();
  }

  /**
   * Get all available countries
   */
  async getAllCountries(): Promise<Array<{ code: string; name: string }>> {
    const countries = [
      { code: 'SA', name: 'Saudi Arabia' },
      { code: 'AE', name: 'United Arab Emirates (UAE)' },
      { code: 'QA', name: 'Qatar' },
      { code: 'OM', name: 'Oman' },
      { code: 'KW', name: 'Kuwait' },
      { code: 'BH', name: 'Bahrain' },
      { code: 'MY', name: 'Malaysia' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'US', name: 'United States' },
      { code: 'CA', name: 'Canada' },
    ];

    return countries;
  }

  /**
   * Update country requirements
   */
  async updateRequirements(
    countryCode: string,
    requirements: RequirementDetails
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('country_requirements')
        .upsert({
          country_code: countryCode,
          requirements,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        logger.error('Failed to update country requirements:', error);
        return false;
      }

      // Clear cache
      this.cache.delete(countryCode);
      return true;
    } catch (err) {
      logger.error('Database upsert failed:', err);
      return false;
    }
  }

  /**
   * Get generic requirements for unknown countries
   */
  private getGenericRequirements(): RequirementDetails {
    return {
      visa_required: true,
      beoe_registration: false,
      medical_required: false,
      medical_type: null,
      police_clearance: false,
      travel_insurance: true,
      minimum_passport_validity_months: 6,
      additional_documents: [
        'Valid passport',
        'Visa (if required)',
        'Return ticket',
        'Hotel booking or accommodation proof',
        'Sufficient funds proof',
      ],
      special_notes: [
        'Check specific requirements with embassy',
        'Ensure passport validity of at least 6 months',
      ],
      embassy_info: null,
    };
  }
}

export const countryRequirementsService = new CountryRequirementsService();
export default countryRequirementsService;
