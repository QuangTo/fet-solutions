async function loadPagePartials() {
  const placeholders = [...document.querySelectorAll("[data-page-partial]")];
  await Promise.all(placeholders.map(async (placeholder) => {
    const response = await fetch(placeholder.dataset.pagePartial);
    if (!response.ok) {
      throw new Error(`Cannot load page partial: ${placeholder.dataset.pagePartial}`);
    }
    placeholder.outerHTML = await response.text();
  }));
}

await loadPagePartials();
await import("./app.js");
