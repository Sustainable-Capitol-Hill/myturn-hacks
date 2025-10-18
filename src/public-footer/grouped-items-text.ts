/**
 * Change the link text for grouped items from "X" to "View All (X)"
 *
 * "X" (e.g. "2"), is pretty widely overlooked, and also difficult to click. "View All (X)" (e.g. "View All (2)")
 * is very clear, and easier to click.
 *
 * Authors: Max Shenfield
 **/
// Skipping waiting for page load to avoid page flicker.
document
  .querySelectorAll(".stack-count")
  .forEach((label) => (label.textContent = `View All (${label.textContent})`));
