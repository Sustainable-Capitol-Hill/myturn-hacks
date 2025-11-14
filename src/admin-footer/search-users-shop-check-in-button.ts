// This script adds a "Check In To Shop" button to each row in the `Find User…`
// search page. This button will only appear for users with current memberships.
// Clicking the button will log the check-in _anonymously_ in a Google Sheet.

// Source: https://stackoverflow.com/a/27078401
// Use this instead of having to add a new dependency
function throttle(func: () => void, delay: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (!timeout) {
      timeout = setTimeout(() => {
        timeout = null;
        // This will run the function on the trailing edge rather than the leading edge of the throttling
        func();
      }, delay);
    }
  };
}

function addButtonToUserActionCell(
  actionCell: HTMLElement,
  isEligible: boolean,
) {
  const lastButton = actionCell?.querySelector(
    "a:last-of-type",
  ) as HTMLAnchorElement | null;
  const nullHref = "#";
  if (
    !lastButton ||
    // Don't add the button again if it's already been added
    lastButton.href === nullHref ||
    // Some browsers transform `#` into the full URL tailing with `#`
    lastButton.href.endsWith("#")
  ) {
    return;
  }

  // Copy one of the existing buttons and modify it to be our new check-in button
  const checkInButton = lastButton.cloneNode(true) as HTMLAnchorElement;

  const iconChildNode = Array.from(checkInButton.children)?.[0];
  const textChildNode = Array.from(checkInButton.childNodes).filter(
    (i) => i.nodeType === Node.TEXT_NODE,
  )?.[0];
  if (!iconChildNode) {
    console.warn("Could not find the icon for the shop check-in button");
    return;
  }
  if (!textChildNode) {
    console.warn(
      "Could not find and set the text node for the shop check-in button",
    );
    return;
  }

  checkInButton.href = nullHref;
  checkInButton.classList.remove("btn-primary");
  checkInButton.classList.add("btn-warning");
  iconChildNode.classList.remove("fa-shopping-cart");

  if (!isEligible) {
    iconChildNode.classList.add("fa-ban");
    // This also disables clicking functionality, etc
    checkInButton.classList.add("disabled");
    checkInButton.title = "Patron is not eligible based on membership status";
    textChildNode.textContent = " Ineligible For Shop";
  }

  if (isEligible) {
    // These anchors all use a space character (rather than proper CSS) to separate their icon from their text
    textChildNode.textContent = " Check In To Shop";

    // This is the best icon we can use, based the icon subset that MyTurn
    // is built/deployed with
    iconChildNode.classList.add("fa-wrench");

    checkInButton.onclick = function (e) {
      e.preventDefault();

      // Prevent accidental spamming of the Google Sheet URL
      checkInButton.onclick = (e) => {
        e.preventDefault();
      };

      // The user is now checked in to the shop, regardless of whether the Google Sheet logging was successful
      iconChildNode.classList.remove("fa-wrench");
      iconChildNode.classList.add("fa-check");
      checkInButton.classList.remove("btn-warning");
      checkInButton.classList.add("btn-success");
      textChildNode.textContent = " Checked In To Shop";

      // This URL (and any "password"-y things we tried to add) would need
      // be sent by the user's browser anyway, so there's no point trying to
      // obfuscate or hide it
      fetch(
        "https://script.google.com/macros/s/AKfycbxxBH45l6yf8GVCG3dHi6Tkp6Y66VPqdgLtPfm6i0HcxvEzcC1J1ajvRWlUb6iiFMZE5w/exec",
        {
          method: "POST",
          redirect: "follow",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
        },
      ).catch((err) => {
        console.error("Error logging the shop check-in to Google Sheets:", err);
      });
    };
  }

  actionCell.appendChild(checkInButton);
}

function addButtonsForEligibleUsers() {
  // These membership types – if not expired – are considered valid for shop check-in
  const validMembershipTypes = [
    "Standard (Annual)",
    "Standard (Monthly)",
    "Flexible",
    "Sustaining (Annual)",
    "regular",
  ];

  // Where these columns appear in the user list table
  const membershipColumnIndex = 6;
  const expirationColumnIndex = 7;

  // Assert that we're parsing the correct columns
  const headerCells = document.querySelectorAll("table#user-list thead tr th");
  if (
    headerCells[membershipColumnIndex]?.textContent?.trim() !== "Membership" ||
    headerCells[expirationColumnIndex]?.textContent?.trim() !== "Expiration"
  ) {
    console.error(
      'Could not find the expected "Membership" or "Membership Expiration" columns in user list table',
    );
    return;
  }

  const userRows = document.querySelectorAll("table#user-list tbody tr");
  userRows.forEach((row) => {
    // CSS `nth-of-type` selectors are 1-indexed
    const membership = row
      .querySelector(`td:nth-of-type(${membershipColumnIndex + 1})`)
      ?.textContent.trim();
    const expiration = row
      .querySelector(`td:nth-of-type(${expirationColumnIndex + 1})`)
      ?.textContent.trim();

    const actionCell = row.querySelector("td.action-buttons");
    if (!actionCell) {
      console.warn("Could not find action buttons in the user row");
      return;
    }

    const isEligible =
      typeof membership === "string" &&
      typeof expiration === "string" &&
      validMembershipTypes.includes(membership) &&
      new Date(expiration) >= new Date();

    addButtonToUserActionCell(actionCell as HTMLElement, isEligible);
  });
}

const throttledAddButtonsForEligibleUsers = throttle(
  addButtonsForEligibleUsers,
  500,
);

if (window.location.pathname === "/library/orgMembership/searchUsers") {
  const userTableObserver = new MutationObserver(function (mutations) {
    // Skip mutations that don't add/alter actual user rows
    if (
      mutations.length === 0 ||
      mutations.filter((i) => i.addedNodes.length > 0).length === 0 ||
      mutations[0]?.addedNodes[0]?.textContent === "No data available in table"
    ) {
      return;
    }

    throttledAddButtonsForEligibleUsers();
  });

  const nodeToWatch = document.querySelector("table#user-list tbody");
  if (nodeToWatch) {
    userTableObserver.observe(nodeToWatch, { childList: true });
  }
}
