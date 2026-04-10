import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ndkbjmgronaabqsqgdlv.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ka2JqbWdyb25hYWJxc3FnZGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTA4MjcsImV4cCI6MjA5MTA4NjgyN30.DkT-jnVGj7u3mhwAq8ioFe5FoJgH9sb8SKzhHH_N-XI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
