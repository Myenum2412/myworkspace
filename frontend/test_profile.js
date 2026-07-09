const { MongoClient } = require('mongodb');
const http = require('http');

async function run() {
  const fetch = (await import('node-fetch')).default;
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  
  // Find myenumam@gmail.com session
  const session = await db.collection('sessions').findOne({});
  const sessionToken = session ? session.sessionToken : 'mock';

  console.log('Using session token:', sessionToken);

  const res = await fetch('http://localhost:3000/api/user/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `next-auth.session-token=${sessionToken}`
    },
    body: JSON.stringify({
      companyEmail: "test2@example.com"
    })
  });

  console.log(res.status);
  console.log(await res.text());
  await client.close();
}
run().catch(console.error);
