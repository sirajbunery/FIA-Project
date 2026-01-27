import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './index';
import { logger } from '../utils/logger';

let supabase: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabase) {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      logger.warn('Supabase credentials not configured. Database features will be unavailable.');
      // Return a mock client for development without Supabase
      return createClient('https://placeholder.supabase.co', 'placeholder-key');
    }
    supabase = createClient(config.supabaseUrl, config.supabaseServiceKey || config.supabaseAnonKey);
  }
  return supabase;
};

export const getSupabaseAdmin = (): SupabaseClient => {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    logger.warn('Supabase service key not configured.');
    return getSupabaseClient();
  }
  return createClient(config.supabaseUrl, config.supabaseServiceKey);
};

export default getSupabaseClient;
