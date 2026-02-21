const readline = require("readline");
const axios = require("axios");
const qs = require("querystring");
require("dotenv").config();

function b64() {
  return Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString("base64");
}

async function doAuth(code) {
  const tokenURL = "https://zoom.us/oauth/token";
  const redirect_uri = process.env.ZOOM_REDIRECT_URL;

  const data = qs.stringify({
    grant_type: "client_credentials",
    code: code.trim(),   
    redirect_uri,
  });

  const resp = await axios.post(tokenURL, data, {
    headers: {
      Authorization: `Basic ${b64()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  console.log("✅ Access token:", resp.data.access_token);
  console.log("🔄 Refresh token:", resp.data.refresh_token);
}

(async () => {
  let code = process.argv[3];
  if (!code) {
     
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    code = await new Promise((resolve) =>
      rl.question("OAuth code'unuzu girin: ", (ans) => {
        rl.close();
        resolve(ans);
      })
    );
  }
  await doAuth(code);
})();









