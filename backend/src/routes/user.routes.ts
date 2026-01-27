import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from '../config/supabase';
import { validationService } from '../services/validation.service';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { User } from '../models/types';

const router = Router();
const supabase = getSupabaseClient();

/**
 * POST /api/user/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone_number, name } = req.body;

    if (!phone_number) {
      throw createError('Phone number is required', 400);
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phone_number)
      .single();

    if (existingUser) {
      res.json({
        success: true,
        message: 'User already registered',
        user: existingUser,
      });
      return;
    }

    // Create new user
    const newUser: User = {
      id: uuidv4(),
      phone_number,
      name: name || null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('users').insert(newUser);

    if (error) {
      logger.error('Failed to create user:', error);
      throw createError('Failed to register user', 500);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/user/:phoneNumber
 * Get user by phone number
 */
router.get('/:phoneNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phoneNumber } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (error || !user) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/user/history/:userId
 * Get user's validation history
 */
router.get('/history/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const history = await validationService.getUserHistory(userId, limit);

    res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/user/:userId
 * Update user details
 */
router.put('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { name } = req.body;

    const { error } = await supabase
      .from('users')
      .update({ name })
      .eq('id', userId);

    if (error) {
      throw createError('Failed to update user', 500);
    }

    res.json({
      success: true,
      message: 'User updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
