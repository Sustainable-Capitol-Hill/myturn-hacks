// Give in-line guidelines on how items should be titled. This will help make
// our MyTurn data more consistent and allow MyTurn to group items together
// more accurately.

if (window.location.pathname === "/library/orgInventory/create") {
  document.addEventListener("DOMContentLoaded", function () {
    // Find the `.help-block` text for the `Name` field. Since
    // `querySelector`s can return `null`, it's easiest from a TypeScript
    // perspective to one-liner the selector instead of making it atomic
    // (and thus slightly more readable).
    const nodeToEdit = document.querySelector(
      "div.form-group:has(input#attribute_name) div.help-block",
    );

    if (!nodeToEdit) {
      console.warn(
        "Could not find the HTML node for the name field's help text",
      );
      return;
    }

    nodeToEdit.innerHTML =
      'The item\'s name. Please use <a target="_blank" href="https://en.wikipedia.org/wiki/Title_case">title case</a> and be concise; details like brand, size, and color should be noted in other fields instead, unless they\'re integral to how this item functions.';
  });
}
