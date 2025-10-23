/*
    remove "regular" from the membership renewal selector, it's discontinued
    sam@chtl
*/
document.addEventListener("DOMContentLoaded", function () {
  Array.from(
    document.querySelector("[name='membershipTransition.newType']")?.children ||
      [],
  ).forEach(function (option) {
    if (option.textContent.includes("regular")) {
      option.remove();
    }
  });
});
