// This script gives MyTurn admins a "Check In To Shop" button at the top of
// each user's main page. Most other user pages lack the necessary membership
// information to confirm that the user is eligible to use the shop. Furthermore,
// if an admin is editing/updating a user's membership, submitting that form will
// bring the admin back to this (the `User Details`) page, so no need to add a
// button to the membership edit page. Clicking the button will log the check-in
// _anonymously_ in a Google Sheet.

if (window.location.pathname === "/library/orgMembership/userDetails") {
  document.addEventListener("DOMContentLoaded", function () {
    // Use an XPath query to find the cell that has membership information
    const nodesSnaphot = document.evaluate(
      `//div[@class="form-group"]/label[contains(@class, "control-label") and text()="Membership Type"]/following-sibling::div/div`,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null,
    );

    if (nodesSnaphot.snapshotLength === 0 || nodesSnaphot.snapshotLength > 1) {
      // We don't expect zero or multiple matches, so if we encounter
      // them we should not do anything to this element
      return;
    }

    const membershipInfoNode = nodesSnaphot.snapshotItem(0) as HTMLElement;
    const isMembershipActive =
      membershipInfoNode.querySelector("span.badge")?.textContent?.trim() ===
      "Active";
    if (!isMembershipActive) {
      return;
    }

    const lastButton = document.querySelector(
      "div.actions div.btn-group a:last-of-type",
    ) as HTMLAnchorElement | null;
    if (!lastButton) {
      return;
    }

    // Copy one of the existing buttons and modify it to be our new check-in button
    const checkInButton = lastButton.cloneNode(true) as HTMLAnchorElement;

    const iconChildNode = Array.from(checkInButton.children).filter(
      (i) => i.nodeType !== Node.TEXT_NODE,
    )?.[0];
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

    checkInButton.href = "#";
    checkInButton.onclick = function (e) {
      e.preventDefault();

      // Prevent accidental spamming of the Google Sheet URL
      checkInButton.onclick = (e) => {
        e.preventDefault();
      };

      // The user is now checked in to the shop, regardless of whether the Google Sheet logging was successful
      iconChildNode.classList.remove("fa-wrench");
      iconChildNode.classList.add("fa-check");
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
    iconChildNode.classList.remove("fa-shopping-cart");
    iconChildNode.classList.add("fa-wrench");
    // These anchors all use a space character (rather than proper CSS) to separate their icon from their text
    textChildNode.textContent = " Check In To Shop";

    lastButton?.parentNode?.append(checkInButton);
  });
}
