// apiClient.js
import axios from "axios";
import dotenv from "dotenv";
import connectivity from "@sap-cloud-sdk/connectivity";

dotenv.config();

/**
 * CONFIGURATION
 * --------------
 * Define the API base URL and auth settings in your .env file:
 *
 * API_BASE_URL=https://api.example.com
 * AUTH_URL=https://auth.example.com/oauth/token
 * CLIENT_ID=your-client-id
 * CLIENT_SECRET=your-client-secret
 * SCOPE=your-scope
 */
const API_BASE_URL = process.env.API_BASE_URL;
const AUTH_URL = process.env.AUTH_URL;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const SCOPE = process.env.SCOPE;



let accessToken = null;
let tokenExpiry = null;
let dest = null;

/**
 * Get or refresh access token
 */
async function getAccessToken(destination) {
  const now = Date.now();
  dest = await connectivity.getDestination({destinationName: destination });
  // If valid token exists, reuse it
  if (dest.authTokens[0].value && dest.authTokens[0].expiresIn && now < dest.authTokens[0].expiresIn) {
    return accessToken;
  }

  console.log("🔐 Fetching new access token...");

  const response = await axios.post(
    dest.tokenServiceUrl,
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: dest.clientId,
      client_secret: dest.clientSecret,
      //scope: SCOPE,
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  accessToken = response.data.access_token;
  const expiresIn = response.data.expires_in || 3600; // seconds
  tokenExpiry = now + expiresIn * 1000;

  console.log("✅ Access token acquired.");
  return accessToken;
}

/**
 * Generic API call function
 */
export async function apiRequest(destination, method, endpoint, data = null, params = null, apikey) {
  const token = await getAccessToken(destination);

  const config = {
    method,
    url: `${dest.url}${endpoint}`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "*/*",
      apiKey : apikey
    },
    data,
    params,
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error("❌ API request failed:", error.response?.data || error.message);
    throw error;
  }
}
