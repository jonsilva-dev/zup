const { updateClientAction } = require('./src/app/(dashboard)/pessoas/cliente/[id]/actions.ts');
// Actually since it's a Server Action, we can't easily require it outside Next.js environment.

// Let's create a client in the DB to represent what the user is doing.
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: clients, error } = await supabase.from('clients').select('*').limit(1);
    if (!clients || clients.length === 0) return console.log("No clients.");
    const client = clients[0];
    console.log("Client ID:", client.id, "due_day:", client.due_day);

    // What if we do exactly what the server action does?
    const payload = {
        due_day: 10,
    };

    const { data: res, error: err } = await supabase.from('clients').update(payload).eq('id', client.id).select();
    console.log("Update to 10 result:", { res, err });
}
check();
