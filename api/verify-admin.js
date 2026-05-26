// Vercel Serverless Function to verify admin passcode
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle options preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const { password } = req.body || {};
    const correctPass = process.env.VITE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "crackadmin";
    const enteredPass = (password || "").trim();
    
    // Case-insensitive compliance matching the front-end/back-end fallbacks
    const isValid = enteredPass === correctPass || enteredPass.toLowerCase() === correctPass.toLowerCase();
    
    return res.status(200).json({ valid: isValid });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
