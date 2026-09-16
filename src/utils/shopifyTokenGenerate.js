require('dotenv').config();

async function getAccessToken() {
  const client_id = process.env.CLIENT_ID;
  const client_secret = process.env.CLIENT_SECRET;

  const response = await fetch('https://qurvii-india.myshopify.com/admin/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id,
      client_secret,
    }),
  });

  const data = await response.json();

  return data.access_token;
}

module.exports = getAccessToken;
