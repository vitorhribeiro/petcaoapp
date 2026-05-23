const fs = require('fs');

async function main() {
  try {
    const envStr = fs.readFileSync('.env', 'utf-8');
    const matchUrl = envStr.match(/VITE_SUPABASE_URL=(.*)/);
    const matchKey = envStr.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.*)/);

    const url = matchUrl ? matchUrl[1].trim().replace(/['"]/g, '') : null;
    const key = matchKey ? matchKey[1].trim().replace(/['"]/g, '') : null;

    if (!url || !key) {
      console.error("Missing credentials");
      process.exit(1);
    }

    const shopId = '3a4467d3-6fb3-4f93-b673-9a3d4f826354';

    const res = await fetch(`${url}/rest/v1/gallery_categories`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        petshop_id: shopId,
        name: 'Copa',
        slug: 'copa',
        max_photos: 100,
        sort_order: 10,
        is_active: true
      })
    });
    
    const text = await res.text();
    console.log('Result:', text);
  } catch (err) {
    console.error(err);
  }
}
main();
