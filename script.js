const locationDefinitions = [
  {
    key: "science",
    title: "Campus Science Building",
    contact: "Dr. Ansari",
    elevation: "Maximum elevation",
    detail: "Critical line-of-sight point inside town.",
    outsideTown: false,
  },
  {
    key: "valley",
    title: "Valley West",
    contact: "Luz and Diego",
    elevation: "Low elevation",
    detail: "Residential area surrounded by signal-killing hills.",
    outsideTown: true,
  },
  {
    key: "sugar",
    title: "International Grocery",
    contact: "Yoshiko",
    elevation: "Medium elevation",
    detail: "Classmate with a hatchback and a full gas tank.",
    outsideTown: false,
  },
  {
    key: "apartments",
    title: "Tesseract Apartments",
    contact: "Dalia",
    elevation: "Medium elevation",
    detail: "Community garden rooftop and student households.",
    outsideTown: false,
  },
  {
    key: "radio",
    title: "Radio Station",
    contact: "Geo",
    elevation: "Medium elevation",
    detail: "Strong reach if you are willing to climb the tower.",
    outsideTown: false,
  },
  {
    key: "health",
    title: "Women's Health Clinic",
    contact: "Yasmin",
    elevation: "Medium elevation",
    detail: "Dense trees force a cleaner antenna setup.",
    outsideTown: true,
  },
];

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
  mapGrid: document.getElementById("map-grid"),
  mapSummary: document.getElementById("map-summary"),
  mapPrev: document.getElementById("map-prev"),
  mapNext: document.getElementById("map-next"),
  nodeList: document.getElementById("node-list"),
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
const hotkeyLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let currentRunToken = 0;
let currentMapIndex = 0;
let activeCursorRow = null;
let activeHotkeys = new Map();

function createInitialState() {
  const locationStatuses = {};

  locationDefinitions.forEach((location) => {
    locationStatuses[location.key] = {
      status: "pending",
      note: "No deployment logged yet.",
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
    weatherproofCase: false,
    solarPanel: false,
    locationStatuses,
  };
}

let state = createInitialState();

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
  clearActiveHotkeys();
  dom.choicePanel.innerHTML = "";
}

function clearActiveHotkeys() {
  activeHotkeys.forEach((button) => {
    button.classList.remove("is-hotkey-focus");
  });
  activeHotkeys = new Map();
}

function assignHotkey(button, index) {
  const hotkey = hotkeyLetters[index];
  if (!hotkey) {
    button.dataset.hotkey = "";
    return;
  }

  button.dataset.hotkey = `[${hotkey}]`;

  if (!button.disabled) {
    activeHotkeys.set(hotkey.toLowerCase(), button);
  }
}

function bindButtonChoice(button, onPick) {
  button.addEventListener("click", () => {
    if (button.disabled) {
      return;
    }

    clearActiveHotkeys();
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
  dom.encryption.textContent = !state.securityConfigured ? "OFF" : state.encryption ? "AES-256" : "PUBLIC";
  dom.supplies.textContent = String(state.supplies);
  dom.hours.textContent = `${state.hoursRemaining}H`;
  dom.hardware.textContent = state.hardware || "Not selected";
  dom.nodes.textContent = `${state.nodesDeployed.length} / ${state.nodesPurchased}`;
  dom.builderBadge.textContent = `Builder: ${state.builderName} // T-${state.hoursRemaining}H`;
}

function applyTheme(theme) {
  const nextTheme = theme === "amber" ? "amber" : "green";
  document.body.dataset.theme = nextTheme;
  dom.themeToggle.textContent = `Theme: ${nextTheme.toUpperCase()}`;
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

function badgeClass(status) {
  if (status === "deployed") {
    return "active";
  }
  if (status === "skipped") {
    return "skipped";
  }
  if (status === "weak") {
    return "failed";
  }
  return "pending";
}

function renderMap() {
  dom.mapGrid.innerHTML = "";
  let resolvedCount = 0;

  locationDefinitions.forEach((location) => {
    const info = state.locationStatuses[location.key];
    if (info.resolved) {
      resolvedCount += 1;
    }
    const card = document.createElement("article");
    card.className = "map-card";
    card.innerHTML = `
      <h3>${location.title}</h3>
      <p>${location.contact} // ${location.elevation}<br />${location.detail}</p>
      <div class="badge-row">
        <span class="badge ${badgeClass(info.status)}">${info.status}</span>
      </div>
      <p>${info.note}</p>
    `;
    dom.mapGrid.appendChild(card);
  });

  dom.mapSummary.textContent = `${resolvedCount} / ${locationDefinitions.length} resolved`;
  dom.mapPrev.disabled = true;
  dom.mapNext.disabled = true;
}

function renderNodeLedger() {
  dom.nodeList.innerHTML = "";

  if (!state.nodesDeployed.length) {
    const empty = document.createElement("li");
    empty.textContent = "No nodes deployed yet.";
    dom.nodeList.appendChild(empty);
    return;
  }

  state.nodesDeployed.forEach((node) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${node.location}</strong><br />${node.hardware} // ${node.note}`;
    dom.nodeList.appendChild(item);
  });
}

function refreshUi() {
  updateStats();
  renderMap();
  renderNodeLedger();
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
    await typeLine(`Yoshiko gives you a free ride to ${location.title}. No travel fee charged.`, "success", runToken);
    return true;
  }

  const travelChoice = await promptChoice(
    [`Travel planning for ${location.title}: choose how to get there.`],
    [
      {
        value: "ride",
        label: "Pay for a ride",
        description: "Fast trip outside town for $10.",
        cost: 10,
      },
      {
        value: "walk",
        label: "Walk",
        description: "No money spent, but arrival is delayed.",
        meta: "Cost: $0 // Time: -6H",
      },
    ]
  );

  if (travelChoice === "ride") {
    if (state.budget < 10) {
      await typeLine("You do not have enough cash for a ride. You head out on foot instead.", "warn", runToken);
      spendTime(6);
      return true;
    }
    changeBudget(-10);
    await typeLine(`You pay $10 for a ride and reach ${location.title} quickly.`, "system", runToken);
    return true;
  }

  spendTime(6);
  await typeLine(`You walk to ${location.title}. Budget preserved, but the schedule slips by 6 hours.`, "warn", runToken);
  return true;
}

function createChoiceButton(option, resolve, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "choice-card";

  const costText = Number.isFinite(option.cost) ? `Cost: $${option.cost}` : option.meta || "Awaiting choice";
  button.innerHTML = `
    <strong>${option.label}</strong>
    <span>${option.description}</span>
    <small>${costText}</small>
  `;

  const disabled = Boolean(option.disabled) || (Number.isFinite(option.cost) && state.budget < option.cost);
  if (disabled) {
    button.disabled = true;
    if (state.budget < option.cost) {
      button.querySelector("small").textContent = `${costText} // insufficient budget`;
    }
  }

  assignHotkey(button, index);
  bindButtonChoice(button, () => resolve(option.value));

  dom.choicePanel.appendChild(button);
}

async function promptChoice(promptLines, options) {
  await typeBlock(Array.isArray(promptLines) ? promptLines : [promptLines], "prompt");

  return new Promise((resolve) => {
    clearChoices();
    options.forEach((option, index) => createChoiceButton(option, resolve, index));
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
  await typeBlock(
    [
      "Meshtastic is an open-source communication tool that lets small radios relay short messages from node to node.",
      "It runs over LoRa (Long Range), a low-power radio protocol built for modest data rates across long distances.",
      "Practical use: when internet or cell service fails, neighbors can still coordinate rides, food, medicine, and check-ins through a local mesh.",
      "BOOT SEQUENCE // RIDGECREST MUNICIPAL BACKCHANNEL",
      "NOAA BULLETIN: DERECHO STORM FRONT PROJECTED TO IMPACT IN 72 HOURS.",
      "Expected effects: grid collapse, cell congestion, road closures, multi-day outage.",
      "You are one student with a soldering iron, a terminal window, and $340 of precious cash.",
      "If the power dies, people will need a local mesh to coordinate rides, food, medicine, and shelter.",
    ],
    "system",
    runToken
  );

  state.builderName = await promptTextInput("Enter your name to begin Project Intermesh.", "Ziad");
  refreshUi();

  await typeBlock(
    [
      `${state.builderName} ready. Project Intermesh setup logged.`,
      "Main objective: deploy enough resilient Meshtastic nodes to keep people talking after the grid falls.",
      "Failure risks: low coverage, weak batteries, broken links, or an open channel that hostile listeners can exploit.",
    ],
    "system",
    runToken
  );
}

function getNodeCostForHardware(hw) {
  if (hw === "heltec") return 30;
  if (hw === "rak") return 50;
  return 0;
}

function getAddOnCost(addOn) {
  if (addOn === "both") return 80;
  if (addOn === "case" || addOn === "solar") return 40;
  return 0;
}

function workbenchFirmwareCost(firmware) {
  return firmware === "stable" ? 10 : 0;
}

function workbenchCartTotal(draft) {
  const nc = getNodeCostForHardware(draft.hardware);
  const nodes = draft.nodes != null ? draft.nodes : 0;
  return nodes * nc + getAddOnCost(draft.addOn) + workbenchFirmwareCost(draft.firmware);
}

function workbenchMaxNodes(draft, budgetStart) {
  const nc = getNodeCostForHardware(draft.hardware);
  if (!nc) return 0;
  const reserved = getAddOnCost(draft.addOn) + workbenchFirmwareCost(draft.firmware);
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
  clearActiveHotkeys();
  dom.workbenchPanel.classList.add("hidden");
  dom.workbenchPanel.setAttribute("aria-hidden", "true");
  dom.workbenchSections.replaceChildren();
  dom.workbenchConfirm.disabled = true;
  dom.workbenchConfirm.onclick = null;
}

function workbenchAddRow(container, title, options, onPick, selectedValue, hotkeyOffset) {
  const section = document.createElement("div");
  section.className = "workbench-section";
  const h = document.createElement("h3");
  h.className = "workbench-section-title";
  h.textContent = title;
  section.appendChild(h);
  const row = document.createElement("div");
  row.className = "workbench-row";

  options.forEach((opt, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-card workbench-option";
    btn.disabled = Boolean(opt.disabled);
    const small = opt.meta != null && opt.meta !== "" ? `<small>${opt.meta}</small>` : "";
    btn.innerHTML = `<strong>${opt.label}</strong><span>${opt.description}</span>${small}`;
    if (selectedValue === opt.value) {
      btn.classList.add("workbench-selected");
    }
    assignHotkey(btn, hotkeyOffset + index);
    bindButtonChoice(btn, () => onPick(opt.value));
    row.appendChild(btn);
  });

  section.appendChild(row);
  container.appendChild(section);
  return hotkeyOffset + options.length;
}

function syncWorkbenchFooter(draft, budgetStart) {
  const total = workbenchCartTotal(draft);
  const allSet = Boolean(
    draft.hardware &&
      draft.nodes != null &&
      draft.addOn != null &&
      draft.firmware &&
      draft.frequency &&
      draft.preset &&
      draft.security
  );
  const over = total > budgetStart;
  if (allSet && !over) {
    dom.workbenchTotalLine.textContent = `Cart total: $${total} // Cash left after checkout: $${budgetStart - total}`;
  } else if (over && allSet) {
    dom.workbenchTotalLine.textContent = `Cart total: $${total} — over budget by $${total - budgetStart}. Adjust selections.`;
  } else {
    dom.workbenchTotalLine.textContent = `Cart so far: $${total} // Finish every category to lock in budget.`;
  }
  dom.workbenchConfirm.disabled = !allSet || over;
}

function renderWorkbenchCheckout(draft, budgetStart) {
  clearActiveHotkeys();
  clampWorkbenchNodes(draft, budgetStart);
  dom.workbenchSections.replaceChildren();
  const maxN = workbenchMaxNodes(draft, budgetStart);
  let hotkeyIndex = 0;

  hotkeyIndex = workbenchAddRow(
    dom.workbenchSections,
    "1) Hardware (sets price per node)",
    [
      {
        value: "heltec",
        label: "Heltec V3",
        description: "Cheap and common. Less forgiving if you make mistakes.",
        meta: "Per node: $30",
      },
      {
        value: "rak",
        label: "RAK WisBlock",
        description: "Better radios and power draw; every node costs more.",
        meta: "Per node: $50 // +1 link quality",
      },
    ],
    (value) => {
      draft.hardware = value;
      renderWorkbenchCheckout(draft, budgetStart);
      syncWorkbenchFooter(draft, budgetStart);
    },
    draft.hardware,
    hotkeyIndex
  );

  const nodeOptions = [];
  for (let n = 1; n <= 6; n += 1) {
    const nc = getNodeCostForHardware(draft.hardware);
    const nodeLineCost = n * nc;
    const withExtras = nodeLineCost + getAddOnCost(draft.addOn) + workbenchFirmwareCost(draft.firmware);
    nodeOptions.push({
      value: n,
      label: `${n} node${n === 1 ? "" : "s"}`,
      description: nc ? `Subtotal ${n} × $${nc} = $${nodeLineCost}` : "Pick hardware first.",
      meta: !draft.hardware ? "Locked" : withExtras > budgetStart ? "Over budget with current add-on/firmware" : "Within budget",
      disabled: !draft.hardware || n > maxN,
    });
  }
  hotkeyIndex = workbenchAddRow(
    dom.workbenchSections,
    "2) How many nodes to buy (max 6 sites)",
    nodeOptions,
    (value) => {
      draft.nodes = value;
      renderWorkbenchCheckout(draft, budgetStart);
      syncWorkbenchFooter(draft, budgetStart);
    },
    draft.nodes,
    hotkeyIndex
  );

  hotkeyIndex = workbenchAddRow(
    dom.workbenchSections,
    "3) Add-ons (need both for science roof + radio tower)",
    [
      {
        value: "both",
        label: "Weatherproof case + Solar panel",
        description: "Enables science roof + radio tower installs.",
        meta: "Cost: $80",
      },
      {
        value: "case",
        label: "Weatherproof case",
        description: "Outdoor protection only.",
        meta: "Cost: $40",
      },
      {
        value: "solar",
        label: "Solar panel",
        description: "Power endurance only.",
        meta: "Cost: $40",
      },
      {
        value: "none",
        label: "Skip add-ons",
        description: "Save cash; rooftop/tower installs stay locked.",
        meta: "Cost: $0",
      },
    ],
    (value) => {
      draft.addOn = value;
      renderWorkbenchCheckout(draft, budgetStart);
      syncWorkbenchFooter(draft, budgetStart);
    },
    draft.addOn,
    hotkeyIndex
  );

  hotkeyIndex = workbenchAddRow(
    dom.workbenchSections,
    "4) Firmware",
    [
      {
        value: "stable",
        label: "Stable mesh firmware",
        description: "Trusted build for storm prep.",
        meta: "Cost: $10",
      },
      {
        value: "alpha",
        label: "Alpha nightly",
        description: "Experimental; battery and routing risk.",
        meta: "Cost: $0",
      },
    ],
    (value) => {
      draft.firmware = value;
      renderWorkbenchCheckout(draft, budgetStart);
      syncWorkbenchFooter(draft, budgetStart);
    },
    draft.firmware,
    hotkeyIndex
  );

  hotkeyIndex = workbenchAddRow(
    dom.workbenchSections,
    "5) Frequency plan",
    [
      {
        value: "us915",
        label: "US 915 MHz",
        description: "Legal here; behaves correctly.",
        meta: "Compliance safe",
      },
      {
        value: "eu868",
        label: "EU 868 MHz",
        description: "Wrong region for this area.",
        meta: "Illegal locally // link penalty",
      },
      {
        value: "lab433",
        label: "433 MHz lab profile",
        description: "Dangerous experiment.",
        meta: "Do not do this",
      },
    ],
    (value) => {
      draft.frequency = value;
      renderWorkbenchCheckout(draft, budgetStart);
      syncWorkbenchFooter(draft, budgetStart);
    },
    draft.frequency,
    hotkeyIndex
  );

  hotkeyIndex = workbenchAddRow(
    dom.workbenchSections,
    "6) Mesh preset",
    [
      {
        value: "longfast",
        label: "Long Range - Fast",
        description: "Best balance for emergency text across town.",
        meta: "Recommended",
      },
      {
        value: "balanced",
        label: "Balanced",
        description: "Gives up reach.",
        meta: "Coverage penalty",
      },
      {
        value: "turbo",
        label: "Turbo throughput",
        description: "Fast bursts; bad endurance.",
        meta: "Battery risk",
      },
    ],
    (value) => {
      draft.preset = value;
      renderWorkbenchCheckout(draft, budgetStart);
      syncWorkbenchFooter(draft, budgetStart);
    },
    draft.preset,
    hotkeyIndex
  );

  workbenchAddRow(
    dom.workbenchSections,
    "7) Security",
    [
      {
        value: "secure",
        label: "Generate AES-256 key",
        description: "Private channel; safer mutual aid.",
        meta: "Secure comms",
      },
      {
        value: "public",
        label: "Leave channel public",
        description: "Easier to join; anyone can listen.",
        meta: "Vulnerable",
      },
    ],
    (value) => {
      draft.security = value;
      renderWorkbenchCheckout(draft, budgetStart);
      syncWorkbenchFooter(draft, budgetStart);
    },
    draft.security,
    hotkeyIndex
  );
}

function applyWorkbenchSelections(selections) {
  if (selections.hardware === "heltec") {
    state.hardware = "Heltec V3";
    state.nodeCost = 30;
  } else {
    state.hardware = "RAK WisBlock";
    state.nodeCost = 50;
    state.linkQuality += 1;
  }

  state.nodesPurchased = selections.nodes;
  state.nodesAvailable = selections.nodes;

  const addOn = selections.addOn;
  state.weatherproofCase = addOn === "both" || addOn === "case";
  state.solarPanel = addOn === "both" || addOn === "solar";

  if (selections.firmware === "stable") {
    state.stableFirmware = true;
  } else {
    state.stableFirmware = false;
    state.batteryFragile = true;
    state.linkQuality -= 1;
  }

  if (selections.frequency === "us915") {
    state.validBand = true;
  } else {
    state.validBand = false;
    state.linkQuality -= selections.frequency === "eu868" ? 2 : 3;
  }

  if (selections.preset === "longfast") {
    state.validPreset = true;
  } else if (selections.preset === "balanced") {
    state.validPreset = false;
    state.linkQuality -= 1;
  } else {
    state.validPreset = false;
    state.batteryFragile = true;
    state.linkQuality -= 2;
  }

  if (selections.security === "secure") {
    state.encryption = true;
    state.securityConfigured = true;
  } else {
    state.encryption = false;
    state.securityConfigured = true;
  }

  const total =
    selections.nodes * state.nodeCost + getAddOnCost(addOn) + workbenchFirmwareCost(selections.firmware);
  changeBudget(-total);
}

function runWorkbenchCheckout() {
  const budgetStart = state.budget;
  dom.workbenchBudgetHint.textContent = `Starting cash: $${budgetStart}. Choose one option in every section. The cart total includes nodes, add-ons, and paid firmware.`;
  dom.workbenchPanel.classList.remove("hidden");
  dom.workbenchPanel.setAttribute("aria-hidden", "false");

  const draft = {
    hardware: null,
    nodes: null,
    addOn: null,
    firmware: null,
    frequency: null,
    preset: null,
    security: null,
  };

  return new Promise((resolve) => {
    renderWorkbenchCheckout(draft, budgetStart);
    syncWorkbenchFooter(draft, budgetStart);

    dom.workbenchConfirm.dataset.hotkey = "[ENTER]";
    dom.workbenchConfirm.onclick = () => {
      if (dom.workbenchConfirm.disabled) return;
      closeWorkbenchPanel();
      resolve({ ...draft });
    };
  });
}

async function actWorkbench(runToken) {
  clearTerminal();
  await typeBlock(
    [
      "ACT I // THE WORKBENCH",
      "The online requisition terminal blinks to life. Every dollar spent here determines what the town gets later.",
      "Use the workbench panel below to compare every purchase at once, then confirm when the cart fits your budget.",
    ],
    "system",
    runToken
  );

  const selections = await runWorkbenchCheckout();
  const budgetBefore = state.budget;
  applyWorkbenchSelections(selections);
  if (window.IntermeshAnalytics) {
    window.IntermeshAnalytics.workbenchCommitted(selections, budgetBefore - state.budget, state.budget);
  }

  const addOnLabel =
    selections.addOn === "both"
      ? "weatherproof case + solar panel"
      : selections.addOn === "case"
        ? "weatherproof case only"
        : selections.addOn === "solar"
          ? "solar panel only"
          : "no add-ons";

  await typeBlock(
    [
      `Build locked: ${state.hardware}, ${selections.nodes} node${selections.nodes === 1 ? "" : "s"}, ${addOnLabel}.`,
      selections.firmware === "stable"
        ? "Stable firmware flashed ($10)."
        : "Alpha firmware flashed — watch battery and routing.",
      selections.frequency === "us915"
        ? "Frequency plan: US 915 MHz."
        : `Frequency plan: ${selections.frequency} — expect link pain.`,
      `Mesh preset: ${selections.preset}. Security: ${selections.security === "secure" ? "AES-256" : "public channel"}.`,
      `Cash after checkout: $${state.budget}.`,
    ],
    "success",
    runToken
  );
}

async function deployScience(runToken) {
  if (!hasNodeAvailable()) {
    setLocation("science", "skipped", "No nodes remaining to place at this site.");
    await typeLine("No nodes left in your inventory. You cannot deploy at the science building.", "alert", runToken);
    return;
  }
  await typeBlock(
    [
      "Destination: Campus Science Building.",
      "Dr. Ansari leans in the observatory doorway, unimpressed by panic and very impressed by evidence.",
      '"Give me one reason this belongs on my roof," he says.',
    ],
    "system",
    runToken
  );

  const choice = await promptChoice(
    ["Make your case."],
    [
      {
        value: "data",
        label: "Appeal to telemetry and survival data",
        description: "Promise live weather relays, outage mapping, and a resilient data path for the whole town.",
        meta: state.weatherproofCase && state.solarPanel ? "Uses 1 node // Roof install enabled" : "Requires case + solar for roof install",
        disabled: !(state.weatherproofCase && state.solarPanel),
      },
      {
        value: "emotion",
        label: "Make an emotional plea",
        description: "Ask him to do it because people are scared and you need kindness right now.",
        meta: "Uses 1 node",
      },
      {
        value: "jargon",
        label: "Use pure radio jargon",
        description: "Launch into packet-routing terms and hope technical vocabulary carries the moment.",
        meta: "Uses 1 node",
      },
      {
        value: "skip",
        label: "Skip this site",
        description: "Walk away from the town's best elevation point.",
        meta: "No cost",
      },
    ]
  );

  if (choice === "skip") {
    state.scienceMissed = true;
    setLocation("science", "skipped", "Critical high-elevation site abandoned.");
    await typeLine("You leave the science building dark. Full town coverage is no longer achievable.", "alert", runToken);
    return;
  }

  if (choice === "data") {
    const gain = addCoverage(12);
    state.scienceRoof = true;
    addNode("science", `roof mount secured with professor approval (+${gain}% coverage)`);
    setLocation("science", "deployed", "Roof access granted. The network now has a real spine.");
    await typeLine('"Ansari nods once. "That is an actual argument." He unlocks the roof hatch for you.', "success", runToken);
  } else {
    const gain = addCoverage(5);
    state.scienceRoof = false;
    addNode("science", `dorm window fallback placement (+${gain}% coverage)`);
    setLocation("science", "weak", "Fallback placement in a dorm window limits the network horizon.");
    await typeLine("He refuses roof access. You settle for a dorm window and lose the best line-of-sight in town.", "warn", runToken);
  }
}

async function deployValley(runToken) {
  if (!hasNodeAvailable()) {
    setLocation("valley", "skipped", "No nodes remaining to place at this site.");
    await typeLine("No nodes left in your inventory. Valley West stays offline.", "alert", runToken);
    return;
  }
  await typeBlock(
    [
      "Destination: Valley West.",
      "Luz and Diego meet you on their porch while hills crowd every approach to the neighborhood.",
      "A standard node will struggle here unless you spend more on the link.",
    ],
    "system",
    runToken
  );

  const basicCost = 0;
  const highGainCost = 20;
  const solarCost = 25;
  const choice = await promptChoice(
    ["Choose the Valley West deployment package."],
    [
      {
        value: "basic",
        label: "Basic node only",
        description: "Cheapest path, but the hills will likely carve out a dead zone.",
        meta: "Uses 1 node // no add-on cost",
      },
      {
        value: "highgain",
        label: "Node + high-gain antenna",
        description: "Stabilizes the valley link and pushes farther toward rural outskirts.",
        cost: highGainCost,
      },
      {
        value: "solar",
        label: "Node + solar repeater",
        description: "Best reach and long-tail resilience when the outage stretches past the first night.",
        cost: solarCost,
      },
      {
        value: "skip",
        label: "Skip this site",
        description: "Leave the valley district isolated behind terrain.",
        meta: "No cost",
      },
    ]
  );

  if (choice === "skip") {
    setLocation("valley", "skipped", "Valley West remains outside the mesh.");
    await typeLine("You keep your cash, but the valley edge falls off the map.", "warn", runToken);
    return;
  }

  if (choice === "basic") {
    changeBudget(-basicCost);
    const gain = addCoverage(4);
    addSupplies(1);
    state.deadZones = true;
    state.valleyWeak = true;
    addNode("valley", `residential install, but the hills choke the signal (+${gain}% coverage)`);
    setLocation("valley", "weak", "Node deployed, yet terrain still creates a valley dead zone.");
    await typeLine("The house line joins the mesh, and Luz hands you a warm mug from the kitchen. The western edge still drops packets into silence.", "warn", runToken);
    return;
  }

  if (choice === "highgain") {
    changeBudget(-highGainCost);
    const gain = addCoverage(8);
    addSupplies(1);
    addNode("valley", `high-gain residential relay clears the hills (+${gain}% coverage)`);
    setLocation("valley", "deployed", "High-gain antenna punches the valley back into town.");
    await typeLine("Diego helps you sight the antenna line. The western district finally links cleanly to the main network.", "success", runToken);
    return;
  }

  changeBudget(-solarCost);
  const gain = addCoverage(10);
  addSupplies(1);
  state.solarSupport = true;
  addNode("valley", `solar repeater mounted on a valley rooftop (+${gain}% coverage)`);
  setLocation("valley", "deployed", "Solar repeater gives the valley independent staying power.");
  await typeLine("The repeater drinks afternoon sun and throws packets across the low ground like a promise.", "success", runToken);
}

async function deploySugar(runToken) {
  if (!hasNodeAvailable()) {
    setLocation("sugar", "skipped", "No nodes remaining to place at this site.");
    await typeLine("No nodes left in your inventory. Yoshiko keeps her keys.", "alert", runToken);
    return;
  }
  await typeBlock(
    [
      "Destination: International Grocery.",
      "Yoshiko eyes your gear, then your empty wallet, then tosses you her keys.",
      '"You put a node here, I drive you wherever else you need to go," she says.',
    ],
    "system",
    runToken
  );

  const choice = await promptChoice(
    ["Accept Yoshiko's deal?"],
    [
      {
        value: "deploy",
        label: "Trade a node for logistics support",
        description: "Place a node at International Grocery, earn supplies, and let Yoshiko absorb later travel costs.",
        meta: "Uses 1 node",
      },
      {
        value: "skip",
        label: "Skip International Grocery",
        description: "Save the node cost, but lose transport help and a busy community stop.",
        meta: "No cost",
      },
    ]
  );

  if (choice === "skip") {
    setLocation("sugar", "skipped", "No node placed at International Grocery. Yoshiko keeps her keys.");
    await typeLine("You pass on International Grocery. The next deployments stay slower and more expensive in spirit, if not on paper.", "warn", runToken);
    return;
  }

  const gain = addCoverage(5);
  addSupplies(1);
  state.yoshikoDrive = true;
  addNode("sugar", `International Grocery node online; Yoshiko now gives you free rides outside town (+${gain}% coverage)`);
  setLocation("sugar", "deployed", "International Grocery linked. Yoshiko starts driving your route.");
  await typeLine("Yoshiko tops off her tank and waves you in. The market goes live, and your out-of-town travel rides are now free.", "success", runToken);
}

async function deployApartments(runToken) {
  if (!hasNodeAvailable()) {
    setLocation("apartments", "skipped", "No nodes remaining to place at this site.");
    await typeLine("No nodes left in your inventory. The apartments remain unlinked.", "alert", runToken);
    return;
  }
  await typeBlock(
    [
      "Destination: Tesseract Apartments.",
      "Dalia meets you by the community garden with a crate of peppers, canned beans, and one stubborn smile.",
    ],
    "system",
    runToken
  );

  const choice = await promptChoice(
    ["Trade a node for food and rooftop access?"],
    [
      {
        value: "deploy",
        label: "Deploy apartment node",
        description: "Extend the mesh to several families and bring home garden supplies.",
        meta: "Uses 1 node",
      },
      {
        value: "skip",
        label: "Skip this site",
        description: "Leave student housing without a relay and forfeit the food trade.",
        meta: "No cost",
      },
    ]
  );

  if (choice === "skip") {
    setLocation("apartments", "skipped", "Apartment block left off-network.");
    await typeLine("You keep moving. Dalia watches you go with a basket that could have mattered later.", "warn", runToken);
    return;
  }

  const gain = addCoverage(5);
  addSupplies(3);
  addNode("apartments", `garden roof relay installed (+${gain}% coverage)`);
  setLocation("apartments", "deployed", "Apartment rooftop linked. Food stores rise with trust.");
  await typeLine("The garden node comes online. Dalia sends you off with extra supplies from the rooftop harvest.", "success", runToken);
}

async function deployRadio(runToken) {
  if (!hasNodeAvailable()) {
    setLocation("radio", "skipped", "No nodes remaining to place at this site.");
    await typeLine("No nodes left in your inventory. The station cannot be linked.", "alert", runToken);
    return;
  }
  await typeBlock(
    [
      "Destination: Radio Station.",
      "Geo unlocks a side gate and points toward the tower with a grin that says he would climb it himself if you asked.",
    ],
    "system",
    runToken
  );

  const choice = await promptChoice(
    ["How bold do you get?"],
    [
      {
        value: "tower",
        label: "Climb the tower",
        description: "High risk, high payoff. Best possible reach from the station.",
        meta: state.weatherproofCase && state.solarPanel ? "Uses 1 node // Tower install enabled" : "Requires case + solar for tower install",
        disabled: !(state.weatherproofCase && state.solarPanel),
      },
      {
        value: "lobby",
        label: "Mount it inside the lobby",
        description: "Safer, faster, and much worse for network geometry.",
        meta: "Uses 1 node",
      },
      {
        value: "skip",
        label: "Skip this site",
        description: "Save money and let the radio station fend for itself.",
        meta: "No cost",
      },
    ]
  );

  if (choice === "skip") {
    setLocation("radio", "skipped", "Broadcast hub never linked into the mesh.");
    await typeLine("You leave the station behind. The town loses a strong mid-grid relay point.", "warn", runToken);
    return;
  }

  if (choice === "tower") {
    spendTime(4);
    const gain = addCoverage(7);
    addNode("radio", `tower-top mount with Geo spotting the climb (+${gain}% coverage)`);
    setLocation("radio", "deployed", "Tower node mounted above the station roofline.");
    await typeLine("The tower sways, your hands shake, and the new relay paints a clean arc across the city center. The climb costs 4 precious hours.", "success", runToken);
    return;
  }

  const gain = addCoverage(4);
  addNode("radio", `interior station mount with reduced reach (+${gain}% coverage)`);
  setLocation("radio", "weak", "Safe install completed, but the station never reaches full potential.");
  await typeLine("You take the safe route. Geo does not judge you, but the coverage map absolutely does.", "warn", runToken);
}

async function deployHealth(runToken) {
  if (!hasNodeAvailable()) {
    setLocation("health", "skipped", "No nodes remaining to place at this site.");
    await typeLine("No nodes left in your inventory. The clinic stays outside the mesh.", "alert", runToken);
    return;
  }
  await typeBlock(
    [
      "Destination: Women's Health Clinic.",
      "Yasmin leads you behind the building where trees and wet branches turn the air into a green wall.",
      "Dense foliage here demands better hardware than a naked stock antenna.",
    ],
    "system",
    runToken
  );

  const basicCost = 0;
  const highGainCost = 20;
  const choice = await promptChoice(
    ["Choose the clinic deployment package."],
    [
      {
        value: "basic",
        label: "Basic node only",
        description: "Cheaper, but leaves the clinic half-hidden behind the trees.",
        meta: "Uses 1 node // no add-on cost",
      },
      {
        value: "highgain",
        label: "Node + high-gain antenna",
        description: "Cuts through the foliage and gives the clinic a dependable route.",
        cost: highGainCost,
      },
      {
        value: "skip",
        label: "Skip this site",
        description: "Save money and accept a medical blind spot during the outage.",
        meta: "No cost",
      },
    ]
  );

  if (choice === "skip") {
    setLocation("health", "skipped", "Health center left outside the mesh.");
    await typeLine("You save the money. The clinic vanishes behind branches and static.", "warn", runToken);
    return;
  }

  if (choice === "basic") {
    changeBudget(-basicCost);
    const gain = addCoverage(4);
    state.deadZones = true;
    state.healthWeak = true;
    addNode("health", `clinic node deployed, but the foliage still blocks clean traffic (+${gain}% coverage)`);
    setLocation("health", "weak", "Node deployed, yet foliage still causes a medical dead zone.");
    await typeLine("Yasmin thanks you anyway. The clinic joins the map, but every tree between you and town remains an enemy.", "warn", runToken);
    return;
  }

  changeBudget(-highGainCost);
  const gain = addCoverage(8);
  addNode("health", `high-gain clinic relay clears the tree line (+${gain}% coverage)`);
  setLocation("health", "deployed", "Clinic relay pushes cleanly through the canopy.");
  await typeLine("The upgraded antenna slices through the foliage. Women's Health Clinic now has a reliable lifeline.", "success", runToken);
}

async function actDeployment(runToken) {
  clearTerminal();
  await typeBlock(
    [
      "ACT II // COMMUNITY DEPLOYMENT",
      "Your city is on the map. Choose your route carefully: every stop costs money, shapes the mesh, and changes who survives the outage together.",
    ],
    "system",
    runToken
  );

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
      ["Select your next deployment target or lock the current network and move to diagnostics."],
      [
        ...pendingLocations.map((location) => ({
          value: location.key,
          label: location.title,
          description: `${location.contact}. ${location.detail}`,
          meta: `${location.elevation}`,
        })),
        {
          value: "finish",
          label: "Run diagnostics now",
          description: "Stop deploying and find out whether the current mesh can survive the storm.",
          meta: "Advance to Act III",
        },
      ]
    );

    if (selected === "finish") {
      deploying = false;
      await typeLine("You close the deployment ledger and queue a town-wide ping test.", "system", runToken);
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
  await typeBlock(
    [
      "ACT III // CRISIS AND TROUBLESHOOTING",
      "You run a full network ping sweep as thunder stacks itself over the horizon.",
    ],
    "system",
    runToken
  );

  const issues = [];

  if (state.valleyWeak) {
    issues.push("Valley West packets fade into the surrounding hills.");
  }
  if (state.healthWeak) {
    issues.push("Women's Health Clinic traffic is vanishing into foliage.");
  }

  if (issues.length) {
    state.deadZones = true;
    await typeBlock(issues, "warn", runToken);

    const patchChoice = await promptChoice(
      ["Emergency field fix available for $40. Do you pay it?"],
      [
        {
          value: "patch",
          label: "Pay the $40 emergency fix",
          description: "Rush the right antennas into place before the storm front lands.",
          cost: 40,
        },
        {
          value: "accept",
          label: "Proceed with dead zones",
          description: "Save the money and accept that some people will drop off the network.",
          meta: "No cost",
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
        setLocation("valley", "deployed", "Emergency field fix restored clean valley routing.");
      }
      if (state.locationStatuses.health.status === "weak") {
        setLocation("health", "deployed", "Emergency field fix restored clinic routing.");
      }
      await typeLine(`You burn $40 on a last-minute rescue and claw back +${gain}% coverage before the rain starts.`, "success", runToken);
      if (window.IntermeshAnalytics) {
        window.IntermeshAnalytics.diagnosticTriggered({ issues, patched: true, coverage_delta: gain, budget_delta: -40 });
      }
    } else {
      await typeLine("You keep the cash. The dead zones stay exactly where the map warned they would.", "warn", runToken);
      if (window.IntermeshAnalytics) {
        window.IntermeshAnalytics.diagnosticTriggered({ issues, patched: false, coverage_delta: 0, budget_delta: 0 });
      }
    }
  } else {
    await typeLine("Ping sweep returns green across every deployed corridor. No dead zones detected.", "success", runToken);
    if (window.IntermeshAnalytics) {
      window.IntermeshAnalytics.diagnosticTriggered({ issues: [], patched: false, coverage_delta: 0, budget_delta: 0 });
    }
  }

  if (!state.validBand) {
    await typeLine("Secondary warning: the radios are operating on the wrong regional band, lowering town-wide efficiency.", "warn", runToken);
  }

  if (!state.validPreset) {
    await typeLine("Secondary warning: your preset choice is costing either range or battery endurance exactly when you need both.", "warn", runToken);
  }

  await typeBlock(
    [
      "Storm alert: derecho leading edge detected.",
      "Grid instability spikes. Lights flicker across the city and then vanish sector by sector.",
      "Project Intermesh becomes the only thing still awake.",
    ],
    "alert",
    runToken
  );
}

async function actMutualAid(runToken) {
  clearTerminal();
  await typeBlock(
    [
      "Mutual aid request incoming.",
      "Mina from two streets over asks for access so she can text family and trade outage updates through the mesh.",
    ],
    "system",
    runToken
  );

  const choice = await promptChoice(
    ["Grant Mina access to the network?"],
    [
      {
        value: "grant",
        label: "Grant network access",
        description: "Share the mesh, prove its value, and trust your community to carry it forward.",
        meta: "Earn supplies",
      },
      {
        value: "deny",
        label: "Keep the network closed",
        description: "Protect your limited resources and avoid another user on an already stressed system.",
        meta: "No supply gain",
      },
    ]
  );

  if (choice === "grant") {
    addSupplies(1);
    await typeLine("Mina sends her message and returns with a bottle of wine (+1 supplies). Mutual aid becomes more than a slogan.", "success", runToken);
  } else {
    await typeLine("You keep the network private and controlled. The system stays lean, but the street feels colder.", "warn", runToken);
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
    return {
      className: "success",
      lines: [
        "ENDING A // THE RESILIENT UTOPIA",
        `Encrypted traffic hums through ${state.nodesDeployed.length} deployed nodes while the city reorganizes itself around mutual aid instead of panic.`,
        state.solarSupport
          ? "Your solar-backed valley repeater keeps the mesh alive long after the blackout should have broken it."
          : "Even without a solar repeater on every line, your disciplined build keeps the network standing when the town needs it most.",
        "Neighbors use the channel to coordinate medicine, hot food, and shelter. By sunrise, the outage feels less like collapse and more like a town learning to move together.",
      ],
    };
  }

  if (state.encryption && coverage >= 22 && (state.deadZones || !scienceReady || !state.validBand || !state.validPreset)) {
    return {
      className: "warn",
      lines: [
        "ENDING B // THE FRACTURED LIFELINE",
        "Your encrypted network works, but not for everyone who needed it.",
        "Some blocks stay connected while the valley edge, clinic corridor, or weakened relay path drops into silence.",
        "The city survives in pockets. The people close to you make it through the night together, and the people just beyond your best signal do not hear the call.",
      ],
    };
  }

  if (!state.encryption && coverage >= 22) {
    return {
      className: "warn",
      lines: [
        "ENDING C // THE OPEN FREQUENCY",
        "The mesh spreads across town, and people absolutely use it.",
        "But the public channel means every anxious rumor, supply handoff, and family check-in leaks into the open air for anyone listening.",
        "You built a lifeline, then left it unshielded. The city remembers the help and the vulnerability in equal measure.",
      ],
    };
  }

  if (lowCoverage && supplyShortage && (state.batteryFragile || configFailure || !state.solarSupport)) {
    return {
      className: "alert",
      lines: [
        "ENDING D // THE DARK AGE",
        "Coverage never reached far enough, supplies stayed thin, and your weakest hardware choices fail exactly when the storm settles in.",
        "Basic batteries drain, unstable links vanish, and the terminal log fills with silence faster than messages.",
        "Project Intermesh collapses before people can rely on it. Everyone waits in the dark for outside help that is still days away.",
      ],
    };
  }

  return {
    className: "warn",
    lines: [
      "ENDING B // THE FRACTURED LIFELINE",
      "The network helps, but only in fragments.",
      "You proved the concept, but a missing high point, missing supplies, or too many skipped deployments leaves the city unevenly connected.",
      "People remember your effort. They also remember where the signal stopped.",
    ],
  };
}

async function showEnding(runToken) {
  clearTerminal();
  const ending = determineEnding();

  if (window.IntermeshAnalytics) {
    const letterMatch = (ending.lines[0] || "").match(/ENDING\s+([A-D])/i);
    window.IntermeshAnalytics.runEnded({
      ending: letterMatch ? letterMatch[1].toUpperCase() : "unknown",
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
    `Final stats // Budget: $${state.budget} // Coverage: ${state.coverage}% // Encryption: ${state.encryption ? "ON" : "OFF"} // Supplies: ${state.supplies}`,
    ending.className,
    runToken
  );

  clearChoices();
  const restartButton = document.createElement("button");
  restartButton.type = "button";
  restartButton.className = "choice-card";
  restartButton.innerHTML = `
    <strong>Start a new run</strong>
    <span>Reset the terminal and try to secure the city with a different route.</span>
    <small>Replay</small>
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
  clearActiveHotkeys();
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

  dom.mapPrev.addEventListener("click", () => {
  });

  dom.mapNext.addEventListener("click", () => {
  });

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
      return;
    }

    const hotkeyTarget = activeHotkeys.get(event.key.toLowerCase());
    if (!hotkeyTarget) {
      return;
    }

    event.preventDefault();
    hotkeyTarget.classList.add("is-hotkey-focus");
    window.setTimeout(() => hotkeyTarget.classList.remove("is-hotkey-focus"), 120);
    hotkeyTarget.click();
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

bindControls();
initializeTheme();
refreshUi();
startGame();
