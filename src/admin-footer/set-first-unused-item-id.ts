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
            `regex.exec returned a null string. Line=${rawItemId}, line number=${i.toString()}`,
          );
        }
        const itemId = parseInt(idWithQuotesStripped);
        ids.push(itemId);
      }

      if (ids.length == 0) {
        throw new Error("No properly formatted item IDs found.");
      }

      ids.sort((num1, num2) => num1 - num2);

      let previousId = 0;
      for (let i = 1; i < ids.length; i++) {
        const currentId = ids[i];
        if (!currentId) {
          throw new Error(
            `Encountered a null id number in the list. index=${i.toString()}`,
          );
        }
        if (currentId - previousId > 1 && currentId > minimumIdNumber) {
          return Math.max(previousId + 1, minimumIdNumber);
        }

        previousId = currentId;
      }

      return previousId + 1;
    });
}

function populateItemIdField(itemIdField: HTMLInputElement) {
  itemIdField.disabled = true;
  itemIdField.placeholder = "Searching for first available ID...";

  getFirstAvailableId()
    .then((firstAvailableId) => {
      itemIdField.value = firstAvailableId.toString();
    })
    .catch((error: unknown) => {
      console.error(
        "An error ocurred searching for unavailable item IDs",
        error,
      );
    })
    .finally(() => {
      itemIdField.placeholder = "";
      itemIdField.disabled = false;
      itemIdField.dispatchEvent(new KeyboardEvent("keyup"));
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

    const idFormGroup = itemIdField.closest(".form-group");
    const helpBlock = idFormGroup?.querySelector(".help-block");

    if (helpBlock) {
      helpBlock.innerHTML =
        "ID is populated automatically based on unused IDs in our system.";
    }

    populateItemIdField(itemIdField);

    if (!idFormGroup) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (idFormGroup.querySelector("div#internal-id-error")) {
        populateItemIdField(itemIdField);
      }
    });
    observer.observe(idFormGroup, {
      subtree: true,
      childList: true,
      attributeFilter: [],
    });
  });
}
