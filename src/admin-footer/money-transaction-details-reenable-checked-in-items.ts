// After items are checked in, automatically remove certain disabled statuses
// from them so that they can be checked out again. Specifically, if an item
// was marked as lost or given away, but it comes back to us, then we know that
// it is still in our possession.
//
// This automation doesn't make sense to do on items that were just checked
// out, since MyTurn blocks disabled items from being checked out until those
// statuses are removed/fixed.

import pLimit from "p-limit";

interface UserDetails {
  note: string;
  warning: string;
  hasExtremelyOverdueMembership: boolean;
}

interface ItemIds {
  myTurnInternalId: string;
  itemId: string;
}

interface ItemDetails extends ItemIds {
  name: string;
  version: string;
  // Numeric IDs, not human-readable descriptions
  statuses: (keyof typeof statuses)[];
}

// It is very likely that these codes are specific to the Capitol
// Hill Tool Library's instance of MyTurn
const statuses = {
  "140": "Disabled",
  "7934": "Given Away",
  "141": "In Maintenance",
  "7007": "Lost By Member",
  "7133": "Lost In Shop",
  "7134": "Not Fixable",
  "5460": "Overflow",
  "2598": "Shop Use Only",
  "145": "Wish List",
} as const;
const statusCodesToStrip = [
  "7934",
  "7007",
  "7133",
] as (keyof typeof statuses)[];
const lostByMemberStatusCode: keyof typeof statuses = "7007";

if (
  window.location.pathname ===
    "/library/orgMyOrganization/moneyTransactionDetails" &&
  window.location.search.includes("tx.id=")
) {
  document.addEventListener("DOMContentLoaded", function () {
    // ESLint disapproves of JavaScript events getting async functions, so
    // we need a wrapper around our main, promise-based functionality
    void reenableCheckedInItems();
  });
}

const reenableCheckedInItems = async (): Promise<void> => {
  // Limit the number of simultaneous HTTP requests to MyTurn's server to 1,
  // to avoid frustrating them
  const limit = pLimit(1);

  const checkedInHeader = getCheckedInSectionHeader();
  if (!checkedInHeader) {
    return;
  }

  const progressText = document.createElement("a");
  progressText.href =
    "https://github.com/Sustainable-Capitol-Hill/myturn-hacks/pull/18";
  progressText.target = "_blank";
  const progressDots = createProgressDots();

  const handledByElement =
    document.querySelector<HTMLParagraphElement>("p.handled-by");
  // No need to error if this progress indicator text doesn't get shown; the
  // functionality is still running regardless
  if (!handledByElement) {
    console.error("Could not find container for user-facing progress text");
  }
  handledByElement?.appendChild(document.createTextNode(". "));
  handledByElement?.appendChild(progressText);

  const checkedInAnchorElements = getCheckedInAnchorElements(checkedInHeader);
  if (!checkedInAnchorElements || checkedInAnchorElements.length === 0) {
    return;
  }

  progressText.textContent = 'Removing any "lost" statuses on check-ins';
  handledByElement?.appendChild(progressDots);

  // It's alright if this fails, since it's for nice-to-have functionality
  let userDetails: UserDetails | undefined = undefined;
  try {
    userDetails = await getUserDetails();
  } catch (err: unknown) {
    console.warn(`Error fetching user details: ${String(err)}`);
  }

  const items = await limit.map(checkedInAnchorElements, async (a) => {
    const myTurnInternalId = a.getAttribute("data-item-id");
    const itemId = a.getAttribute("data-item-internal-id");
    if (!myTurnInternalId || !itemId) {
      console.error("Could not find item ID for checked in item");
      return;
    }

    let itemDetails: ItemDetails | undefined = undefined;
    try {
      itemDetails = await getItemDetails({ myTurnInternalId, itemId });
    } catch (err: unknown) {
      console.error(
        `Error fetching item details for checked-in item ${itemId}: ${String(err)}`,
      );
      return;
    }

    return itemDetails;
  });

  await limit.map(
    items.filter((i) => typeof i !== "undefined"),
    async (itemDetails) => {
      const updatedStatuses = itemDetails.statuses.filter(
        (status) => !statusCodesToStrip.includes(status),
      );
      if (updatedStatuses.length === itemDetails.statuses.length) {
        console.debug(
          `The checked-in ${itemDetails.name} (${itemDetails.itemId}) does not have any statuses that need to be stripped`,
        );
        return;
      }

      const formData = buildFormDataForItemUpdate(itemDetails, updatedStatuses);
      try {
        await updateCheckedInItem(itemDetails, formData);
      } catch (err: unknown) {
        console.error(
          `Error updating the checked-in ${itemDetails.name} (${itemDetails.itemId}) to remove disabled status(es): ${String(err)}`,
        );
        return;
      }
      console.info(
        `Updated the checked-in ${itemDetails.name} (${itemDetails.itemId}) to remove disabled status(es): ${itemDetails.statuses
          .filter((status) => statusCodesToStrip.includes(status))
          .map((statusCode) => `\`${statuses[statusCode]}\``)
          .join(", ")}`,
      );
    },
  );

  progressText.textContent = "";
  handledByElement?.removeChild(progressDots);

  const someItemsWereLostByMember = items
    .filter((i) => typeof i !== "undefined")
    .some((i) => i.statuses.includes(lostByMemberStatusCode));
  const userMayNeedToBeUpdated =
    someItemsWereLostByMember &&
    userDetails &&
    (userDetails.note ||
      userDetails.warning ||
      userDetails.hasExtremelyOverdueMembership);
  if (userMayNeedToBeUpdated) {
    displayCheckUserMessage();
  }
};

const getCheckedInSectionHeader = (): HTMLDivElement | undefined => {
  // Start by finding the links to the checked-in items
  const transactionSummary = document.querySelector("div#tx-summary");
  if (!transactionSummary) {
    console.error("Could not find transaction summary");
    return;
  }

  const transactionSectionHeaders =
    transactionSummary.querySelectorAll<HTMLDivElement>(
      "div.tx-section-header",
    );
  // A transaction should have at least one, but as many as three ("Checked
  // In", "Checked Out", and "Renewed")
  if (transactionSectionHeaders.length === 0) {
    console.error("Could not find transaction section headers");
    return;
  } else if (transactionSectionHeaders.length > 3) {
    console.error("Found too many transaction section headers");
    return;
  }

  const checkedInHeader = Array.from(transactionSectionHeaders).find((header) =>
    header.textContent.trim().startsWith("Checked In"),
  );
  if (!checkedInHeader) {
    console.debug(
      'Did not find the "Checked In" section header. This is expected if the user was not checking in items.',
    );
    return;
  }

  return checkedInHeader;
};

const getCheckedInAnchorElements = (
  checkedInHeader: HTMLDivElement,
): HTMLAnchorElement[] | undefined => {
  const checkedInLinks =
    checkedInHeader.nextElementSibling?.querySelectorAll<HTMLAnchorElement>(
      "a.hidden-print",
    );
  if (!checkedInLinks || checkedInLinks.length === 0) {
    console.error("Could not find checked in item links");
    return;
  }

  return Array.from(checkedInLinks);
};

const getUserDetails = async (): Promise<UserDetails> => {
  const userDetailsUrls = Array.from(
    document.querySelectorAll<HTMLAnchorElement>("div.panel-body > a"),
  )
    .map((a) => a.href)
    .filter((href) => href.includes("/library/orgMembership/userDetails"));
  if (userDetailsUrls.length !== 1 || !userDetailsUrls[0]) {
    throw new Error(
      "Could not find the link to the patron's user details page",
    );
  }
  const userDetailsUrl = userDetailsUrls[0];

  const userDetailsPage = await fetch(userDetailsUrl);
  const userDetailsText = await userDetailsPage.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(userDetailsText, "text/html");

  const controlLabels = Array.from(doc.querySelectorAll("label.control-label"));

  const userNoteLabel = controlLabels.find(
    (label) => label.textContent.trim() === "Note",
  );
  const note = userNoteLabel?.nextElementSibling?.textContent.trim();

  const userWarningLabel = controlLabels.find(
    (label) => label.textContent.trim() === "Warning",
  );
  const warning = userWarningLabel?.nextElementSibling?.textContent.trim();

  const membershipLabel = controlLabels.find(
    (label) => label.textContent.trim() === "Membership Type",
  );
  const hasExtremelyOverdueMembership =
    membershipLabel?.nextElementSibling?.textContent.includes(
      "ExtremelyOverdueItems",
    );

  if (
    typeof note === "undefined" ||
    typeof warning === "undefined" ||
    typeof hasExtremelyOverdueMembership === "undefined"
  ) {
    throw new Error(
      "Could not find necessary information on the patron's user details page",
    );
  }

  return {
    note,
    warning,
    hasExtremelyOverdueMembership,
  };
};

const getItemDetails = async (itemIds: ItemIds): Promise<ItemDetails> => {
  const { myTurnInternalId, itemId } = itemIds;

  const res = await fetch(`/library/orgInventory/edit/${myTurnInternalId}`);
  if (!res.ok) {
    throw new Error(
      `HTTP error ${String(res.status)} when attempting to fetch the edit page for the checked-in item ${itemId}`,
    );
  }
  const resText = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(resText, "text/html");

  // Version is used by MyTurn to avoid editing conflicts (ie, race
  // conditions), and is required when `POST`ing item updates.
  const version = doc
    .querySelector('input[name="version"]')
    ?.getAttribute("value");
  if (!version) {
    throw new Error(`Could not find version for item ${itemId}`);
  }

  // Fallback to category type, since item `name` can be empty in MyTurn
  const nameText = doc
    .querySelector('input[name="attribute_name"]')
    ?.getAttribute("value");
  const categoryText = doc
    .querySelector("span.caption-helper")
    ?.textContent.trim();
  // Truly do want `||` here, since `nameText` could be an empty string
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const name = nameText || categoryText;
  if (!name) {
    throw new Error(`Could not find a name for item ${itemId}`);
  }

  const statusCheckboxes = doc.querySelectorAll('input[name="statuses"]');
  if (statusCheckboxes.length === 0) {
    throw new Error(`Could not find statuses for item ${itemId}`);
  }
  const checkedStatusCheckboxes = doc.querySelectorAll<HTMLInputElement>(
    'input[name="statuses"]:checked',
  );
  const itemStatuses = Array.from(checkedStatusCheckboxes)
    .map((checkbox) => checkbox.value)
    .filter((i) => i) as (keyof typeof statuses)[];

  return {
    myTurnInternalId,
    itemId,
    version,
    name,
    statuses: itemStatuses,
  };
};

const buildFormDataForItemUpdate = (
  itemDetails: ItemDetails,
  updatedStatuses: string[],
): FormData => {
  const formData = new FormData();

  formData.append("id", itemDetails.myTurnInternalId);
  formData.append("internalId", itemDetails.itemId);
  formData.append("version", itemDetails.version);
  if (updatedStatuses.length > 0) {
    updatedStatuses.forEach((status) => {
      formData.append("statuses", status);
    });
  } else {
    formData.append("statuses", "");
  }
  // Make the page think that this is a normal browser form render and submission
  formData.append("jsok", "true");

  return formData;
};

const updateCheckedInItem = async (
  itemDetails: ItemDetails,
  formData: FormData,
): Promise<void> => {
  const res = await fetch(`/library/orgInventory/update`, {
    method: "POST",
    // Interestingly (and conveniently), if a field _isn't_ in the
    // multipart form data then MyTurn doesn't clear/alter that field
    // at all
    body: formData,
  });
  if (!res.ok) {
    throw new Error(
      `HTTP error ${String(res.status)} when attempting to update the checked-in ${itemDetails.name} (${itemDetails.itemId})`,
    );
  }
  const resText = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(resText, "text/html");

  // Need to use the response text (rather than HTTP status code)
  // to determine whether or not the edit operation was accepted
  // by MyTurn
  const wasSuccessful = Boolean(
    // Will be whitespace if there is no success message
    doc.querySelector("div.alert-success")?.textContent.trim(),
  );
  if (!wasSuccessful) {
    throw new Error(
      `Failed to update the checked-in ${itemDetails.name} (${itemDetails.itemId})`,
    );
  }
};

const displayCheckUserMessage = () => {
  const message =
    "This patron has a note, warning, or the `ExtremelyOverdueItems` membership type; check to see if any of these need to be cleared now that these items have been returned.";

  const newAlert = document.createElement("div");
  newAlert.classList.add("alert", "alert-warning");
  const messageContainer = document.createElement("span");
  messageContainer.textContent = message;
  newAlert.appendChild(messageContainer);

  const firstExistingAlert =
    document.querySelector<HTMLDivElement>("div.alert");
  if (!firstExistingAlert?.parentNode) {
    console.error(
      "Could not find alert divs; putting warning message in console instead",
    );
    console.warn(message);
    return;
  }

  // Would be ideal to insert _after_ the _last_ page-header alert, but there's
  // no great way to `querySelector` that given that there are multiple
  // `alert` divs elsewhere on the page
  firstExistingAlert.parentNode.insertBefore(
    newAlert,
    firstExistingAlert.nextSibling,
  );
};

// Create a text element that uses changing `…`-like typography to indicate
// progress/processing
const createProgressDots = (): HTMLSpanElement => {
  const progressDots = document.createElement("span");
  progressDots.ariaHidden = "true";

  // Make sure that the length of the element's text remains constant, to
  // avoid layout shifting due to the line overflowing
  const getText = (dotCount: number): string =>
    ".".repeat(dotCount) + " ".repeat(3 - dotCount);

  let dotCount = 1;
  progressDots.textContent = getText(dotCount);
  setInterval(() => {
    dotCount = (dotCount % 3) + 1;
    progressDots.textContent = getText(dotCount);
  }, 500);

  return progressDots;
};
