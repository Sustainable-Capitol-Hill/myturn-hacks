/* Clean up the "Payment method" options on cart pages.
 *
 * Hides the options CHTL doesn't use for in-person payments, and put the most used higher up
 * the list.
 *
 * Authors: Max Shenfield
 */
function makePaymentMethodNicer() {
  const paymentMethodSelect =
    document.querySelector<HTMLSelectElement>("#pick-a-method");
  if (paymentMethodSelect == null) {
    return;
  }

  // Use a deny-list instead of an allow-list, so that if we get it wrong or the HTML changes, we just go back to showing all the options, instead of displaying nothing and making the page unusable.
  const paymentMethodsWeDontUse = new Set([
    "7", // "Accrue Remaining on Account". CHTL doesn't have late fees, so members shouldn't have a balance to carry over.
    "11", // "Gift Card". CHTL hasn't every received a gift card as a payment. If we did, we would just treat it as a donation with a flexible membership.
    "12", // "Bank Transfer"
    "13", // "Credit/Debit (Stripe)". Only for self-signups online.
    "14", // "Gift Certificate Redemption". CHTL doesn't have gift certificates.
  ]);

  const paymentMethodOptions = Array.from(
    document.querySelectorAll<HTMLOptionElement>("#pick-a-method > option"),
  );

  paymentMethodOptions.forEach((o) => {
    if (paymentMethodsWeDontUse.has(o.value)) {
      o.style = "display: none";
    }
  });

  // Order remaining "Payment method" optiions
  const paymentMethodValuesNewOrder: string[] = [
    "3", // "In-Person Credit/Debit"
    "1", // "Cash"
    "5", // "Paypal, Venmo, CashApp"
    "2", // "Check"
    "8", // "Discount"
  ];

  const paymentMethodOptionsByValue = new Map<string, HTMLOptionElement>();
  paymentMethodOptions.forEach((o) => {
    paymentMethodOptionsByValue.set(o.value, o);
  });

  const paymentMethodOptionsNewOrder = paymentMethodValuesNewOrder.map((v) =>
    paymentMethodOptionsByValue.get(v),
  );
  // Add any options we didn't explicitly order, in case more are added.
  paymentMethodOptions.forEach((o) => {
    if (!paymentMethodValuesNewOrder.includes(o.value)) {
      paymentMethodOptionsNewOrder.push(o);
    }
  });

  paymentMethodSelect.replaceChildren(
    ...(paymentMethodOptionsNewOrder as Node[]),
  );
  // paymentMethodSelect defaults to the last element. Set default to first element in our ordered list.
  if (typeof paymentMethodValuesNewOrder[0] === "string") {
    paymentMethodSelect.value = paymentMethodValuesNewOrder[0];
  }
}

// The payment options are added after page load in Firefox. Wait till they're added to modify.
function callMakePaymentMethodNicer(
  mutationList: MutationRecord[],
  observer: MutationObserver,
) {
  observer.disconnect();
  makePaymentMethodNicer();
}

const observer = new MutationObserver(callMakePaymentMethodNicer);
addEventListener("DOMContentLoaded", () => {
  const node = document.querySelector("#pick-a-method");
  if (node) {
    observer.observe(node, {
      childList: true,
    });
  }
});
