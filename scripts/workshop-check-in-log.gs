// Reminder: to deploy updates from the Apps Script GUI, use this
// `Deploy` -> `Manage deployments` flow; otherwise, the endpoint URL
// will change:
// https://developers.google.com/apps-script/concepts/deployments#edit-versioned

// This Google Apps Script accepts POST requests about workshop check-ins
// from the following MyTurn Hacks scripts, and logs the check-in into Google Sheets:
// - https://github.com/Sustainable-Capitol-Hill/myturn-hacks/blob/main/src/admin-footer/search-users-shop-check-in-button.ts
// - https://github.com/Sustainable-Capitol-Hill/myturn-hacks/blob/main/src/admin-footer/user-details-shop-check-in-button.ts

function doPost(e) {
  const postData = JSON.parse(e?.postData?.contents) ?? {};

  const dateString = new Date().toLocaleString("en-US", {
    // Since we typically refer to shifts based on their day of the week, this is useful information
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    timeZoneName: "short",
  });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rawHashedUsername = String(postData.hashedUsername || "");
  const safeHashedUsername = /^[0-9a-f]+$/i.test(rawHashedUsername)
    ? rawHashedUsername
    : "'" + rawHashedUsername;
  sheet.appendRow([safeHashedUsername, dateString]);

  return ContentService.createTextOutput(
    JSON.stringify({ dateString }),
  ).setMimeType(ContentService.MimeType.JSON);
}
