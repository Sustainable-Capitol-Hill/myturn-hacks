// This script gives MyTurn admins a "Check In To Shop" button at the top of
// each user's main page. Most other user pages lack the necessary membership
// information to confirm that the user is eligible to use the shop. Furthermore,
// if an admin is editing/updating a user's membership, submitting that form will
// bring the admin back to this (the `User Details`) page, so no need to add a
// button to the membership edit page. Clicking the button will log the check-in
// _anonymously_ in a Google Sheet.

import { hashString } from "../utils.ts";

class AgreementsUnsignedError extends Error {}

function getUserDetailsNodes(fieldName: string) {
  return document.evaluate(
    `//div[@class="form-group"]/label[contains(@class, "control-label") and text()="${fieldName}"]/following-sibling::div/div`,
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null,
  );
}

if (window.location.pathname === "/library/orgMembership/userDetails") {
  document.addEventListener("DOMContentLoaded", function () {
    // Use a XPath queries to find specific cells based on text content, since
    // there is poor semantic HTML structure to search otherwise
    const usernameNodesSnapshot = getUserDetailsNodes("Username");
    const membershipNodesSnapshot = getUserDetailsNodes("Membership Type");
    const warningNodesSnapshot = getUserDetailsNodes("Warning");

    if (
      usernameNodesSnapshot.snapshotLength !== 1 ||
      membershipNodesSnapshot.snapshotLength !== 1 ||
      warningNodesSnapshot.snapshotLength !== 1
    ) {
      // We don't expect zero or multiple matches, so if we encounter
      // them we should not do anything to this element
      console.warn(
        "Could not identify the username, membership, and/or warning nodes",
      );
      return;
    }

    const username = usernameNodesSnapshot.snapshotItem(0)?.textContent?.trim();
    if (!username) {
      console.warn("Could not find the member's username");
      return;
    }

    const membershipInfoNode = membershipNodesSnapshot.snapshotItem(
      0,
    ) as HTMLElement;
    const isMembershipActive =
      membershipInfoNode.querySelector("span.badge")?.textContent.trim() ===
      "Active";
    const warningText = (
      warningNodesSnapshot.snapshotItem(0) as HTMLElement
    ).textContent.trim();
    const isUserIdConfirmed = !warningText.includes(
      "confirm that they are at least 18 years old on their ID",
    );

    const lastButton = document.querySelector(
      "div.actions div.btn-group a:last-of-type",
    );
    if (!lastButton) {
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

    // Since this new button is inside a container it can't inherit the CSS of
    // the rest of the buttons, so we need to apply those styles directly
    checkInButton.classList.add("btn-xs");
    checkInButton.style.padding = "4px 10px";
    checkInButton.style.lineHeight = "1.5";

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

    checkInButton.href = "#";
    iconChildNode.classList.remove("fa-shopping-cart");

    const userId = new URLSearchParams(window.location.search).get("userId");
    // This should never happen, but just in case
    if (!userId) {
      console.warn("Could not find the user ID in the URL");
      checkInButton.classList.add("disabled");
      checkInButtonContainer.title =
        "Unable to confirm whether the user has signed the liability waivers. Please confirm this manually.";
      return;
    }

    if (!isMembershipActive) {
      iconChildNode.classList.add("fa-ban");
      checkInButton.classList.add("disabled");
      checkInButtonContainer.title =
        "Patron is not eligible based on membership status";
      textChildNode.textContent = " Ineligible For Shop";
    } else if (!isUserIdConfirmed) {
      iconChildNode.classList.add("fa-ban");
      checkInButton.classList.add("disabled");
      checkInButtonContainer.title =
        "Patron has not yet confirmed they are at least 18 years old";
      textChildNode.textContent = " Ineligible For Shop";
    } else {
      iconChildNode.classList.add("fa-wrench");
      // These anchors all use a space character (rather than proper CSS) to separate their icon from their text
      textChildNode.textContent = " Check In To Shop";

      checkInButton.onclick = function (e) {
        e.preventDefault();

        // Don't allow multiple clicks
        checkInButton.onclick = null;

        // Unlike the user search list button, we can't use the spinner icon
        // here since the Font Awesome icon isn't in this page's bundle
        checkInButton.classList.add("disabled");
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
            if (html.includes("There are agreements to be signed")) {
              throw new AgreementsUnsignedError();
            }
          })
          .catch((err: unknown) => {
            if (err instanceof AgreementsUnsignedError) {
              iconChildNode.classList.remove("fa-wrench");
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
            iconChildNode.classList.remove("fa-wrench");
            iconChildNode.classList.add("fa-check");
            textChildNode.textContent = " Checked In To Shop";

            return hashString(username);
          })
          .then((hashedUsername) => {
            // Skip the Google Sheet logging if we're not in production
            if (
              window.location.hostname === "localhost" ||
              window.location.hostname.endsWith(".test.myturn.com")
            ) {
              return;
            }

            // This POST request will result in a new row being added to this Google Sheet:
            // https://docs.google.com/spreadsheets/d/1D67pfv4X-n1ugFQCK5gd_N4f2C80ozOaGU4P6ewMRKQ/edit
            return fetch(
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
            );
          })
          .catch((err: unknown) => {
            if (!(err instanceof AgreementsUnsignedError)) {
              console.error(
                "Error logging the shop check-in to Google Sheets:",
                err,
              );
            }
          });
      };
    }

    buttonsContainer.appendChild(checkInButtonContainer);
  });
}
