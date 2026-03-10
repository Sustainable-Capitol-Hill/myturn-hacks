document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll<HTMLInputElement>("input[type=checkbox].auto-renew")
    .forEach(function (box) {
      if (box.checked) {
        box.click();
      }
    });
});
