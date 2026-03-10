function getFirstAvailableId(): Promise<number> {
  const minimumIdNumber = 100;
  const formData = new FormData();
  formData.append("_exportItemType", "true");
  formData.append("format", "csv");

  return fetch("/library/orgInventory/report", {
    method: "POST",
    redirect: "follow",
    body: formData,
  })
    .then((response) => response.text())
    .then((body) => {
      const lines = body.split(/\r?\n/);
      const ids = [];

      // First line is the column header, so start at 1 instead of 0.
      for (let i = 1; i < lines.length; i++) {
        const rawItemId = lines[i]!;
        // All of the IDs come wrapped in quotes, so if there is a number in there, length will be greater than 2.
        if (rawItemId == null || rawItemId!.length <= 2) {
          continue;
        }

        const idWithQuotesStripped = rawItemId.substring(
          1,
          rawItemId.length - 1,
        );
        const itemId = parseInt(idWithQuotesStripped);
        ids.push(itemId);
      }

      if (ids.length == 0) {
        return 0;
      }

      ids.sort((num1, num2) => num1 - num2);

      let previousId = 0;
      for (let i = 1; i < ids.length; i++) {
        const currentId = ids[i]!;
        if (currentId - previousId > 1 && currentId > minimumIdNumber) {
          return Math.max(previousId + 1, minimumIdNumber);
        }

        previousId = currentId;
      }

      return previousId + 1;
    });
}

if (
  window.location.pathname === "/library/orgInventory/create" ||
  window.location.pathname.startsWith("/library/orgInventory/copy/")
) {
  document.addEventListener("DOMContentLoaded", function () {
    const itemIdField = document.querySelector("#internal-id");
    getFirstAvailableId().then((firstAvailableId) => {
      if (firstAvailableId > 0) {
        itemIdField?.setAttribute("value", firstAvailableId.toString());
      }
    });
  });
}
