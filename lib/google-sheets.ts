import { createSign } from "crypto";

const colourFills = {
  yellow: { red: 1, green: 0.92, blue: 0.45 },
  green: { red: 0.5, green: 0.85, blue: 0.55 },
  red: { red: 0.95, green: 0.45, blue: 0.45 },
};

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON.");
  const parsed = JSON.parse(raw);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON must include client_email and private_key.");
  }
  return parsed as { client_email: string; private_key: string };
}

async function getAccessToken() {
  const serviceAccount = parseServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = base64Url(signer.sign(serviceAccount.private_key));
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error("Google authentication failed.");
  }

  const payload = await response.json();
  return payload.access_token as string;
}

function parseRow(sheetRowId: string) {
  const match = sheetRowId.match(/\d+/);
  if (!match) throw new Error("Sheet row id must include a row number, for example row_12.");
  return Number(match[0]);
}

function columnToIndex(column: string) {
  return column
    .toUpperCase()
    .split("")
    .reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function fieldColumn(fieldChanged: string) {
  const envMap = process.env.SHEET_FIELD_COLUMN_MAP
    ? JSON.parse(process.env.SHEET_FIELD_COLUMN_MAP)
    : {};
  const defaults: Record<string, string> = {
    session: "C",
    session_time: "C",
    dietary_requirement: "D",
    table_number: "E",
    registration_status: "F",
    registration_change: "C",
  };
  return String(envMap[fieldChanged] || defaults[fieldChanged] || process.env.SHEET_DEFAULT_UPDATE_COLUMN || "C");
}

export async function updateSheetCell({
  sheetRowId,
  fieldChanged,
  newValue,
  colour,
}: {
  sheetRowId: string;
  fieldChanged: string;
  newValue: string;
  colour: "yellow" | "green" | "red";
}) {
  const sheetId = process.env.SHEET_ID;
  if (!sheetId) throw new Error("Missing SHEET_ID.");

  const row = parseRow(sheetRowId);
  const column = fieldColumn(fieldChanged);
  const sheetName = process.env.SHEET_TAB_NAME || "Sheet1";
  const accessToken = await getAccessToken();
  const range = `${sheetName}!${column}${row}`;
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const valueResponse = await fetch(updateUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [[newValue]] }),
  });

  if (!valueResponse.ok) {
    throw new Error("Google Sheets value update failed.");
  }

  const color = colourFills[colour];
  const formatResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: Number(process.env.SHEET_GID || 0),
                startRowIndex: row - 1,
                endRowIndex: row,
                startColumnIndex: columnToIndex(column),
                endColumnIndex: columnToIndex(column) + 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: color,
                },
              },
              fields: "userEnteredFormat.backgroundColor",
            },
          },
        ],
      }),
    },
  );

  if (!formatResponse.ok) {
    throw new Error("Google Sheets colour update failed.");
  }

  return { range, colour };
}
