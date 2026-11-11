// Writes the Google Sign-In callback URL scheme into ios/App/App/Info.plist.
// Reads VITE_GOOGLE_IOS_CLIENT_ID from the environment or .env.production.
// Safe to run many times. Usage: node scripts/configure-ios.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";

let clientId = process.env.VITE_GOOGLE_IOS_CLIENT_ID || "";
if (!clientId && existsSync(".env.production")) {
  const match = /^VITE_GOOGLE_IOS_CLIENT_ID=(.*)$/m.exec(readFileSync(".env.production", "utf8"));
  clientId = match ? match[1].trim() : "";
}
const plistPath = "ios/App/App/Info.plist";
let plist = readFileSync(plistPath, "utf8");
plist = plist.replace(/\n\t<key>CFBundleURLTypes<\/key>\n\t<array>[\s\S]*?<!-- google-signin -->[\s\S]*?\n\t<\/array>/, "");
if (!clientId) {
  writeFileSync(plistPath, plist);
  console.log("iOS: VITE_GOOGLE_IOS_CLIENT_ID not set → Google button hidden on iPhone (Apple sign-in still works).");
  process.exit(0);
}
const reversed = clientId.split(".").reverse().join(".");
const block = `
\t<key>CFBundleURLTypes</key>
\t<array>
\t\t<dict>
\t\t\t<!-- google-signin -->
\t\t\t<key>CFBundleURLSchemes</key>
\t\t\t<array>
\t\t\t\t<string>${reversed}</string>
\t\t\t</array>
\t\t</dict>
\t</array>`;
plist = plist.replace(/\n<\/dict>\n<\/plist>\s*$/, `${block}\n</dict>\n</plist>\n`);
writeFileSync(plistPath, plist);
console.log(`iOS: Google Sign-In URL scheme set to ${reversed}`);
