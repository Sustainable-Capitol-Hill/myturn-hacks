// Limit the `Location Code` field to only valid values, to avoid typos and
// misunderstandings.
// Implements proposal/discussion from our October 2025 board meeting:
// https://docs.google.com/document/d/1C8SA-lwJBuDkQ2UlIHkiWYxPWrXW0P5M628AHb4OMAo
// https://docs.google.com/document/d/16EwArqpL4jVmazed9BBHsQstZOiqqeaNVvaGF30ERoM

const validLocationCodes = {
  "Inventory Room Shelves": [
    "A 1.0",
    "A 1.1",
    "A 1.2",
    "A 1.3",
    "A 1.4",
    "A 1.5",
    "A 2.0",
    "A 2.1",
    "A 2.3",
    "A 2.4",
    "A 2.5",
    "A 3.0",
    "A 3.1",
    "A 3.2",
    "A 3.3",
    "A 3.4",
    "A 3.5",
    "A 4.0",
    "A 4.1",
    "A 4.2",
    "A 4.3",
    "A 4.4",
    "A 4.5",
    "A 5.1",
    "A 5.4",
    "A 5.5",
    "B 1.0",
    "B 1.1",
    "B 1.2",
    "B 1.3",
    "B 1.4",
    "B 2.0",
    "B 2.1",
    "B 2.2",
    "B 2.3",
    "B 2.4",
    "C 1.1",
    "C 1.2",
    "C 1.3",
    "C 1.4",
    // The `D 1.#` shelves are for consumables only
    "E 1.0",
    "E 1.1",
    "E 1.2",
    "E 1.3",
    "E 1.35",
    "E 1.4",
  ],
  "Inventory Room Ends and Walls": [
    "Hung on Inventory Room Door",
    "Front Wall",
    "B End",
    "D/E End",
    "Far Back",
    "Far Back 1",
    "Far Back 2",
    "Far Back 3",
  ],
  "Wood Shop": ["Shop Bench", "Shop Toolbox", "Shop Wall", "Beneath Table Saw"],
  "Front Desk": ["Front Desk", "Shelf Behind Front Desk"],
  "Craft and Electronics Area": [
    // The gardening shelf was labeled `F 0.1` even though it's not at the ground level
    "F 0.1",
    "F 1.1",
    "F 1.2",
    "F 1.3",
    "F 1.4",
    "F 1.5",
    "F 1.6",
    "F 2.1",
    "F 2.2",
    "F 2.3",
    "F 2.4",
    "F 2.5",
    "F 2.6",
    "F 2.7",
    "F 2.8",
    "Bike Area",
    "Mending Shelf",
  ],
  Other: ["Restroom", "Upstairs"],
};

if (window.location.pathname === "/library/orgInventory/create") {
  document.addEventListener("DOMContentLoaded", function () {
    // Hide the "use default" button. Must be iterated through since different
    // viewport sizes have different hidden/shown button elements.
    const useDefaultButtons = document.querySelectorAll(
      'button[data-attribute="location_code"]',
    );
    useDefaultButtons.forEach((button) => {
      const buttonContainer = button.parentElement;
      if (buttonContainer) {
        buttonContainer.style.display = "none";
      }
    });

    // Build the `select` element
    const locationCodeSelect = document.createElement("select");
    locationCodeSelect.id = "attribute_location_code";
    locationCodeSelect.name = "attribute_location_code";
    locationCodeSelect.className = "form-control";
    locationCodeSelect.required = true;

    // Add a default, unselectable option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.text = "";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    locationCodeSelect.appendChild(defaultOption);

    // Populate the select element with all valid location codes
    for (const [area, locations] of Object.entries(validLocationCodes)) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = area;

      locations.forEach((location) => {
        const option = document.createElement("option");
        option.value = location;
        option.text = location;
        optgroup.appendChild(option);
      });

      locationCodeSelect.appendChild(optgroup);
    }

    // Replace the text input field for location code
    const locationCodeTextInput = document.querySelector(
      "input#attribute_location_code",
    );
    const locationCodeContainer = locationCodeTextInput?.parentElement;
    if (!locationCodeContainer) return;
    locationCodeTextInput.remove();
    locationCodeContainer.appendChild(locationCodeSelect);

    // Make the `select`'s value actually get submitted by MyTurn's custom form
    // logic. In order to "read" a `select` value upon submit, the
    // `data-attribute-type` has to be changed from `Single-line` (ie, "parse
    // this text field") to `Maintenance Plan` (Maintenance Plan being one of
    // the two other `select` fields in this page's form). This is frustrating
    // – and probably fragile! – but it's the best workaround that I was able
    // to find.
    const rowContainer = locationCodeContainer.closest("div.row-location_code");
    if (!rowContainer) return;
    rowContainer.setAttribute("data-attribute-type", "Maintenance Plan");
  });
}
