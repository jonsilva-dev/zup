const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.rpc('query_something'); // we can't do this easily.
    // let's try to update a dummy row or fetch a random row and try to update it to 10.
    const { data: clients, error: fetchError } = await supabase.from('clients').select('id, due_day').limit(1);
    if (fetchError) {
        console.error(fetchError);
        return;
    }
    if (clients.length > 0) {
        const clientId = clients[0].id;
        console.log("Current due_day:", clients[0].due_day);

        // try to update to 10
        const { data: updateData, error: updateError } = await supabase.from('clients').update({ due_day: '10' }).eq('id', clientId).select();

        if (updateError) {
            console.error("Update to 10 failed:", updateError);
        } else {
            console.log("Update to 10 success:", updateData[0].due_day);
        }
    }
}
check();
