import { Router, Request, Response, NextFunction } from 'express';
import { countryRequirementsService } from '../services/countryRequirements.service';
import { createError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/requirements
 * Get list of all supported countries
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const countries = await countryRequirementsService.getAllCountries();

    res.json({
      success: true,
      count: countries.length,
      countries,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/requirements/:country
 * Get requirements for a specific country
 */
router.get('/:country', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { country } = req.params;

    const countryCode = countryRequirementsService.normalizeCountryCode(country);
    const requirements = await countryRequirementsService.getRequirements(country);

    if (!requirements) {
      throw createError(`Requirements not found for country: ${country}`, 404);
    }

    res.json({
      success: true,
      country_code: countryCode,
      country_input: country,
      requirements,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/requirements/:country
 * Update requirements for a country (admin only - add auth middleware in production)
 */
router.post('/:country', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { country } = req.params;
    const requirements = req.body;

    if (!requirements) {
      throw createError('Requirements data is required', 400);
    }

    const countryCode = countryRequirementsService.normalizeCountryCode(country);
    const success = await countryRequirementsService.updateRequirements(countryCode, requirements);

    if (!success) {
      throw createError('Failed to update requirements', 500);
    }

    res.json({
      success: true,
      message: `Requirements updated for ${countryCode}`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/requirements/:country/checklist
 * Get a simple checklist for a country
 */
router.get('/:country/checklist', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { country } = req.params;

    const requirements = await countryRequirementsService.getRequirements(country);

    if (!requirements) {
      throw createError(`Requirements not found for country: ${country}`, 404);
    }

    // Build checklist
    const checklist = [
      {
        item: 'Valid Passport',
        required: true,
        note: `Must be valid for at least ${requirements.minimum_passport_validity_months} months from travel date`,
        urdu: 'پاسپورٹ کم از کم 6 ماہ کے لیے درست ہونا چاہیے',
      },
    ];

    if (requirements.visa_required) {
      checklist.push({
        item: 'Visa',
        required: true,
        note: 'Valid visa for your travel purpose',
        urdu: 'درست ویزا',
      });
    }

    if (requirements.beoe_registration) {
      checklist.push({
        item: 'BEOE Registration',
        required: true,
        note: 'Bureau of Emigration registration for work travel',
        urdu: 'بیورو آف ایمیگریشن رجسٹریشن',
      });
    }

    if (requirements.medical_required) {
      checklist.push({
        item: `${requirements.medical_type || 'Medical'} Certificate`,
        required: true,
        note: `${requirements.medical_type || 'Medical'} medical fitness certificate`,
        urdu: 'میڈیکل سرٹیفکیٹ',
      });
    }

    if (requirements.police_clearance) {
      checklist.push({
        item: 'Police Clearance Certificate',
        required: true,
        note: 'Character certificate from police',
        urdu: 'پولیس کلیئرنس سرٹیفکیٹ',
      });
    }

    checklist.push({
      item: 'Airline Ticket',
      required: true,
      note: 'Confirmed flight booking',
      urdu: 'ہوائی ٹکٹ',
    });

    if (requirements.travel_insurance) {
      checklist.push({
        item: 'Travel Insurance',
        required: requirements.visa_required,
        note: 'Valid travel insurance policy',
        urdu: 'ٹریول انشورنس',
      });
    }

    // Add additional documents
    requirements.additional_documents.forEach(doc => {
      checklist.push({
        item: doc,
        required: false,
        note: 'May be required depending on visa type',
        urdu: '',
      });
    });

    res.json({
      success: true,
      country: country,
      checklist,
      special_notes: requirements.special_notes,
      embassy_info: requirements.embassy_info,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
