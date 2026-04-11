// Prevent users from viewing/editing their street address. We don't use this
// information, and would prefer to not store it for privacy reasons.

if (window.location.pathname === "/library/myAccount/index") {
  document.addEventListener("DOMContentLoaded", function () {
    // Use field attributes instead of text, because some of the fields
    // (such as the second street address line) lack a label
    const FIELDS_TO_HIDE = [
      "address.street1",
      "address.street2",
      "address.notes",
      // "Secondary Info" address fields
      "address2.street1",
      "address2.street2",
      "address2.notes",
    ];

    FIELDS_TO_HIDE.forEach(function (fieldId) {
      const nodes = document.querySelectorAll(
        `div.form-group:has(*[name='${fieldId}'])`,
      );

      if (nodes.length !== 1) {
        return;
      }

      const nodeToHide = nodes[0] as HTMLElement;
      // Can't delete the node, because it must be present in the
      // HTML form submission
      nodeToHide.style.display = "none";
    });

    // Also hide this additional PII that we don't use. Has to be `select`ed
    // using a different method than above.
    document
      .querySelector("div.form-group:has(input[name='_dateOfBirth'])")
      ?.setAttribute("hidden", "true");

    // Fix the MyTurn page's height by forcing recalculation
    window.dispatchEvent(new Event("resize"));
  });
}
