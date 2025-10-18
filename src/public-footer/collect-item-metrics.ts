import { posthog } from "posthog-js";

posthog.init("phc_BgkM7UzoKyZHYF1CPzTpmIc6IyRzoQ87Gi8GEW9na1W", {
  api_host: "https://boop.sustainablecapitolhill.org",
  defaults: "2025-05-24",
});

function collectItemData() {
  try {
    const itemMatches = window.location.pathname.match(
      /\/library\/inventory\/show\/(\d+)/,
    );
    const titleMatch = document
      .querySelector(".page-title > h1")
      ?.textContent.match(/(.*)\((\d+)\).*/);

    let data: { [key: string]: string | undefined } = {
      isLoggedIn: (!document.querySelector("#login-link")).toString(),
      isAdmin: (!!document.querySelector("i.icon-speedometer")).toString(),
    };

    if (titleMatch && itemMatches) {
      const [, name, number] = titleMatch;
      data = {
        ...data,
        itemId: itemMatches[1],
        itemName: name?.trim(),
        itemNumber: number,
        itemCategory: document.querySelector("ul.page-breadcrumb > li.active")
          ?.textContent,
      };
      const inStock = Array.from(document.querySelectorAll("span.badge"))
        .find((badge) => !badge.classList?.toString().includes("reservation"))
        ?.textContent?.includes("In Stock");

      if (inStock !== undefined) {
        data = {
          ...data,
          inStock: inStock.toString(),
        };
      }
    }

    return data;
  } catch (e) {
    return {
      item_data_error: e.toString(),
    };
  }
}

(function () {
  const itemMatches = window.location.pathname.match(
    /\/library\/inventory\/show\/(\d+)/,
  );

  const data = collectItemData();
  posthog.capture("item page loaded", data);

  if (itemMatches != null) {
    const inStock = Array.from(document.querySelectorAll("span.badge"))
      .find(
        (badge) => !(badge.classList ?? "").toString().includes("reservation"),
      )
      ?.textContent?.includes("In Stock");

    if (!inStock) {
      const messageBox = document.createElement("div");
      messageBox.classList.add("alert", "alert-warning");

      const message = document.createElement("span");
      message.append(
        "Is this item often unavailable when you want to check it out?",
      );
      message.style.marginRight = "12px";
      messageBox.append(message);

      const button = document.createElement("button");
      button.classList.add("btn", "btn-warning");
      button.append("Let us know");

      button.onclick = function () {
        posthog.capture("unavailable button clicked", data);
        button.textContent = "Thank you for letting us know!";

        button.style.backgroundColor = "green";

        button.style.color = "white";
        button.disabled = true;
      };

      messageBox.append(button);

      document
        .querySelector("div.page-content > div.container")
        ?.prepend(messageBox);
    }
  }
})();
