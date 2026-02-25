const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('clients').select('id').limit(1);
    if (data && data.length > 0) {
        const res = await supabase.from('clients').update({ due_day: 10 }).eq('id', data[0].id);
        console.log("Update to 10:", res.error || "success");
        const res2 = await supabase.from('clients').update({ due_day: '10' }).eq('id', data[0].id);
        console.log("Update to '10':", res2.error || "success");
    } else {
        console.log("no clients");
    }
}
check();
