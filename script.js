const locationKeys = ["science", "valley", "sugar", "apartments", "radio", "health"];
const outsideTownKeys = new Set(["valley", "health"]);

let locationDefinitions = locationKeys.map((key) => ({
  key,
  title: key,
  contact: "",
  elevation: "",
  detail: "",
  outsideTown: outsideTownKeys.has(key),
}));

function hydrateLocationDefinitions() {
  if (!window.GameStrings || !window.GameStrings.data) return;
  const { t } = window.GameStrings;
  locationDefinitions = locationKeys.map((key) => ({
    key,
    title: t(`locations.${key}.title`),
    contact: t(`locations.${key}.contact`),
    elevation: t(`locations.${key}.elevation`),
    detail: t(`locations.${key}.detail`),
    outsideTown: outsideTownKeys.has(key),
  }));
}

const dom = {
  terminal: document.getElementById("terminal"),
  choicePanel: document.getElementById("choice-panel"),
  inputZone: document.getElementById("input-zone"),
  inputLabel: document.getElementById("input-label"),
  input: document.getElementById("builder-input"),
  inputSubmit: document.getElementById("input-submit"),
  restartButton: document.getElementById("restart-button"),
  budget: document.getElementById("budget-stat"),
  coverage: document.getElementById("coverage-stat"),
  encryption: document.getElementById("encryption-stat"),
  supplies: document.getElementById("supplies-stat"),
  hours: document.getElementById("hours-stat"),
  hardware: document.getElementById("hardware-stat"),
  nodes: document.getElementById("nodes-stat"),
  builderBadge: document.getElementById("builder-badge"),
  workbenchPanel: document.getElementById("workbench-panel"),
  workbenchSections: document.getElementById("workbench-sections"),
  workbenchBudgetHint: document.getElementById("workbench-budget-hint"),
  workbenchTotalLine: document.getElementById("workbench-total-line"),
  workbenchConfirm: document.getElementById("workbench-confirm"),
  themeToggle: document.getElementById("theme-toggle"),
  downloadLogButton: document.getElementById("download-log-button"),
  bootScreen: document.getElementById("boot-screen"),
};

const typingDelay = 22;
const pauseBetweenLines = 220;
const bootLineRevealDelay = 420;
const bootExitDelay = 1100;
const themeStorageKey = "project-intermesh-theme";
let currentRunToken = 0;
let currentMapIndex = 0;
let activeCursorRow = null;

function t(key, vars) {
  return window.GameStrings.t(key, vars);
}

function createInitialState() {
  const locationStatuses = {};
  const pendingNote = t("initial_location_note");

  locationDefinitions.forEach((location) => {
    locationStatuses[location.key] = {
      status: "pending",
      note: pendingNote,
      resolved: false,
    };
  });

  return {
    builderName: "UNASSIGNED",
    budget: 340,
    coverage: 0,
    encryption: false,
    securityConfigured: false,
    supplies: 0,
    nodesDeployed: [],
    nodesAvailable: 0,
    nodesPurchased: 0,
    hardware: null,
    nodeCost: 0,
    linkQuality: 0,
    stableFirmware: true,
    validBand: true,
    validPreset: true,
    deadZones: false,
    valleyWeak: false,
    healthWeak: false,
    scienceRoof: false,
    scienceMissed: false,
    solarSupport: false,
    yoshikoDrive: false,
    batteryFragile: false,
    hoursRemaining: 84,
    weatherproofCases: 0,
    solarPanels: 0,
    catCarrier: false,
    locationStatuses,
  };
}

let state = null;

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function setActiveCursor(row) {
  if (activeCursorRow && activeCursorRow !== row) {
    activeCursorRow.classList.remove("typing");
  }

  activeCursorRow = row || null;

  if (activeCursorRow) {
    activeCursorRow.classList.add("typing");
  }
}

function clearChoices() {
  dom.choicePanel.innerHTML = "";
}

function bindButtonChoice(button, onPick) {
  button.addEventListener("click", () => {
    if (button.disabled) {
      return;
    }

    hideInput();
    onPick();
  });
}

function clearTerminal() {
  setActiveCursor(null);
  dom.terminal.innerHTML = "";
}

function showInput(label, placeholder = "") {
  dom.inputZone.classList.remove("hidden");
  dom.inputLabel.textContent = label;
  dom.input.placeholder = placeholder;
  dom.input.value = "";
  dom.input.focus();
}

function hideInput() {
  dom.inputZone.classList.add("hidden");
  dom.input.value = "";
}

function appendLineElement(className = "") {
  const row = document.createElement("p");
  row.className = `terminal-line ${className}`.trim();
  dom.terminal.appendChild(row);
  dom.terminal.scrollTop = dom.terminal.scrollHeight;
  return row;
}

async function typeLine(text, className = "", runToken = currentRunToken) {
  if (runToken !== currentRunToken) {
    return;
  }

  const row = appendLineElement(className);
  setActiveCursor(row);

  for (let index = 0; index < text.length; index += 1) {
    if (runToken !== currentRunToken) {
      setActiveCursor(null);
      return;
    }

    row.textContent += text[index];
    dom.terminal.scrollTop = dom.terminal.scrollHeight;
    await wait(typingDelay);
  }

  setActiveCursor(null);
  await wait(pauseBetweenLines);
}

async function typeBlock(lines, className = "", runToken = currentRunToken) {
  for (const line of lines) {
    await typeLine(line, className, runToken);
  }
}

function updateStats() {
  dom.budget.textContent = `$${state.budget}`;
  dom.coverage.textContent = `${Math.max(0, state.coverage)}%`;
  dom.encryption.textContent = !state.securityConfigured
    ? t("ui.encryption_off")
    : state.encryption
    ? t("ui.encryption_secure")
    : t("ui.encryption_public");
  dom.supplies.textContent = String(state.supplies);
  dom.hours.textContent = `${state.hoursRemaining}H`;
  dom.hardware.textContent = state.hardware || t("ui.hardware_unselected");
  dom.nodes.textContent = `${state.nodesDeployed.length} / ${state.nodesPurchased}`;
  dom.builderBadge.textContent = t("ui.builder_badge", {
    name: state.builderName,
    hours: state.hoursRemaining,
  });
}

function applyTheme(theme) {
  const nextTheme = theme === "amber" ? "amber" : "green";
  document.body.dataset.theme = nextTheme;
  dom.themeToggle.textContent = t("ui.theme_label", {
    mode: nextTheme.toUpperCase(),
  });
  window.localStorage.setItem(themeStorageKey, nextTheme);
}

function toggleTheme() {
  const currentTheme = document.body.dataset.theme === "amber" ? "amber" : "green";
  applyTheme(currentTheme === "green" ? "amber" : "green");
}

function initializeTheme() {
  const storedTheme = window.localStorage.getItem(themeStorageKey);
  applyTheme(storedTheme === "amber" ? "amber" : "green");
}

async function playBootSequence(runToken) {
  if (runToken !== currentRunToken) {
    return;
  }

  dom.bootScreen.classList.add("boot-screen--visible");
  dom.bootScreen.setAttribute("aria-hidden", "false");

  const lines = Array.from(dom.bootScreen.querySelectorAll(".boot-screen__line"));
  lines.forEach((line) => {
    line.classList.remove("is-visible");
  });

  for (const line of lines) {
    if (runToken !== currentRunToken) {
      return;
    }

    line.classList.add("is-visible");
    await wait(bootLineRevealDelay);
  }

  await wait(bootExitDelay);

  if (runToken !== currentRunToken) {
    return;
  }

  dom.bootScreen.classList.remove("boot-screen--visible");
  dom.bootScreen.setAttribute("aria-hidden", "true");
}

function refreshUi() {
  updateStats();
}

function changeBudget(amount) {
  state.budget += amount;
  refreshUi();
}

function addCoverage(baseValue) {
  const adjusted = Math.max(1, baseValue + state.linkQuality);
  state.coverage = Math.max(0, state.coverage + adjusted);
  refreshUi();
  return adjusted;
}

function addSupplies(count) {
  state.supplies += count;
  refreshUi();
}

function setLocation(key, status, note) {
  state.locationStatuses[key] = {
    ...state.locationStatuses[key],
    status,
    note,
    resolved: true,
  };
  refreshUi();
}

function addNode(locationKey, note) {
  const location = locationDefinitions.find((entry) => entry.key === locationKey);
  state.nodesDeployed.push({
    location: location.title,
    hardware: state.hardware,
    note,
  });
  state.nodesAvailable = Math.max(0, state.nodesAvailable - 1);
  refreshUi();
}

function spendTime(hours) {
  state.hoursRemaining = Math.max(0, state.hoursRemaining - hours);
  refreshUi();
}

function hasNodeAvailable() {
  return state.nodesAvailable > 0;
}

async function applyTravelIfNeeded(locationKey, runToken) {
  const location = locationDefinitions.find((entry) => entry.key === locationKey);
  if (!location || !location.outsideTown) {
    return true;
  }

  if (state.yoshikoDrive) {
    await typeLine(t("travel.free_ride", { title: location.title }), "success", runToken);
    return true;
  }

  const travelChoice = await promptChoice(
    [t("travel.prompt", { title: location.title })],
    [
      {
        value: "ride",
        label: t("travel.ride_label"),
        description: t("travel.ride_description"),
        cost: 10,
      },
      {
        value: "walk",
        label: t("travel.walk_label"),
        description: t("travel.walk_description"),
        meta: t("travel.walk_meta"),
      },
    ]
  );

  if (travelChoice === "ride") {
    if (state.budget < 10) {
      await typeLine(t("travel.insufficient_cash"), "warn", runToken);
      spendTime(6);
      return true;
    }
    changeBudget(-10);
    await typeLine(t("travel.ride_taken", { title: location.title }), "system", runToken);
    return true;
  }

  spendTime(6);
  await typeLine(t("travel.walked", { title: location.title }), "warn", runToken);
  return true;
}

function createChoiceButton(option, resolve) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "choice-card";

  const costText = Number.isFinite(option.cost)
    ? t("choice_button.cost_format", { amount: option.cost })
    : option.meta || t("choice_button.cost_default");
  button.innerHTML = `
    <strong>${option.label}</strong>
    <span>${option.description}</span>
    <small>${costText}</small>
  `;

  const disabled = Boolean(option.disabled) || (Number.isFinite(option.cost) && state.budget < option.cost);
  if (disabled) {
    button.disabled = true;
    if (state.budget < option.cost) {
      button.querySelector("small").textContent = t("choice_button.insufficient_suffix", { costText });
    }
  }

  bindButtonChoice(button, () => resolve(option.value));

  dom.choicePanel.appendChild(button);
}

async function promptChoice(promptLines, options) {
  await typeBlock(Array.isArray(promptLines) ? promptLines : [promptLines], "prompt");

  return new Promise((resolve) => {
    clearChoices();
    options.forEach((option) => createChoiceButton(option, resolve));
  });
}

async function promptTextInput(label, placeholder) {
  await typeLine(label, "prompt");
  showInput(label, placeholder);

  return new Promise((resolve) => {
    const submit = () => {
      const value = dom.input.value.trim();
      if (!value) {
        dom.input.focus();
        return;
      }

      dom.inputSubmit.removeEventListener("click", submit);
      dom.input.removeEventListener("keydown", onKeyDown);
      hideInput();
      resolve(value.toUpperCase());
    };

    const onKeyDown = (event) => {
      if (event.key === "Enter") {
        submit();
      }
    };

    dom.inputSubmit.addEventListener("click", submit);
    dom.input.addEventListener("keydown", onKeyDown);
  });
}

async function introSequence(runToken) {
  await typeBlock(t("intro.prologue"), "system", runToken);

  state.builderName = await promptTextInput(
    t("intro.name_prompt"),
    t("intro.name_placeholder")
  );
  refreshUi();

  await typeBlock(t("intro.post_name", { name: state.builderName }), "system", runToken);
}

function getNodeCostForHardware(hw) {
  if (hw === "heltec") return 30;
  if (hw === "tbeam") return 40;
  if (hw === "rak") return 50;
  return 0;
}

const CASE_UNIT_COST = 40;
const SOLAR_UNIT_COST = 40;
const CAT_CARRIER_COST = 50;

function getAddOnCost(draft) {
  const cases = draft.cases || 0;
  const solar = draft.solar || 0;
  const carrier = draft.catCarrier === "yes" ? CAT_CARRIER_COST : 0;
  return cases * CASE_UNIT_COST + solar * SOLAR_UNIT_COST + carrier;
}

function workbenchFirmwareCost(firmware) {
  return firmware === "stable" ? 10 : 0;
}

function workbenchCartTotal(draft) {
  const nc = getNodeCostForHardware(draft.hardware);
  const nodes = draft.nodes != null ? draft.nodes : 0;
  return nodes * nc + getAddOnCost(draft) + workbenchFirmwareCost(draft.firmware);
}

function workbenchMaxNodes(draft, budgetStart) {
  const nc = getNodeCostForHardware(draft.hardware);
  if (!nc) return 0;
  const reserved = getAddOnCost(draft) + workbenchFirmwareCost(draft.firmware);
  const left = budgetStart - reserved;
  if (left < nc) return 0;
  return Math.min(6, Math.floor(left / nc));
}

function clampWorkbenchNodes(draft, budgetStart) {
  const maxN = workbenchMaxNodes(draft, budgetStart);
  if (draft.nodes != null && draft.nodes > maxN) {
    draft.nodes = null;
  }
}

function closeWorkbenchPanel() {
  dom.workbenchPanel.classList.add("hidden");
  dom.workbenchPanel.setAttribute("aria-hidden", "true");
  dom.workbenchSections.replaceChildren();
  dom.workbenchConfirm.disabled = true;
  dom.workbenchConfirm.onclick = null;
}

function workbenchAddRow(container, title, options, onPick, selectedValue) {
  const section = document.createElement("div");
  section.className = "workbench-section";
  const h = document.createElement("h3");
  h.className = "workbench-section-title";
  h.textContent = title;
  section.appendChild(h);
  const row = document.createElement("div");
  row.className = "workbench-row";

  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-card workbench-option";
    btn.disabled = Boolean(opt.disabled);
    const small = opt.meta != null && opt.meta !== "" ? `<small>${opt.meta}</small>` : "";
    btn.innerHTML = `<strong>${opt.label}</strong><span>${opt.description}</span>${small}`;
    if (selectedValue === opt.value) {
      btn.classList.add("workbench-selected");
    }
    bindButtonChoice(btn, () => onPick(opt.value));
    row.appendChild(btn);
  });

  section.appendChild(row);
  container.appendChild(section);
}

function syncWorkbenchFooter(draft, budgetStart) {
  const total = workbenchCartTotal(draft);
  const required = Boolean(draft.hardware && draft.nodes != null && draft.firmware);
  const over = total > budgetStart;
  if (required && !over) {
    dom.workbenchTotalLine.textContent = t("act1.total_ready", {
      total,
      remaining: budgetStart - total,
    });
  } else if (over && required) {
    dom.workbenchTotalLine.textContent = t("act1.total_over", {
      total,
      delta: total - budgetStart,
    });
  } else {
    dom.workbenchTotalLine.textContent = t("act1.total_pending", { total });
  }
  dom.workbenchConfirm.disabled = !required || over;
}

function renderWorkbenchCheckout(draft, budgetStart) {
  clampWorkbenchNodes(draft, budgetStart);
  dom.workbenchSections.replaceChildren();
  const maxN = workbenchMaxNodes(draft, budgetStart);

  const rerender = () => {
    renderWorkbenchCheckout(draft, budgetStart);
    syncWorkbenchFooter(draft, budgetStart);
  };

  const toggle = (field, value) => {
    draft[field] = draft[field] === value ? null : value;
    rerender();
  };

  workbenchAddRow(
    dom.workbenchSections,
    t("workbench_rows.hardware_title"),
    [
      {
        value: "heltec",
        label: t("workbench_rows.hardware_heltec_label"),
        description: "",
        meta: t("workbench_rows.hardware_heltec_meta"),
      },
      {
        value: "tbeam",
        label: t("workbench_rows.hardware_tbeam_label"),
        description: "",
        meta: t("workbench_rows.hardware_tbeam_meta"),
      },
      {
        value: "rak",
        label: t("workbench_rows.hardware_rak_label"),
        description: "",
        meta: t("workbench_rows.hardware_rak_meta"),
      },
    ],
    (value) => {
      draft.hardware = value;
      rerender();
    },
    draft.hardware
  );

  const nodeOptions = [];
  for (let n = 1; n <= 6; n += 1) {
    const nc = getNodeCostForHardware(draft.hardware);
    const nodeLineCost = n * nc;
    const labelKey = n === 1 ? "workbench_rows.nodes_label_singular" : "workbench_rows.nodes_label_plural";
    nodeOptions.push({
      value: n,
      label: t(labelKey, { n }),
      description: "",
      meta: nc ? `$${nodeLineCost}` : "",
      disabled: !draft.hardware || n > maxN,
    });
  }
  workbenchAddRow(
    dom.workbenchSections,
    t("workbench_rows.nodes_title"),
    nodeOptions,
    (value) => {
      draft.nodes = value;
      rerender();
    },
    draft.nodes
  );

  workbenchAddRow(
    dom.workbenchSections,
    t("workbench_rows.cases_title"),
    [
      {
        value: 1,
        label: t("workbench_rows.cases_one_label"),
        description: "",
        meta: `$${CASE_UNIT_COST}`,
      },
      {
        value: 2,
        label: t("workbench_rows.cases_two_label"),
        description: "",
        meta: `$${CASE_UNIT_COST * 2}`,
      },
    ],
    (value) => toggle("cases", value),
    draft.cases
  );

  workbenchAddRow(
    dom.workbenchSections,
    t("workbench_rows.solar_title"),
    [
      {
        value: 1,
        label: t("workbench_rows.solar_one_label"),
        description: "",
        meta: `$${SOLAR_UNIT_COST}`,
      },
      {
        value: 2,
        label: t("workbench_rows.solar_two_label"),
        description: "",
        meta: `$${SOLAR_UNIT_COST * 2}`,
      },
    ],
    (value) => toggle("solar", value),
    draft.solar
  );

  workbenchAddRow(
    dom.workbenchSections,
    t("workbench_rows.carrier_title"),
    [
      {
        value: "yes",
        label: t("workbench_rows.carrier_label"),
        description: "",
        meta: `$${CAT_CARRIER_COST}`,
      },
    ],
    (value) => toggle("catCarrier", value),
    draft.catCarrier
  );

  workbenchAddRow(
    dom.workbenchSections,
    t("workbench_rows.firmware_title"),
    [
      {
        value: "stable",
        label: t("workbench_rows.firmware_stable_label"),
        description: "",
        meta: t("workbench_rows.firmware_stable_meta"),
      },
      {
        value: "alpha",
        label: t("workbench_rows.firmware_alpha_label"),
        description: "",
        meta: t("workbench_rows.firmware_alpha_meta"),
      },
    ],
    (value) => {
      draft.firmware = value;
      rerender();
    },
    draft.firmware
  );
}

function applyWorkbenchSelections(selections) {
  if (selections.hardware === "heltec") {
    state.hardware = t("workbench_rows.hardware_heltec_label");
    state.nodeCost = 30;
  } else if (selections.hardware === "tbeam") {
    state.hardware = t("workbench_rows.hardware_tbeam_label");
    state.nodeCost = 40;
  } else {
    state.hardware = t("workbench_rows.hardware_rak_label");
    state.nodeCost = 50;
    state.linkQuality += 1;
  }

  state.nodesPurchased = selections.nodes;
  state.nodesAvailable = selections.nodes;

  state.weatherproofCases = selections.cases || 0;
  state.solarPanels = selections.solar || 0;
  state.catCarrier = selections.catCarrier === "yes";

  if (selections.firmware === "stable") {
    state.stableFirmware = true;
  } else {
    state.stableFirmware = false;
    state.batteryFragile = true;
    state.linkQuality -= 1;
  }

  state.validBand = true;
  state.validPreset = true;
  state.encryption = true;
  state.securityConfigured = true;

  const total =
    selections.nodes * state.nodeCost + getAddOnCost(selections) + workbenchFirmwareCost(selections.firmware);
  changeBudget(-total);
}

function runWorkbenchCheckout() {
  const budgetStart = state.budget;
  dom.workbenchBudgetHint.textContent = t("act1.budget_hint", { budget: budgetStart });
  dom.workbenchPanel.classList.remove("hidden");
  dom.workbenchPanel.setAttribute("aria-hidden", "false");

  const draft = {
    hardware: null,
    nodes: null,
    cases: null,
    solar: null,
    catCarrier: null,
    firmware: null,
  };

  return new Promise((resolve) => {
    renderWorkbenchCheckout(draft, budgetStart);
    syncWorkbenchFooter(draft, budgetStart);

    dom.workbenchConfirm.onclick = () => {
      if (dom.workbenchConfirm.disabled) return;
      closeWorkbenchPanel();
      resolve({ ...draft });
    };
  });
}

async function actWorkbench(runToken) {
  clearTerminal();
  await typeBlock(t("act1.intro"), "system", runToken);

  const selections = await runWorkbenchCheckout();
  const budgetBefore = state.budget;
  applyWorkbenchSelections(selections);
  if (window.IntermeshAnalytics) {
    window.IntermeshAnalytics.workbenchCommitted(selections, budgetBefore - state.budget, state.budget);
  }

  const cases = selections.cases || 0;
  const solar = selections.solar || 0;
  const extras = [];
  if (cases > 0) {
    const key = cases === 1 ? "act1.extras_case_singular" : "act1.extras_case_plural";
    extras.push(t(key, { count: cases }));
  }
  if (solar > 0) {
    const key = solar === 1 ? "act1.extras_solar_singular" : "act1.extras_solar_plural";
    extras.push(t(key, { count: solar }));
  }
  if (selections.catCarrier === "yes") extras.push(t("act1.extras_cat_carrier"));
  const extrasLine = extras.length
    ? t("act1.extras_line", { items: extras.join(", ") })
    : t("act1.extras_none");

  await typeBlock(
    [
      t("act1.build_locked", {
        hardware: state.hardware,
        nodes: selections.nodes,
        s: selections.nodes === 1 ? "" : "s",
      }),
      extrasLine,
      selections.firmware === "stable"
        ? t("act1.firmware_recap_stable")
        : t("act1.firmware_recap_alpha"),
      t("act1.cash_after", { budget: state.budget }),
    ],
    "success",
    runToken
  );
}

async function deployScience(runToken) {
  if (!hasNodeAvailable()) {
    setLocation("science", "skipped", t("locations.science.no_nodes_status"));
    await typeLine(t("locations.science.no_nodes_line"), "alert", runToken);
    return;
  }
  await typeBlock(t("locations.science.intro"), "system", runToken);

  const ready = state.weatherproofCases >= 1 && state.solarPanels >= 1;
  const choice = await promptChoice(
    [t("locations.science.prompt")],
    [
      {
        value: "data",
        label: t("locations.science.choices.data_label"),
        description: t("locations.science.choices.data_description"),
        meta: ready
          ? t("locations.science.choices.data_meta_ready")
          : t("locations.science.choices.data_meta_locked"),
        disabled: !ready,
      },
      {
        value: "emotion",
        label: t("locations.science.choices.emotion_label"),
        description: t("locations.science.choices.emotion_description"),
        meta: t("locations.science.choices.emotion_meta"),
      },
      {
        value: "jargon",
        label: t("locations.science.choices.jargon_label"),
        description: t("locations.science.choices.jargon_description"),
        meta: t("locations.science.choices.jargon_meta"),
      },
      {
        value: "skip",
        label: t("locations.science.choices.skip_label"),
        description: t("locations.science.choices.skip_description"),
        meta: t("locations.science.choices.skip_meta"),
      },
    ]
  );

  if (choice === "skip") {
    state.scienceMissed = true;
    setLocation("science", "skipped", t("locations.science.skip_status"));
    await typeLine(t("locations.science.skip_line"), "alert", runToken);
    return;
  }

  if (choice === "data") {
    const gain = addCoverage(12);
    state.scienceRoof = true;
    state.weatherproofCases = Math.max(0, state.weatherproofCases - 1);
    state.solarPanels = Math.max(0, state.solarPanels - 1);
    addNode("science", t("locations.science.deploy_roof_node_note", { gain }));
    setLocation("science", "deployed", t("locations.science.deploy_roof_status"));
    await typeLine(t("locations.science.deploy_roof_line"), "success", runToken);
  } else {
    const gain = addCoverage(5);
    state.scienceRoof = false;
    addNode("science", t("locations.science.deploy_fallback_node_note", { gain }));
    setLocation("science", "weak", t("locations.science.deploy_fallback_status"));
    await typeLine(t("locations.science.deploy_fallback_line"), "warn", runToken);
  }
}

async function deployValley(runToken) {
  if (!hasNodeAvailable()) {
    setLocation("valley", "skipped", t("locations.valley.no_nodes_status"));
    await typeLine(t("locations.valley.no_nodes_line"), "alert", runToken);
    return;
  }
  await typeBlock(t("locations.valley.intro"), "system", runToken);

  const basicCost = 0;
  const highGainCost = 20;
  const solarCost = 25;
  const choice = await promptChoice(
    [t("locations.valley.prompt")],
    [
      {
        value: "basic",
        label: t("locations.valley.choices.basic_label"),
        description: t("locations.valley.choices.basic_description"),
        meta: t("locations.valley.choices.basic_meta"),
      },
      {
        value: "highgain",
        label: t("locations.valley.choices.highgain_label"),
        description: t("locations.valley.choices.highgain_description"),
        cost: highGainCost,
      },
      {
        value: "solar",
        label: t("locations.valley.choices.solar_label"),
        description: t("locations.valley.choices.solar_description"),
        cost: solarCost,
      },
      {
        value: "skip",
        label: t("locations.valley.choices.skip_label"),
        description: t("locations.valley.choices.skip_description"),
        meta: t("locations.valley.choices.skip_meta"),
      },
    ]
  );

  if (choice === "skip") {
    setLocation("valley", "skipped", t("locations.valley.skip_status"));
    await typeLine(t("locations.valley.skip_line"), "warn", runToken);
    return;
  }

  if (choice === "basic") {
    changeBudget(-basicCost);
    const gain = addCoverage(4);
    addSupplies(1);
    state.deadZones = true;
    state.valleyWeak = true;
    addNode("valley", t("locations.valley.basic_node_note", { gain }));
    setLocation("valley", "weak", t("locations.valley.basic_status"));
    await typeLine(t("locations.valley.basic_line"), "warn", runToken);
    return;
  }

  if (choice === "highgain") {
    changeBudget(-highGainCost);
    const gain = addCoverage(8);
    addSupplies(1);
    addNode("valley", t("locations.valley.highgain_node_note", { gain }));
    setLocation("valley", "deployed", t("locations.valley.highgain_status"));
    await typeLine(t("locations.valley.highgain_line"), "success", runToken);
    return;
  }

  changeBudget(-solarCost);
  const gain = addCoverage(10);
  addSupplies(1);
  state.solarSupport = true;
  addNode("valley", t("locations.valley.solar_node_note", { gain }));
  setLocation("valley", "deployed", t("locations.valley.solar_status"));
  await typeLine(t("locations.valley.solar_line"), "success", runToken);
}

async function deploySugar(runToken) {
  if (!hasNodeAvailable()) {
    setLocation("sugar", "skipped", t("locations.sugar.no_nodes_status"));
    await typeLine(t("locations.sugar.no_nodes_line"), "alert", runToken);
    return;
  }
  await typeBlock(t("locations.sugar.intro"), "system", runToken);

  const choice = await promptChoice(
    [t("locations.sugar.prompt")],
    [
      {
        value: "deploy",
        label: t("locations.sugar.choices.deploy_label"),
        description: t("locations.sugar.choices.deploy_description"),
        meta: t("locations.sugar.choices.deploy_meta"),
      },
      {
        value: "skip",
        label: t("locations.sugar.choices.skip_label"),
        description: t("locations.sugar.choices.skip_description"),
        meta: t("locations.sugar.choices.skip_meta"),
      },
    ]
  );

  if (choice === "skip") {
    setLocation("sugar", "skipped", t("locations.sugar.skip_status"));
    await typeLine(t("locations.sugar.skip_line"), "warn", runToken);
    return;
  }

  const gain = addCoverage(5);
  addSupplies(1);
  state.yoshikoDrive = true;
  addNode("sugar", t("locations.sugar.deploy_node_note", { gain }));
  setLocation("sugar", "deployed", t("locations.sugar.deploy_status"));
  await typeLine(t("locations.sugar.deploy_line"), "success", runToken);
}

async function deployApartments(runToken) {
  if (!hasNodeAvailable()) {
    setLocation("apartments", "skipped", t("locations.apartments.no_nodes_status"));
    await typeLine(t("locations.apartments.no_nodes_line"), "alert", runToken);
    return;
  }
  await typeBlock(t("locations.apartments.intro"), "system", runToken);

  const choice = await promptChoice(
    [t("locations.apartments.prompt")],
    [
      {
        value: "deploy",
        label: t("locations.apartments.choices.deploy_label"),
        description: t("locations.apartments.choices.deploy_description"),
        meta: t("locations.apartments.choices.deploy_meta"),
      },
      {
        value: "skip",
        label: t("locations.apartments.choices.skip_label"),
        description: t("locations.apartments.choices.skip_description"),
        meta: t("locations.apartments.choices.skip_meta"),
      },
    ]
  );

  if (choice === "skip") {
    setLocation("apartments", "skipped", t("locations.apartments.skip_status"));
    await typeLine(t("locations.apartments.skip_line"), "warn", runToken);
    return;
  }

  const gain = addCoverage(5);
  addSupplies(3);
  addNode("apartments", t("locations.apartments.deploy_node_note", { gain }));
  setLocation("apartments", "deployed", t("locations.apartments.deploy_status"));
  await typeLine(t("locations.apartments.deploy_line"), "success", runToken);
}

async function deployRadio(runToken) {
  if (!hasNodeAvailable()) {
    setLocation("radio", "skipped", t("locations.radio.no_nodes_status"));
    await typeLine(t("locations.radio.no_nodes_line"), "alert", runToken);
    return;
  }
  await typeBlock(t("locations.radio.intro"), "system", runToken);

  const ready = state.weatherproofCases >= 1 && state.solarPanels >= 1;
  const choice = await promptChoice(
    [t("locations.radio.prompt")],
    [
      {
        value: "tower",
        label: t("locations.radio.choices.tower_label"),
        description: t("locations.radio.choices.tower_description"),
        meta: ready
          ? t("locations.radio.choices.tower_meta_ready")
          : t("locations.radio.choices.tower_meta_locked"),
        disabled: !ready,
      },
      {
        value: "lobby",
        label: t("locations.radio.choices.lobby_label"),
        description: t("locations.radio.choices.lobby_description"),
        meta: t("locations.radio.choices.lobby_meta"),
      },
      {
        value: "skip",
        label: t("locations.radio.choices.skip_label"),
        description: t("locations.radio.choices.skip_description"),
        meta: t("locations.radio.choices.skip_meta"),
      },
    ]
  );

  if (choice === "skip") {
    setLocation("radio", "skipped", t("locations.radio.skip_status"));
    await typeLine(t("locations.radio.skip_line"), "warn", runToken);
    return;
  }

  if (choice === "tower") {
    spendTime(4);
    const gain = addCoverage(7);
    state.weatherproofCases = Math.max(0, state.weatherproofCases - 1);
    state.solarPanels = Math.max(0, state.solarPanels - 1);
    addNode("radio", t("locations.radio.tower_node_note", { gain }));
    setLocation("radio", "deployed", t("locations.radio.tower_status"));
    await typeLine(t("locations.radio.tower_line"), "success", runToken);
    return;
  }

  const gain = addCoverage(4);
  addNode("radio", t("locations.radio.lobby_node_note", { gain }));
  setLocation("radio", "weak", t("locations.radio.lobby_status"));
  await typeLine(t("locations.radio.lobby_line"), "warn", runToken);
}

async function deployHealth(runToken) {
  if (!hasNodeAvailable()) {
    setLocation("health", "skipped", t("locations.health.no_nodes_status"));
    await typeLine(t("locations.health.no_nodes_line"), "alert", runToken);
    return;
  }
  await typeBlock(t("locations.health.intro"), "system", runToken);

  const basicCost = 0;
  const highGainCost = 20;
  const choice = await promptChoice(
    [t("locations.health.prompt")],
    [
      {
        value: "basic",
        label: t("locations.health.choices.basic_label"),
        description: t("locations.health.choices.basic_description"),
        meta: t("locations.health.choices.basic_meta"),
      },
      {
        value: "highgain",
        label: t("locations.health.choices.highgain_label"),
        description: t("locations.health.choices.highgain_description"),
        cost: highGainCost,
      },
      {
        value: "skip",
        label: t("locations.health.choices.skip_label"),
        description: t("locations.health.choices.skip_description"),
        meta: t("locations.health.choices.skip_meta"),
      },
    ]
  );

  if (choice === "skip") {
    setLocation("health", "skipped", t("locations.health.skip_status"));
    await typeLine(t("locations.health.skip_line"), "warn", runToken);
    return;
  }

  if (choice === "basic") {
    changeBudget(-basicCost);
    const gain = addCoverage(4);
    state.deadZones = true;
    state.healthWeak = true;
    addNode("health", t("locations.health.basic_node_note", { gain }));
    setLocation("health", "weak", t("locations.health.basic_status"));
    await typeLine(t("locations.health.basic_line"), "warn", runToken);
    return;
  }

  changeBudget(-highGainCost);
  const gain = addCoverage(8);
  addNode("health", t("locations.health.highgain_node_note", { gain }));
  setLocation("health", "deployed", t("locations.health.highgain_status"));
  await typeLine(t("locations.health.highgain_line"), "success", runToken);
}

async function actDeployment(runToken) {
  clearTerminal();
  await typeBlock(t("act2.intro"), "system", runToken);

  const handlers = {
    science: deployScience,
    valley: deployValley,
    sugar: deploySugar,
    apartments: deployApartments,
    radio: deployRadio,
    health: deployHealth,
  };

  let deploying = true;

  while (deploying) {
    const pendingLocations = locationDefinitions.filter((location) => !state.locationStatuses[location.key].resolved);

    if (!pendingLocations.length) {
      break;
    }

    const selected = await promptChoice(
      [t("act2.prompt")],
      [
        ...pendingLocations.map((location) => ({
          value: location.key,
          label: location.title,
          description: t("act2.location_description", {
            contact: location.contact,
            detail: location.detail,
          }),
          meta: location.elevation,
        })),
        {
          value: "finish",
          label: t("act2.finish_label"),
          description: t("act2.finish_description"),
          meta: t("act2.finish_meta"),
        },
      ]
    );

    if (selected === "finish") {
      deploying = false;
      await typeLine(t("act2.finish_line"), "system", runToken);
      break;
    }

    const before = {
      budget: state.budget,
      coverage: state.coverage,
      supplies: state.supplies,
      hours: state.hoursRemaining,
      nodesDeployed: state.nodesDeployed.length,
    };
    await applyTravelIfNeeded(selected, runToken);
    const travelBudgetDelta = state.budget - before.budget;
    const travelHoursDelta = before.hours - state.hoursRemaining;

    const handler = handlers[selected];
    await handler(runToken);

    if (window.IntermeshAnalytics) {
      const status = state.locationStatuses[selected];
      window.IntermeshAnalytics.locationResolved(selected, {
        outcome: status ? status.status : "unknown",
        coverage_delta: state.coverage - before.coverage,
        supplies_delta: state.supplies - before.supplies,
        budget_delta: state.budget - before.budget,
        hours_delta: before.hours - state.hoursRemaining,
        travel_budget_delta: travelBudgetDelta,
        travel_hours_delta: travelHoursDelta,
        node_consumed: state.nodesDeployed.length > before.nodesDeployed,
      });
    }
  }
}

async function actDiagnostics(runToken) {
  clearTerminal();
  await typeBlock(t("diagnostics.intro"), "system", runToken);

  const issues = [];

  if (state.valleyWeak) {
    issues.push(t("diagnostics.issue_valley"));
  }
  if (state.healthWeak) {
    issues.push(t("diagnostics.issue_health"));
  }

  if (issues.length) {
    state.deadZones = true;
    await typeBlock(issues, "warn", runToken);

    const patchChoice = await promptChoice(
      [t("diagnostics.patch_prompt")],
      [
        {
          value: "patch",
          label: t("diagnostics.patch_label"),
          description: t("diagnostics.patch_description"),
          cost: 40,
        },
        {
          value: "accept",
          label: t("diagnostics.accept_label"),
          description: t("diagnostics.accept_description"),
          meta: t("diagnostics.accept_meta"),
        },
      ]
    );

    if (patchChoice === "patch" && state.budget >= 40) {
      changeBudget(-40);
      state.deadZones = false;
      state.valleyWeak = false;
      state.healthWeak = false;
      const gain = addCoverage(6);
      if (state.locationStatuses.valley.status === "weak") {
        setLocation("valley", "deployed", t("diagnostics.valley_patched_status"));
      }
      if (state.locationStatuses.health.status === "weak") {
        setLocation("health", "deployed", t("diagnostics.health_patched_status"));
      }
      await typeLine(t("diagnostics.patched_line", { gain }), "success", runToken);
      if (window.IntermeshAnalytics) {
        window.IntermeshAnalytics.diagnosticTriggered({ issues, patched: true, coverage_delta: gain, budget_delta: -40 });
      }
    } else {
      await typeLine(t("diagnostics.unpatched_line"), "warn", runToken);
      if (window.IntermeshAnalytics) {
        window.IntermeshAnalytics.diagnosticTriggered({ issues, patched: false, coverage_delta: 0, budget_delta: 0 });
      }
    }
  } else {
    await typeLine(t("diagnostics.clean_line"), "success", runToken);
    if (window.IntermeshAnalytics) {
      window.IntermeshAnalytics.diagnosticTriggered({ issues: [], patched: false, coverage_delta: 0, budget_delta: 0 });
    }
  }

  if (!state.validBand) {
    await typeLine(t("diagnostics.band_warning"), "warn", runToken);
  }

  if (!state.validPreset) {
    await typeLine(t("diagnostics.preset_warning"), "warn", runToken);
  }

  await typeBlock(t("diagnostics.storm_alert"), "alert", runToken);
}

async function actMutualAid(runToken) {
  clearTerminal();
  await typeBlock(t("mutual_aid.intro"), "system", runToken);

  const choice = await promptChoice(
    [t("mutual_aid.prompt")],
    [
      {
        value: "grant",
        label: t("mutual_aid.grant_label"),
        description: t("mutual_aid.grant_description"),
        meta: t("mutual_aid.grant_meta"),
      },
      {
        value: "deny",
        label: t("mutual_aid.deny_label"),
        description: t("mutual_aid.deny_description"),
        meta: t("mutual_aid.deny_meta"),
      },
    ]
  );

  if (choice === "grant") {
    addSupplies(1);
    await typeLine(t("mutual_aid.grant_line"), "success", runToken);
  } else {
    await typeLine(t("mutual_aid.deny_line"), "warn", runToken);
  }
}

function determineEnding() {
  const coverage = state.coverage;
  const lowCoverage = coverage < 20;
  const supplyShortage = state.supplies < 2;
  const configFailure = !state.validBand || !state.validPreset || !state.stableFirmware;
  const coverageStrong = coverage >= 35;
  const scienceReady = state.scienceRoof && !state.scienceMissed;

  if (coverageStrong && state.encryption && state.supplies > 0 && !state.deadZones && scienceReady) {
    const bodyKey = state.solarSupport ? "endings.A.body_with_solar" : "endings.A.body_without_solar";
    return {
      className: "success",
      letter: "A",
      lines: [
        t("endings.A.title"),
        ...t(bodyKey, { nodes: state.nodesDeployed.length }),
      ],
    };
  }

  if (state.encryption && coverage >= 22 && (state.deadZones || !scienceReady || !state.validBand || !state.validPreset)) {
    return {
      className: "warn",
      letter: "B",
      lines: [t("endings.B_fractured.title"), ...t("endings.B_fractured.body")],
    };
  }

  if (!state.encryption && coverage >= 22) {
    return {
      className: "warn",
      letter: "C",
      lines: [t("endings.C.title"), ...t("endings.C.body")],
    };
  }

  if (lowCoverage && supplyShortage && (state.batteryFragile || configFailure || !state.solarSupport)) {
    return {
      className: "alert",
      letter: "D",
      lines: [t("endings.D.title"), ...t("endings.D.body")],
    };
  }

  return {
    className: "warn",
    letter: "B",
    lines: [t("endings.B_fallback.title"), ...t("endings.B_fallback.body")],
  };
}

async function showEnding(runToken) {
  clearTerminal();
  const ending = determineEnding();

  if (window.IntermeshAnalytics) {
    window.IntermeshAnalytics.runEnded({
      ending: ending.letter || "unknown",
      coverage: state.coverage,
      budget_left: state.budget,
      hours_left: state.hoursRemaining,
      supplies: state.supplies,
      encryption: state.encryption,
      security_configured: state.securityConfigured,
      hardware: state.hardware,
      nodes_purchased: state.nodesPurchased,
      nodes_used: state.nodesDeployed.length,
      valid_band: state.validBand,
      valid_preset: state.validPreset,
      stable_firmware: state.stableFirmware,
      dead_zones: state.deadZones,
      science_roof: state.scienceRoof,
      science_missed: state.scienceMissed,
      solar_support: state.solarSupport,
      battery_fragile: state.batteryFragile,
    });
  }

  await typeBlock(ending.lines, ending.className, runToken);
  await typeLine(
    t("endings.final_stats", {
      budget: state.budget,
      coverage: state.coverage,
      encryption: state.encryption ? t("endings.encryption_on") : t("endings.encryption_off"),
      supplies: state.supplies,
    }),
    ending.className,
    runToken
  );

  clearChoices();
  const restartButton = document.createElement("button");
  restartButton.type = "button";
  restartButton.className = "choice-card";
  restartButton.innerHTML = `
    <strong>${t("endings.replay_label")}</strong>
    <span>${t("endings.replay_description")}</span>
    <small>${t("endings.replay_meta")}</small>
  `;
  restartButton.addEventListener("click", () => {
    startGame();
  });
  dom.choicePanel.appendChild(restartButton);
}

async function runGame(runToken) {
  await introSequence(runToken);
  await actWorkbench(runToken);
  await actDeployment(runToken);
  await actDiagnostics(runToken);
  await actMutualAid(runToken);
  await showEnding(runToken);
}

function resetState() {
  state = createInitialState();
  currentMapIndex = 0;
  setActiveCursor(null);
  dom.terminal.innerHTML = "";
  clearChoices();
  hideInput();
  closeWorkbenchPanel();
  refreshUi();
}

function downloadRunLog() {
  if (!window.IntermeshAnalytics) return;
  const payload = window.IntermeshAnalytics.exportRunsAsJson();
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `intermesh-runs-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bindControls() {
  dom.restartButton.addEventListener("click", () => {
    startGame();
  });

  dom.themeToggle.addEventListener("click", () => {
    toggleTheme();
  });

  if (dom.downloadLogButton) {
    dom.downloadLogButton.addEventListener("click", () => {
      downloadRunLog();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) {
      return;
    }

    const target = event.target;
    const editingInput =
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

    if (editingInput) {
      return;
    }

    if (event.key === "Enter" && !dom.workbenchConfirm.disabled && !dom.workbenchPanel.classList.contains("hidden")) {
      dom.workbenchConfirm.click();
    }
  });
}

async function startGame() {
  currentRunToken += 1;
  const runToken = currentRunToken;
  resetState();
  if (window.IntermeshAnalytics) {
    window.IntermeshAnalytics.runStarted({
      starting_budget: state.budget,
      starting_hours: state.hoursRemaining,
      theme: document.body.dataset.theme || "green",
    });
  }
  await playBootSequence(runToken);

  await runGame(runToken);
}

async function boot() {
  try {
    await window.GameStrings.load();
  } catch (err) {
    console.error(err);
    document.body.innerHTML =
      '<div style="padding:2rem;font-family:monospace;color:#f55;">' +
      "Project Intermesh failed to load game text. " +
      "Serve the project over HTTP (for example: <code>python -m http.server</code>) " +
      "rather than opening index.html directly." +
      "</div>";
    return;
  }

  hydrateLocationDefinitions();
  window.GameStrings.applyStaticStrings();

  bindControls();
  initializeTheme();
  state = createInitialState();
  refreshUi();
  startGame();
}

boot();
