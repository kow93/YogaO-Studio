const SUPABASE_URL = 'https://pycrqmlccjvgnfiygktm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qpYIuBzSZWlwhQcIbiF_rw_fTQq4iI1';

async function run() {
    try {
        console.log("Fetching student table to see if it works...");
        const resStudent = await fetch(`${SUPABASE_URL}/rest/v1/student?select=*&limit=5`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
        console.log("student status:", resStudent.status);
        
        console.log("Fetching membership table with range 0-999...");
        const resMembership = await fetch(`${SUPABASE_URL}/rest/v1/membership?select=*&limit=5`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Range': '0-4'
            }
        });
        console.log("membership status:", resMembership.status);
        const data = await resMembership.json();
        console.log("membership response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

run();
