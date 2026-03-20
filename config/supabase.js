const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing SUPABASE_URL and one of SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in environment variables.'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
