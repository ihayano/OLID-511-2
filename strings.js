(function () {
  function format(template, vars) {
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (_, key) =>
      vars[key] != null ? String(vars[key]) : ""
    );
  }

  function resolve(obj, dotted) {
    return dotted.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  function t(key, vars) {
    const root = window.GameStrings && window.GameStrings.data;
    if (!root) {
      console.warn("GameStrings not loaded; returning key:", key);
      return key;
    }
    const value = resolve(root, key);
    if (value == null) {
      console.warn("Missing string key:", key);
      return key;
    }
    if (Array.isArray(value)) {
      return value.map((line) =>
        typeof line === "string" ? format(line, vars) : line
      );
    }
    if (typeof value === "string") return format(value, vars);
    return value;
  }

  function applyStaticStrings(root) {
    const scope = root || document;
    const nodes = scope.querySelectorAll("[data-string]");
    nodes.forEach((node) => {
      const key = node.getAttribute("data-string");
      if (!key) return;
      const value = t(key);
      if (typeof value === "string") {
        node.textContent = value;
      }
    });

    const attrPrefix = "data-string-attr-";
    const attrNodes = scope.querySelectorAll("*");
    attrNodes.forEach((node) => {
      if (!node.attributes) return;
      for (const attr of Array.from(node.attributes)) {
        if (!attr.name.startsWith(attrPrefix)) continue;
        const targetAttr = attr.name.slice(attrPrefix.length);
        const value = t(attr.value);
        if (typeof value === "string") {
          node.setAttribute(targetAttr, value);
        }
      }
    });
  }

  window.GameStrings = {
    data: null,
    async load(url) {
      const target = url || "content/strings.json";
      const res = await fetch(target, { cache: "no-cache" });
      if (!res.ok) {
        throw new Error(
          `Failed to load strings from ${target}: ${res.status} ${res.statusText}`
        );
      }
      this.data = await res.json();
      return this.data;
    },
    t,
    format,
    applyStaticStrings,
  };
})();
