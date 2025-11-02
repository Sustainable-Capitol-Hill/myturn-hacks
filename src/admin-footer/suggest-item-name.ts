document.addEventListener("DOMContentLoaded", () => {
  if (!window.location.pathname.includes("/library/orgInventory/create")) {
    return;
  }

  // querySelector can return any element but we
  // know this must be an input based on the query
  const nameInput = document.querySelector(
    "input[name=attribute_name]",
  ) as HTMLInputElement | null;

  if (!nameInput) return;

  const nameRow = nameInput.closest("div.row");
  if (!nameRow) return;

  const category = document.querySelector("span.caption-helper")?.textContent;
  if (!category) return;

  const helpNode = document.querySelector(
    "div.form-group:has(input#attribute_name) div.help-block",
  );

  if (!helpNode) return;

  /* Get all of our early returns out of the way, at this point we know
   * everything we want to munge will be defined */

  // strip off plural
  const suggestedName = category.endsWith("s")
    ? category.substring(0, category.length - 1)
    : category;

  const suggestBtn = document.createElement("button");
  suggestBtn.classList = "btn btn-primary";
  suggestBtn.style.margin = "6px 0";
  suggestBtn.innerHTML = `<i class="fa fa-star" style="margin-right: 4px;"></i> Use "${suggestedName}"`;
  suggestBtn.type = "button";
  suggestBtn.onclick = () => {
    nameInput.value = suggestedName;
  };

  nameRow.after(suggestBtn);

  helpNode.innerHTML = `<div class='alert alert-info'>If not using the suggested name, keep the item's name as short as possible and Capitalize Each Word. Don't include details like manufacturer, model, or size here; use the fields below instead.</div>`;
});
