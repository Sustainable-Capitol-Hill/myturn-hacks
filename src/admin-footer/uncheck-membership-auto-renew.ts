// When a patron's membership is being changed on admin pages, the auto-renew
// checkbox is automatically checked. This script undoes that behavior, unless
// the patron has previously, explicitly opted in to auto-renewing.

if (
  // Run this on both the cart page and the edit membership page; both have
  // the same HTML elements and flow
  window.location.pathname === "/library/orgLoan/startCart" ||
  window.location.pathname === "/library/orgMembership/editMembership"
) {
  document.addEventListener("DOMContentLoaded", () => {
    const membershipSelect = document.querySelector<HTMLSelectElement>(
      'select[id="membershipTransition.newType"]',
    );

    membershipSelect?.addEventListener("change", function () {
      // If you don't use a timeout then due to other processing on the
      // page, the auto-renew checkbox will be re-checked
      setTimeout(() => {
        const currentAutoRenewStatus = document
          .querySelector<HTMLDivElement>("div#auto-renew-cb")
          ?.getAttribute("data-current-auto-renews");

        if (currentAutoRenewStatus === "false") {
          const box = document.querySelector<HTMLInputElement>(
            'input[type=checkbox][name="membershipTransition.autoRenew"]',
          );
          if (box?.checked) {
            box.click();
          }
        }
      });
    });
  });
}
