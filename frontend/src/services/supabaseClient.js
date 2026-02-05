import { createClient } from '@supabase/supabase-js';

// Replace with the values from Step 1.3
const supabaseUrl = 'https://wdqkqqmvxgerlespfdes.supabase.co';
const supabaseAnonKey = 'sb_publishable_R1J6gsEw-Os7lf1Ny1Rc9w_-T0aPAPk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);