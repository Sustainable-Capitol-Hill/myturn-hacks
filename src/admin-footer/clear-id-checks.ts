/* provide a shortcut to clear member warnings about ID checks
 *
 * Authors: Sam Wolfson
 */
function clearWarning() {
  const warning = document.querySelector("#user-warning");
  if (!warning) return;

  if (!warning.textContent.includes("ID")) return;

  const search = new URLSearchParams(window.location.search);
  const userId = search.get("userId");

  if (!userId) return;

  const params = new URLSearchParams();
  params.append("id", userId);
  params.append("text", "");

  const clickHandler = function () {
    fetch("/library/orgMembership/saveUserWarning", {
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: params.toString(),
      method: "POST",
    })
      .then(function () {
        warning.remove();
      })
      .catch((err: unknown) => {
        console.error("Error clearing ID warning:", err);
      });
  };

  const button = document.createElement("button");
  button.onclick = clickHandler;
  button.style.marginTop = "1em";

  const inner = document.createElement("span");
  inner.innerHTML = "✅ Click to remove warning";
  inner.style.fontSize = "16px";
  button.appendChild(inner);
  warning.append(document.createElement("br"));
  warning.append(button);
}

document.addEventListener("DOMContentLoaded", clearWarning);
