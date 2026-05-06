// After items are checked in, automatically remove certain disabled statuses
// from them so that they can be checked out again. Specifically, if an item
// was marked as lost or given away, but it comes back to us, then we know that
// it is still in our possession.
//
// This automation doesn't make sense to do on items that were just checked
// out, since MyTurn blocks disabled items from being checked out until those
// statuses are removed/fixed.

if (
  window.location.pathname ===
    "/library/orgMyOrganization/moneyTransactionDetails" &&
  window.location.search.includes("tx.id=")
) {
  document.addEventListener("DOMContentLoaded", function () {
    // Start by finding the links to the checked-in items
    const transactionSummary = document.querySelector("div#tx-summary");
    if (!transactionSummary) {
      console.error("Could not find transaction summary");
      return;
    }

    const transactionSectionHeaders = transactionSummary.querySelectorAll(
      "div.tx-section-header",
    );
    if (transactionSectionHeaders.length === 0) {
      console.error("Could not find transaction section headers");
      return;
    } else if (transactionSectionHeaders.length > 2) {
      console.error("Found too many transaction section headers");
      return;
    }

    const checkedInHeader = Array.from(transactionSectionHeaders).find(
      (header) => header.textContent.trim().startsWith("Checked In"),
    );
    if (!checkedInHeader) {
      console.info(
        'Did not find the "Checked In" section header. This is expected if the user was not checking in items.',
      );
      return;
    }

    const checkedInLinks =
      checkedInHeader.nextElementSibling?.querySelectorAll("a.hidden-print");
    if (!checkedInLinks) {
      console.error("Could not find checked in item links");
      return;
    }

    Array.from(checkedInLinks).forEach((a) => {
      const myTurnInternalId = a.getAttribute("data-item-id");
      const itemId = a.getAttribute("data-item-internal-id");
      if (!myTurnInternalId || !itemId) {
        console.error("Could not find item ID for checked in item");
        return;
      }

      // Get the item's current statuses, and additional metadata
      fetch(`/library/orgInventory/edit/${myTurnInternalId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(
              `HTTP error ${String(res.status)} when attempting to fetch the edit page for the checked-in item ${itemId}`,
            );
          }
          return res;
        })
        .then((res) => res.text())
        .then((resText) => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(resText, "text/html");

          // Version is used by MyTurn to avoid editing conflicts (ie, race
          // conditions), and is required when `POST`ing item updates.
          const version = doc
            .querySelector('input[name="version"]')
            ?.getAttribute("value");
          if (!version) {
            console.error(`Could not find version for item ${itemId}`);
            return;
          }

          const itemName = doc
            .querySelector('input[name="attribute_name"]')
            ?.getAttribute("value");
          if (!itemName) {
            console.error(`Could not find name for item ${itemId}`);
            return;
          }

          const checkedStatusCheckboxes = doc.querySelectorAll(
            'input[name="statuses"]:checked',
          );
          const currentStatuses = Array.from(checkedStatusCheckboxes)
            .map((checkbox) => checkbox.getAttribute("value"))
            .filter((i) => i) as string[];

          // It is very likely that these codes are specific to the Capitol
          // Hill Tool Library's instance of MyTurn
          const statusesToRemove: Record<string, string> = {
            "7934": "Given Away",
            "7007": "Lost By Member",
            "7133": "Lost In Shop",
          };

          // Update the item's statuses to mark it as available for checkout
          const statusesWithoutDisabled = currentStatuses.filter(
            (status) => !Object.keys(statusesToRemove).includes(status),
          );
          if (statusesWithoutDisabled.length === currentStatuses.length) {
            console.debug(
              `The checked-in ${itemName} (${itemId}) does not have any disabled statuses, so it doesn't need to be updated`,
            );
            return;
          }

          const formData = new FormData();
          formData.append("id", myTurnInternalId);
          formData.append("internalId", itemId);
          formData.append("version", version);
          if (statusesWithoutDisabled.length > 0) {
            statusesWithoutDisabled.forEach((status) => {
              formData.append("statuses", status);
            });
          } else {
            formData.append("statuses", "");
          }
          // Make the page think that this is a normal browser form render and submission
          formData.append("jsok", "true");

          fetch(`/library/orgInventory/update`, {
            method: "POST",
            // Interestingly (and conveniently), if a field _isn't_ in the
            // multipart form data then MyTurn doesn't clear/alter that field
            // at all
            body: formData,
          })
            .then((res) => {
              if (!res.ok) {
                throw new Error(
                  `HTTP error ${String(res.status)} when attempting to update the checked-in ${itemName} (${itemId})`,
                );
              }
              return res;
            })
            .then((res) => res.text())
            .then((resText) => {
              // Need to use the response text (rather than HTTP status code)
              // to determine whether or not the edit operation was accepted
              // by MyTurn
              const parser = new DOMParser();
              const doc = parser.parseFromString(resText, "text/html");
              const wasSuccessful = Boolean(
                // Will be whitespace if there is no success message
                doc.querySelector("div.alert-success")?.textContent.trim(),
              );

              if (wasSuccessful) {
                console.info(
                  `Updated the checked-in ${itemName} (${itemId}) to remove disabled status(es): ${currentStatuses
                    .filter((status) =>
                      Object.keys(statusesToRemove).includes(status),
                    )
                    .map((statusCode) => statusesToRemove[statusCode])
                    .join(", ")}`,
                );
              } else {
                console.error(
                  `Failed to update the checked-in ${itemName} (${itemId}) to remove disabled status(es). This MyTurn plugin's functionality may need to be fixed/updated; edit the file here: https://github.com/Sustainable-Capitol-Hill/myturn-hacks/blob/main/src/admin-footer/money-transaction-details-reenable-checked-in-items.ts`,
                );
              }
            })
            .catch((err: unknown) => {
              console.error(
                `Error updating the checked-in ${itemName} (${itemId}) to remove disabled status(es): ${String(err)}`,
              );
            });
        })
        .catch((err: unknown) => {
          console.error(
            `Error fetching the edit page for the checked-in item ${itemId}: ${String(err)}`,
          );
        });
    });
  });
}
