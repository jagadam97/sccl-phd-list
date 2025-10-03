import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iibpacktvpgojznofmrj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpYnBhY2t0dnBnb2p6bm9mbXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMzg2OTIsImV4cCI6MjA3NDgxNDY5Mn0.7HthPSciqNer_Wc2NBF3RvFC3jNBn1m8NuaN7P6KMsU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
