const locationDefinitions = [
  {
    key: "science",
    title: "Campus Science Building",
    contact: "Dr. Ziad Ansari",
    elevation: "Maximum elevation",
    detail: "Critical line-of-sight point inside town.",
  },
  {
    key: "valley",
    title: "Valley West",
    contact: "Luz and Diego",
    elevation: "Low elevation",
    detail: "Bakery district surrounded by signal-killing hills.",
  },
  {
    key: "sugar",
    title: "Sugar Beet Co-op Grocery",
    contact: "Sebastian",
    elevation: "Medium elevation",
    detail: "Classmate with a hatchback and a full gas tank.",
  },
  {
    key: "apartments",
    title: "Tesseract Apartments",
    contact: "Fiona",
    elevation: "Medium elevation",
    detail: "Community garden rooftop and student households.",
  },
  {
    key: "radio",
    title: "Radio Station",
    contact: "Geo",
    elevation: "Medium elevation",
    detail: "Strong reach if you are willing to climb the tower.",
  },
  {
    key: "health",
    title: "Bast Health Center",
    contact: "Molly",
    elevation: "Medium elevation",
    detail: "Dense trees force a cleaner antenna setup.",
  },
];

const dom = {
  terminal: document.getElementById("terminal"),
  choicePanel: document.getElementById("choice-panel"),
  inputZone: document.getElementById("input-zone"),
  inputLabel: document.getElementById("input-label"),
  input: document.getElementById("operator-input"),
  inputSubmit: document.getElementById("input-submit"),
  restartButton: document.getElementById("restart-button"),
  soundToggle: document.getElementById("sound-toggle"),
  budget: document.getElementById("budget-stat"),
  coverage: document.getElementById("coverage-stat"),
  encryption: document.getElementById("encryption-stat"),
  supplies: document.getElementById("supplies-stat"),
  hardware: document.getElementById("hardware-stat"),
  nodes: document.getElementById("nodes-stat"),
  operatorBadge: document.getElementById("operator-badge"),
  mapGrid: document.getElementById("map-grid"),
  mapSummary: document.getElementById("map-summary"),
  nodeList: document.getElementById("node-list"),
};

const typingDelay = 8;
const pauseBetweenLines = 120;
let audioContext = null;
let soundEnabled = true;
let currentRunToken = 0;

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
    operatorName: "UNASSIGNED",
    budget: 250,
    coverage: 0,
    encryption: false,
    securityConfigured: false,
    supplies: 0,
    nodesDeployed: [],
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
    sebastianDrive: false,
    batteryFragile: false,
    publicChannel: false,
    sarahHelped: false,
    towerClimb: false,
    diagnosticsPatched: false,
    locationStatuses,
  };
}

let state = createInitialState();

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getAudioContext() {
  if (!soundEnabled || !(window.AudioContext || window.webkitAudioContext)) {
    return null;
  }

  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTone({ frequency, duration, type = "square", gain = 0.015, sweep = 0 }) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();
  const now = ctx.currentTime;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (sweep !== 0) {
    oscillator.frequency.linearRampToValueAtTime(frequency + sweep, now + duration);
  }

  volume.gain.setValueAtTime(0.0001, now);
  volume.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(volume);
  volume.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playTypingClick(index) {
  if (!soundEnabled || index % 4 !== 0) {
    return;
  }

  playTone({ frequency: 110 + (index % 5) * 8, duration: 0.024, gain: 0.008 });
}

function playMenuBeep() {
  playTone({ frequency: 440, duration: 0.08, type: "triangle", gain: 0.02, sweep: 60 });
}

function playAlarm() {
  playTone({ frequency: 740, duration: 0.22, type: "sawtooth", gain: 0.018, sweep: -180 });
  window.setTimeout(() => {
    playTone({ frequency: 620, duration: 0.28, type: "sawtooth", gain: 0.016, sweep: 100 });
  }, 140);
}

function clearChoices() {
  dom.choicePanel.innerHTML = "";
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

  for (let index = 0; index < text.length; index += 1) {
    if (runToken !== currentRunToken) {
      return;
    }

    row.textContent += text[index];
    playTypingClick(index);
    dom.terminal.scrollTop = dom.terminal.scrollHeight;
    await wait(typingDelay);
  }

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
  dom.hardware.textContent = state.hardware || "Not selected";
  dom.nodes.textContent = String(state.nodesDeployed.length);
  dom.operatorBadge.textContent = `Operator: ${state.operatorName}`;
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
  refreshUi();
}

function createChoiceButton(option, resolve) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "choice-card";

  const costText = Number.isFinite(option.cost) ? `Cost: $${option.cost}` : option.meta || "Awaiting command";
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

  button.addEventListener("click", async () => {
    playMenuBeep();
    clearChoices();
    hideInput();
    resolve(option.value);
  });

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

      playMenuBeep();
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
      "BOOT SEQUENCE // RIDGECREST MUNICIPAL BACKCHANNEL",
      "NOAA BULLETIN: DERECHO STORM FRONT PROJECTED TO IMPACT IN 72 HOURS.",
      "Expected effects: grid collapse, cell congestion, road closures, multi-day outage.",
      "You are one student with a soldering iron, a terminal window, and $250 of precious cash.",
      "If the power dies, people will need a local mesh to coordinate rides, food, medicine, and shelter.",
    ],
    "system",
    runToken
  );

  state.operatorName = await promptTextInput("Enter operator callsign to initiate Project Mesh.", "RIDGETOP-01");
  refreshUi();

  await typeBlock(
    [
      `Operator ${state.operatorName} accepted. Project Mesh authorization logged.`,
      "Mission objective: deploy enough resilient Meshtastic nodes to keep Ridgecrest talking after the grid falls.",
      "Failure conditions: low coverage, weak batteries, broken links, or an open channel that hostile listeners can exploit.",
    ],
    "system",
    runToken
  );
}

async function actWorkbench(runToken) {
  await typeBlock(
    [
      "ACT I // THE WORKBENCH",
      "The online requisition terminal blinks to life. Every dollar spent here determines what the town gets later.",
    ],
    "system",
    runToken
  );

  const hardwareChoice = await promptChoice(
    ["Select your primary hardware line."],
    [
      {
        value: "heltec",
        label: "Heltec V3",
        description: "Cheap, common, and just barely within a student budget. Less forgiving if you make mistakes.",
        cost: 30,
      },
      {
        value: "rak",
        label: "RAK WisBlock",
        description: "Excellent radios and efficient power draw, but every future node will also cost more.",
        cost: 50,
      },
    ]
  );

  if (hardwareChoice === "heltec") {
    state.hardware = "Heltec V3";
    state.nodeCost = 30;
    changeBudget(-30);
    await typeLine("Heltec V3 starter kit purchased. Cheap enough to field more nodes if you stay disciplined.", "success", runToken);
  } else {
    state.hardware = "RAK WisBlock";
    state.nodeCost = 50;
    state.linkQuality += 1;
    changeBudget(-50);
    await typeLine("RAK WisBlock starter kit purchased. Signal quality improves, but your cash buffer shrinks fast.", "warn", runToken);
  }

  const firmwareChoice = await promptChoice(
    ["USB handshake complete. Choose firmware image."],
    [
      {
        value: "stable",
        label: "Stable mesh firmware",
        description: "Boring, trusted, and tested by thousands of operators.",
        meta: "Recommended",
      },
      {
        value: "alpha",
        label: "Alpha nightly build",
        description: "Experimental routing tweaks with a history of lockups and battery drain.",
        meta: "High risk",
      },
    ]
  );

  if (firmwareChoice === "stable") {
    state.stableFirmware = true;
    await typeLine("Stable firmware flashed. No drama. Exactly what a storm prep window needs.", "success", runToken);
  } else {
    state.stableFirmware = false;
    state.batteryFragile = true;
    state.linkQuality -= 1;
    refreshUi();
    await typeLine("Alpha firmware flashed. The diagnostics log throws two warnings you choose to ignore.", "alert", runToken);
  }

  const frequencyChoice = await promptChoice(
    ["Set regional frequency plan."],
    [
      {
        value: "us915",
        label: "US 915 MHz",
        description: "Legal band plan for the region and the only choice that will behave correctly here.",
        meta: "Compliance safe",
      },
      {
        value: "eu868",
        label: "EU 868 MHz",
        description: "A familiar profile from online tutorials, but wrong for Ridgecrest.",
        meta: "Illegal locally",
      },
      {
        value: "lab433",
        label: "433 MHz lab profile",
        description: "A dangerous experiment that trades legality for chaos.",
        meta: "Do not do this",
      },
    ]
  );

  if (frequencyChoice === "us915") {
    state.validBand = true;
    await typeLine("Frequency plan set to US 915 MHz. No sheriff, no FCC headache, no needless packet loss.", "success", runToken);
  } else {
    state.validBand = false;
    state.linkQuality -= frequencyChoice === "eu868" ? 2 : 3;
    refreshUi();
    await typeLine("Wrong regional band loaded. Some packets may still move, but the network will limp instead of sing.", "warn", runToken);
  }

  const presetChoice = await promptChoice(
    ["Choose the mesh preset."],
    [
      {
        value: "longfast",
        label: "Long Range - Fast",
        description: "Best balance for emergency text traffic across town and foothill edges.",
        meta: "Recommended",
      },
      {
        value: "balanced",
        label: "Balanced",
        description: "Stable enough, but you give up the reach Ridgecrest desperately needs.",
        meta: "Coverage penalty",
      },
      {
        value: "turbo",
        label: "Turbo Throughput",
        description: "Fast bursts, bad endurance, and not designed for disaster relays.",
        meta: "Battery risk",
      },
    ]
  );

  if (presetChoice === "longfast") {
    state.validPreset = true;
    await typeLine("Preset locked to Long Range - Fast. The link budget finally looks like a survival plan.", "success", runToken);
  } else if (presetChoice === "balanced") {
    state.validPreset = false;
    state.linkQuality -= 1;
    refreshUi();
    await typeLine("Balanced preset selected. Reliable, but you just shaved precious reach from every hilltop hop.", "warn", runToken);
  } else {
    state.validPreset = false;
    state.batteryFragile = true;
    state.linkQuality -= 2;
    refreshUi();
    await typeLine("Turbo preset selected. The radios now chew through energy like the storm is not coming.", "alert", runToken);
  }

  const securityChoice = await promptChoice(
    ["Security check: protect the channel or leave it open?"],
    [
      {
        value: "secure",
        label: "Generate AES-256 key",
        description: "Private coordination, safer mutual aid, and one less thing to fear when panic spreads.",
        meta: "Secure comms",
      },
      {
        value: "public",
        label: "Leave channel public",
        description: "Faster to share, easier to join, and completely visible to anyone with a radio.",
        meta: "Vulnerable",
      },
    ]
  );

  if (securityChoice === "secure") {
    state.encryption = true;
    state.securityConfigured = true;
    await typeLine("AES-256 channel key burned into memory. Your network now has a spine.", "success", runToken);
  } else {
    state.encryption = false;
    state.securityConfigured = true;
    state.publicChannel = true;
    await typeLine("Public channel selected. Anyone nearby can hear whatever Ridgecrest says to itself.", "alert", runToken);
  }
}

async function deployScience(runToken) {
  await typeBlock(
    [
      "Destination: Campus Science Building.",
      "Dr. Ziad Ansari leans in the observatory doorway, unimpressed by panic and very impressed by evidence.",
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
        cost: state.nodeCost,
      },
      {
        value: "emotion",
        label: "Make an emotional plea",
        description: "Ask him to do it because people are scared and you need kindness right now.",
        cost: state.nodeCost,
      },
      {
        value: "jargon",
        label: "Use pure radio jargon",
        description: "Launch into packet-routing terms and hope technical vocabulary carries the moment.",
        cost: state.nodeCost,
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

  changeBudget(-state.nodeCost);

  if (choice === "data") {
    const gain = addCoverage(12);
    state.scienceRoof = true;
    addNode("science", `roof mount secured with professor approval (+${gain}% coverage)`);
    setLocation("science", "deployed", "Roof access granted. Ridgecrest now has a real spine.");
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
  await typeBlock(
    [
      "Destination: Valley West.",
      "Luz and Diego clear a table at the bakery while hills crowd every approach to the neighborhood.",
      "A standard node will struggle here unless you spend more on the link.",
    ],
    "system",
    runToken
  );

  const basicCost = state.nodeCost;
  const highGainCost = state.nodeCost + 20;
  const solarCost = state.nodeCost + 25;
  const choice = await promptChoice(
    ["Choose the Valley West deployment package."],
    [
      {
        value: "basic",
        label: "Basic node only",
        description: "Cheapest path, but the hills will likely carve out a dead zone.",
        cost: basicCost,
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
    addNode("valley", `bakery install, but the hills choke the signal (+${gain}% coverage)`);
    setLocation("valley", "weak", "Node deployed, yet terrain still creates a valley dead zone.");
    await typeLine("The bakery joins the mesh, and Luz hands you fresh bread. The western edge still drops packets into silence.", "warn", runToken);
    return;
  }

  if (choice === "highgain") {
    changeBudget(-highGainCost);
    const gain = addCoverage(8);
    addSupplies(1);
    addNode("valley", `high-gain bakery relay clears the hills (+${gain}% coverage)`);
    setLocation("valley", "deployed", "High-gain antenna punches the valley back into town.");
    await typeLine("Diego helps you sight the antenna line. The western district finally links cleanly to Ridgecrest proper.", "success", runToken);
    return;
  }

  changeBudget(-solarCost);
  const gain = addCoverage(10);
  addSupplies(1);
  state.solarSupport = true;
  addNode("valley", `solar repeater mounted over the bakery (+${gain}% coverage)`);
  setLocation("valley", "deployed", "Solar repeater gives the valley independent staying power.");
  await typeLine("The repeater drinks afternoon sun and throws packets across the low ground like a promise.", "success", runToken);
}

async function deploySugar(runToken) {
  await typeBlock(
    [
      "Destination: Sugar Beet Co-op Grocery.",
      "Sebastian eyes your gear, then your empty wallet, then tosses you his keys.",
      '"You put a node here, I drive you wherever else you need to go," he says.',
    ],
    "system",
    runToken
  );

  const choice = await promptChoice(
    ["Accept Sebastian's deal?"],
    [
      {
        value: "deploy",
        label: "Trade a node for logistics support",
        description: "Place a co-op node, earn supplies, and let Sebastian absorb later travel costs.",
        cost: state.nodeCost,
      },
      {
        value: "skip",
        label: "Skip the co-op",
        description: "Save the node cost, but lose transport help and a community hub.",
        meta: "No cost",
      },
    ]
  );

  if (choice === "skip") {
    setLocation("sugar", "skipped", "No node placed at the co-op. Sebastian keeps his keys.");
    await typeLine("You pass on the co-op. The next deployments stay slower and more expensive in spirit, if not on paper.", "warn", runToken);
    return;
  }

  changeBudget(-state.nodeCost);
  const gain = addCoverage(5);
  addSupplies(1);
  state.sebastianDrive = true;
  changeBudget(10);
  addNode("sugar", `co-op node online; Sebastian saves you $10 in travel costs (+${gain}% coverage)`);
  setLocation("sugar", "deployed", "Community grocery linked. Sebastian starts driving your route.");
  await typeLine("Sebastian tops off his tank and waves you in. The co-op goes live, and your budget breathes for the first time all day.", "success", runToken);
}

async function deployApartments(runToken) {
  await typeBlock(
    [
      "Destination: Tesseract Apartments.",
      "Fiona meets you by the community garden with a crate of peppers, canned beans, and one stubborn smile.",
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
        cost: state.nodeCost,
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
    await typeLine("You keep moving. Fiona watches you go with a basket that could have mattered later.", "warn", runToken);
    return;
  }

  changeBudget(-state.nodeCost);
  const gain = addCoverage(5);
  addSupplies(1);
  addNode("apartments", `garden roof relay installed (+${gain}% coverage)`);
  setLocation("apartments", "deployed", "Apartment rooftop linked. Food stores rise with trust.");
  await typeLine("The garden node comes online. Fiona packs your bag with produce before you even climb back down.", "success", runToken);
}

async function deployRadio(runToken) {
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
        cost: state.nodeCost,
      },
      {
        value: "lobby",
        label: "Mount it inside the lobby",
        description: "Safer, faster, and much worse for network geometry.",
        cost: state.nodeCost,
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

  changeBudget(-state.nodeCost);

  if (choice === "tower") {
    state.towerClimb = true;
    const gain = addCoverage(7);
    addNode("radio", `tower-top mount with Geo spotting the climb (+${gain}% coverage)`);
    setLocation("radio", "deployed", "Tower node mounted above the station roofline.");
    await typeLine("The tower sways, your hands shake, and the new relay paints a clean arc across central Ridgecrest.", "success", runToken);
    return;
  }

  const gain = addCoverage(4);
  addNode("radio", `interior station mount with reduced reach (+${gain}% coverage)`);
  setLocation("radio", "weak", "Safe install completed, but the station never reaches full potential.");
  await typeLine("You take the safe route. Geo does not judge you, but the coverage map absolutely does.", "warn", runToken);
}

async function deployHealth(runToken) {
  await typeBlock(
    [
      "Destination: Bast Health Center.",
      "Molly leads you behind the building where trees and wet branches turn the air into a green wall.",
      "Dense foliage here demands better hardware than a naked stock antenna.",
    ],
    "system",
    runToken
  );

  const basicCost = state.nodeCost;
  const highGainCost = state.nodeCost + 20;
  const choice = await promptChoice(
    ["Choose the clinic deployment package."],
    [
      {
        value: "basic",
        label: "Basic node only",
        description: "Cheaper, but leaves the clinic half-hidden behind the trees.",
        cost: basicCost,
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
    await typeLine("Molly thanks you anyway. The clinic joins the map, but every tree between you and town remains an enemy.", "warn", runToken);
    return;
  }

  changeBudget(-highGainCost);
  const gain = addCoverage(8);
  addNode("health", `high-gain clinic relay clears the tree line (+${gain}% coverage)`);
  setLocation("health", "deployed", "Clinic relay pushes cleanly through the canopy.");
  await typeLine("The upgraded antenna slices through the foliage. Bast Health now has a reliable lifeline.", "success", runToken);
}

async function actDeployment(runToken) {
  await typeBlock(
    [
      "ACT II // COMMUNITY DEPLOYMENT",
      "Ridgecrest is on the map. Choose your route carefully: every stop costs money, shapes the mesh, and changes who survives the outage together.",
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

    const handler = handlers[selected];
    await handler(runToken);
  }
}

async function actDiagnostics(runToken) {
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
    issues.push("Bast Health traffic is vanishing into foliage.");
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
      state.diagnosticsPatched = true;
      const gain = addCoverage(6);
      if (state.locationStatuses.valley.status === "weak") {
        setLocation("valley", "deployed", "Emergency field fix restored clean valley routing.");
      }
      if (state.locationStatuses.health.status === "weak") {
        setLocation("health", "deployed", "Emergency field fix restored clinic routing.");
      }
      await typeLine(`You burn $40 on a last-minute rescue and claw back +${gain}% coverage before the rain starts.`, "success", runToken);
    } else {
      await typeLine("You keep the cash. The dead zones stay exactly where the map warned they would.", "warn", runToken);
    }
  } else {
    await typeLine("Ping sweep returns green across every deployed corridor. No dead zones detected.", "success", runToken);
  }

  if (!state.validBand) {
    await typeLine("Secondary warning: the radios are operating on the wrong regional band, lowering town-wide efficiency.", "warn", runToken);
  }

  if (!state.validPreset) {
    await typeLine("Secondary warning: your preset choice is costing either range or battery endurance exactly when you need both.", "warn", runToken);
  }

  playAlarm();
  await typeBlock(
    [
      "Storm alert: derecho leading edge detected.",
      "Grid instability spikes. Lights flicker across Ridgecrest and then vanish sector by sector.",
      "Project Mesh becomes the only thing still awake.",
    ],
    "alert",
    runToken
  );
}

async function actMutualAid(runToken) {
  await typeBlock(
    [
      "Mutual aid request incoming.",
      "Sarah from two streets over asks for access so she can text family and trade outage updates through the mesh.",
    ],
    "system",
    runToken
  );

  const choice = await promptChoice(
    ["Grant Sarah access to the network?"],
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
    state.sarahHelped = true;
    addSupplies(1);
    await typeLine("Sarah sends her message and returns with a bag of tomatoes. Mutual aid becomes more than a slogan.", "success", runToken);
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
      code: "A",
      title: "The Resilient Utopia",
      className: "success",
      lines: [
        "ENDING A // THE RESILIENT UTOPIA",
        `Encrypted traffic hums through ${state.nodesDeployed.length} deployed nodes while Ridgecrest reorganizes itself around mutual aid instead of panic.`,
        state.solarSupport
          ? "Your solar-backed valley repeater keeps the mesh alive long after the blackout should have broken it."
          : "Even without a solar repeater on every line, your disciplined build keeps the network standing when the town needs it most.",
        "Neighbors use the channel to coordinate medicine, hot food, and shelter. By sunrise, the outage feels less like collapse and more like a town learning to move together.",
      ],
    };
  }

  if (state.encryption && coverage >= 22 && (state.deadZones || !scienceReady || !state.validBand || !state.validPreset)) {
    return {
      code: "B",
      title: "The Fractured Lifeline",
      className: "warn",
      lines: [
        "ENDING B // THE FRACTURED LIFELINE",
        "Your encrypted network works, but not for everyone who needed it.",
        "Some blocks stay connected while the valley edge, clinic corridor, or weakened relay path drops into silence.",
        "Ridgecrest survives in pockets. The people close to you make it through the night together, and the people just beyond your best signal do not hear the call.",
      ],
    };
  }

  if (!state.encryption && coverage >= 22) {
    return {
      code: "C",
      title: "The Open Frequency",
      className: "warn",
      lines: [
        "ENDING C // THE OPEN FREQUENCY",
        "The mesh spreads across town, and people absolutely use it.",
        "But the public channel means every anxious rumor, supply handoff, and family check-in leaks into the open air for anyone listening.",
        "You built a lifeline, then left it unshielded. Ridgecrest remembers the help and the vulnerability in equal measure.",
      ],
    };
  }

  if (lowCoverage && supplyShortage && (state.batteryFragile || configFailure || !state.solarSupport)) {
    return {
      code: "D",
      title: "The Dark Age",
      className: "alert",
      lines: [
        "ENDING D // THE DARK AGE",
        "Coverage never reached far enough, supplies stayed thin, and your weakest hardware choices fail exactly when the storm settles in.",
        "Basic batteries drain, unstable links vanish, and the terminal log fills with silence faster than messages.",
        "Project Mesh collapses before Ridgecrest can rely on it. Everyone waits in the dark for outside help that is still days away.",
      ],
    };
  }

  return {
    code: "B",
    title: "The Fractured Lifeline",
    className: "warn",
    lines: [
      "ENDING B // THE FRACTURED LIFELINE",
      "The network helps, but only in fragments.",
      "You proved the concept, but a missing high point, missing supplies, or too many skipped deployments leaves Ridgecrest unevenly connected.",
      "People remember your effort. They also remember where the signal stopped.",
    ],
  };
}

async function showEnding(runToken) {
  const ending = determineEnding();
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
    <span>Reset the terminal and try to secure Ridgecrest with a different route.</span>
    <small>Replay</small>
  `;
  restartButton.addEventListener("click", () => {
    playMenuBeep();
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
  dom.terminal.innerHTML = "";
  clearChoices();
  hideInput();
  refreshUi();
}

function bindControls() {
  dom.restartButton.addEventListener("click", () => {
    playMenuBeep();
    startGame();
  });

  dom.soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    dom.soundToggle.textContent = `Sound: ${soundEnabled ? "ON" : "OFF"}`;
    if (soundEnabled) {
      playMenuBeep();
    }
  });
}

async function startGame() {
  currentRunToken += 1;
  const runToken = currentRunToken;
  resetState();

  await typeBlock(
    [
      "========================================",
      " PROJECT MESH // RIDGECREST TERMINAL",
      "========================================",
      "Retro text survival simulator booted.",
      "Your choices decide the budget, network coverage, security posture, mutual aid supply chain, and the town's final night under the storm.",
    ],
    "system",
    runToken
  );

  await runGame(runToken);
}

bindControls();
refreshUi();
startGame();
