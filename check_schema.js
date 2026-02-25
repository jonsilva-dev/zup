const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    // We can try to fetch a single row and look at the keys to infer columns
    const { data, error } = await supabase.from('clients').select('*').limit(1);
    if (error) {
        console.error("Error fetching clients:", error);
    } else if (data && data.length > 0) {
        console.log("Columns in 'clients' table (first row keys):", Object.keys(data[0]));
    } else {
        console.log("No clients found, cannot infer schema from data.");
    }
}

checkSchema();
