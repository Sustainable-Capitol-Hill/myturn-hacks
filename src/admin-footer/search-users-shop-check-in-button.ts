// This script adds a "Check In To Shop" button to each row in the `Find User…`
// search page. This button will only appear for users with current memberships.
// Clicking the button will log the check-in _anonymously_ in a Google Sheet.

import { hashString } from "../utils.ts";

class AgreementsUnsignedError extends Error {}
class Under18Error extends Error {}

// Source: https://stackoverflow.com/a/27078401
// Use this instead of having to add a new dependency
function throttle(func: () => void, delay: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return () => {
    timeout =
      timeout ??
      setTimeout(() => {
        timeout = null;
        // This will run the function on the trailing edge rather than the leading edge of the throttling
        func();
      }, delay);
  };
}

function addButtonToUserActionCell(
  actionCell: HTMLElement,
  username: string,
  hasEligibleMembership: boolean,
) {
  let userId: string | null = null;
  const firstButton = actionCell.querySelector("a");
  if (firstButton) {
    const urlParams = new URLSearchParams(new URL(firstButton.href).search);
    userId = urlParams.get("userId");
  }
  if (!userId) {
    console.warn("Could not determine user ID for shop check-in button");
    return;
  }

  const lastButton = actionCell.querySelector("a:last-of-type");
  const nullHref = "#";
  if (
    !lastButton ||
    // Don't add the button again if it's already been added
    (lastButton as HTMLAnchorElement).href === nullHref ||
    // Some browsers transform `#` into the full URL tailing with `#`
    (lastButton as HTMLAnchorElement).href.endsWith("#")
  ) {
    return;
  }

  // Create a container for the check-in button, so that we can apply tooltips;
  // `disable`d buttons cannot have tooltips in Bootstrap:
  // https://getbootstrap.com/docs/5.0/components/tooltips/#disabled-elements
  const buttonsContainer = lastButton.parentElement as HTMLTableCellElement;
  const checkInButtonContainer = document.createElement("span");

  // Copy one of the existing buttons and modify it to be our new check-in button
  const checkInButton = lastButton.cloneNode(true) as HTMLAnchorElement;
  checkInButtonContainer.appendChild(checkInButton);

  const iconChildNode = Array.from(checkInButton.children)[0];
  const textChildNode = Array.from(checkInButton.childNodes).find(
    (i) => i.nodeType === Node.TEXT_NODE,
  );
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

  if (!hasEligibleMembership) {
    iconChildNode.classList.add("fa-ban");
    // This also disables clicking functionality, etc
    checkInButton.classList.add("disabled");
    checkInButtonContainer.title =
      "Patron does not have an eligible membership to use the shop";
    textChildNode.textContent = " Ineligible For Shop";
  }

  if (hasEligibleMembership) {
    // These anchors all use a space character (rather than proper CSS) to separate their icon from their text
    textChildNode.textContent = " Check In To Shop";

    // This is the best icon we can use, based the icon subset that MyTurn
    // is built/deployed with
    iconChildNode.classList.add("fa-wrench");

    checkInButton.onclick = function (e) {
      e.preventDefault();

      // Don't allow multiple clicks
      checkInButton.onclick = null;

      checkInButton.classList.add("disabled");
      iconChildNode.classList.remove("fa-wrench");
      iconChildNode.classList.add("fa-spinner", "fa-spin");
      textChildNode.textContent = " Checking In To Shop";

      // Check whether the user has signed the required liability waivers
      fetch(`/library/orgMembership/listAgreements/${userId}`)
        // This is ridiculous, but MyTurn appears to have a bug where the
        // _previous_ request's "There are agreements to be signed" message is
        // cached/sticky, and will be included in the subsequent request _even
        // if it is not actually true_. So we'll work around this by making
        // our request twice. *Sigh.*
        .then(() => fetch(`/library/orgMembership/listAgreements/${userId}`))
        .then((res) => res.text())
        .then((html) => {
          // It'd be ideal to properly parse the HTML but it isn't totally necessary
          if (html.includes("There are agreements to be signed")) {
            throw new AgreementsUnsignedError();
          }
        })
        // Confirm that the user has presented ID to confirm they're 18+
        .then(() =>
          fetch(`/library/orgMembership/userDetails?userId=${userId}`),
        )
        .then((res) => res.text())
        .then((html) => {
          if (
            html.includes(
              "confirm that they are at least 18 years old on their ID",
            )
          ) {
            throw new Under18Error();
          }
        })
        .catch((err: unknown) => {
          if (err instanceof AgreementsUnsignedError) {
            iconChildNode.classList.remove("fa-spinner", "fa-spin");
            iconChildNode.classList.add("fa-ban");
            checkInButtonContainer.title =
              "Patron has not yet signed the liability waivers";
            textChildNode.textContent = " Ineligible For Shop";

            // Without this slight delay, the `alert` triggers before the UI updates the button
            setTimeout(() => {
              alert(
                "The patron is not yet eligible to use the shop, since they have not signed the required liability waivers",
              );
            }, 100);
          } else if (err instanceof Under18Error) {
            iconChildNode.classList.remove("fa-spinner", "fa-spin");
            iconChildNode.classList.add("fa-ban");
            checkInButtonContainer.title =
              "Patron has not yet confirmed they are at least 18 years old";
            textChildNode.textContent = " Ineligible For Shop";

            setTimeout(() => {
              alert(
                'The patron is not yet eligible to use the shop, since their account still has the "confirm that they are at least 18 years old on their ID" warning',
              );
            }, 100);
          } else {
            console.error("Error checking user agreements:", err);
            setTimeout(() => {
              alert(
                "Unable to confirm whether the user has signed the liability waivers. Please confirm this manually.",
              );
            }, 100);
          }
          throw err;
        })
        .then(() => {
          // The user is now checked in to the shop, regardless of whether the Google Sheet logging was successful
          iconChildNode.classList.remove("fa-spinner", "fa-spin");
          iconChildNode.classList.add("fa-check");
          checkInButton.classList.remove("btn-warning");
          checkInButton.classList.add("btn-success");
          textChildNode.textContent = " Checked In To Shop";

          // Skip the Google Sheet logging if we're not in production
          if (
            window.location.hostname === "localhost" ||
            window.location.hostname.endsWith(".test.myturn.com")
          ) {
            return;
          }

          return hashString(username).then((hashedUsername) =>
            // This POST request will result in a new row being added to this Google Sheet:
            // https://docs.google.com/spreadsheets/d/1D67pfv4X-n1ugFQCK5gd_N4f2C80ozOaGU4P6ewMRKQ/edit
            fetch(
              // This URL (and any "password"-y things we tried to add) would need
              // be sent by the user's browser anyway, so there's no point trying to
              // obfuscate or hide it
              "https://script.google.com/macros/s/AKfycbxNfL-5HBoCrEx4v99Ei90SHMz1oiOps4REeynq6RBAk0IHF_VUuipe6URGyl8ztOoX/exec",
              {
                method: "POST",
                redirect: "follow",
                // We don't need the entire hash, just enough to roughly identify
                // repeat users
                body: JSON.stringify({
                  hashedUsername: hashedUsername.slice(0, 7),
                }),
              },
            ),
          );
        })
        .catch((err: unknown) => {
          if (
            !(
              err instanceof AgreementsUnsignedError ||
              err instanceof Under18Error
            )
          ) {
            console.error(
              "Error logging the shop check-in to Google Sheets:",
              err,
            );
          }
        });
    };
  }

  buttonsContainer.appendChild(checkInButtonContainer);
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
  const usernameColumnIndex = 0;
  const membershipColumnIndex = 6;
  const expirationColumnIndex = 7;

  // Assert that we're parsing the correct columns
  const headerCells = document.querySelectorAll("table#user-list thead tr th");
  if (
    headerCells[usernameColumnIndex]?.textContent.trim() !== "User" ||
    headerCells[membershipColumnIndex]?.textContent.trim() !== "Membership" ||
    headerCells[expirationColumnIndex]?.textContent.trim() !== "Expiration"
  ) {
    console.error("Could not find the expected columns in user list table");
    return;
  }

  const userRows = document.querySelectorAll("table#user-list tbody tr");
  userRows.forEach((row) => {
    // CSS `nth-of-type` selectors are 1-indexed
    const username = row
      .querySelector(`td:nth-of-type(${String(usernameColumnIndex + 1)})`)
      ?.textContent.trim();
    if (!username) {
      console.warn("Could not find username in a user row");
      return;
    }

    const membership = row
      .querySelector(`td:nth-of-type(${String(membershipColumnIndex + 1)})`)
      ?.textContent.trim();
    const expiration = row
      .querySelector(`td:nth-of-type(${String(expirationColumnIndex + 1)})`)
      ?.textContent.trim();

    const actionCell = row.querySelector("td.action-buttons");
    if (!actionCell) {
      console.warn("Could not find action buttons in the user row");
      return;
    }

    const hasEligibleMembership =
      typeof membership === "string" &&
      typeof expiration === "string" &&
      validMembershipTypes.includes(membership) &&
      new Date(expiration) >= new Date();

    addButtonToUserActionCell(
      actionCell as HTMLElement,
      username,
      hasEligibleMembership,
    );
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
