document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll("input[type=checkbox].auto-renew")
    .forEach(function (box) {
      return box.checked && box.click();
    });
});
