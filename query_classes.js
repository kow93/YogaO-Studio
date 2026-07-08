const SUPABASE_URL = 'https://pycrqmlccjvgnfiygktm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qpYIuBzSZWlwhQcIbiF_rw_fTQq4iI1';

async function run() {
    try {
        console.log("Fetching classes...");
        const classesRes = await fetch(`${SUPABASE_URL}/rest/v1/classes`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const classes = await classesRes.json();
        console.log("Classes details:", JSON.stringify(classes, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
