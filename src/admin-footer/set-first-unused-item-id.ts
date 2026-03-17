/**
 * Automatically populate the item ID field in the create new item and copy&edit item pages.
 * Finds the first unused item ID with at least 3 digits and uses it.
 *
 * Author: Spencer Rawls
 */

function getFirstAvailableId(): Promise<number> {
  const minimumIdNumber = 100;
  const formData = new FormData();
  formData.append("format", "csv");
  formData.append("_exportItemType", "false");

  return fetch("/library/orgInventory/report", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `report resulted in an error: ${response.status.toString()} ${response.statusText}`,
        );
      }
      return response.text();
    })
    .then((body) => {
      const lines = body.split(/\r?\n/);
      if (lines[lines.length - 1] === "") {
        lines.pop();
      }
      const ids = [];

      const stripQuotesRegex = /"?([0-9]+)"?/;
      // First line is the column header, so start at 1 instead of 0.
      for (let i = 1; i < lines.length; i++) {
        const rawItemId = lines[i];
        if (!rawItemId) {
          throw new Error(`Line number ${i.toString()} is somehow null`);
        }

        const match = stripQuotesRegex.exec(rawItemId);
        // We expect an array length of 2 from this match.
        // 0 is the number with quotes, 1 is the number without quotes.
        if (match?.length !== 2) {
          throw new Error(
            `Found an unexpected line: ${rawItemId}, line number = ${i.toString()}`,
          );
        }
        const idWithQuotesStripped = match[1];
        if (!idWithQuotesStripped) {
          throw new Error(
            `This should not have been possible, but regex.exec returned a null string. Line=${rawItemId}, line number=${i.toString()}`,
          );
        }
        const itemId = parseInt(idWithQuotesStripped);
        ids.push(itemId);
      }

      if (ids.length == 0) {
        return 0;
      }

      ids.sort((num1, num2) => num1 - num2);

      let previousId = 0;
      for (let i = 1; i < ids.length; i++) {
        const currentId = ids[i];
        if (!currentId) {
          throw new Error(
            `This should not have been possible, but there is a null id number in the list. index=${i}`,
          );
        }
        if (currentId - previousId > 1 && currentId > minimumIdNumber) {
          return Math.max(previousId + 1, minimumIdNumber);
        }

        previousId = currentId;
      }

      return previousId + 1;
    })
    .catch((error: unknown) => {
      console.error("Error occurred searching for first available ID:", error);
      return 0;
    });
}

if (
  window.location.pathname === "/library/orgInventory/create" ||
  window.location.pathname.startsWith("/library/orgInventory/copy/")
) {
  document.addEventListener("DOMContentLoaded", function () {
    const itemIdField = document.getElementById(
      "internal-id",
    ) as HTMLInputElement | null;
    if (!itemIdField) {
      return;
    }
    itemIdField.disabled = true;

    const helpBlocks = document.querySelectorAll("p.help-block");
    helpBlocks.forEach((helpText) => {
      if (
        helpText.innerHTML === "ID will be assigned automatically if left blank"
      ) {
        helpText.innerHTML =
          "ID is populated automatically based on unused IDs in our system";
      }
    });

    getFirstAvailableId()
      .then((firstAvailableId) => {
        itemIdField.disabled = false;
        if (firstAvailableId > 0) {
          itemIdField.value = firstAvailableId.toString();
        }
      })
      .catch((error: unknown) => {
        console.error(
          "This should not have been possible, but there was an error trying to populate the item ID field",
          error,
        );
      });
  });
}
