import type { AppLocale } from "@/stores/slices/appConfigSlice";

/**
 * In-house i18n message catalog.
 *
 * Pure static data — no deps. Each supported {@link AppLocale} maps every
 * {@link MessageKey} to its translated string. `en` is the source of truth for
 * the key set; other locales must provide the same keys (enforced by the
 * `Record<MessageKey, string>` value type below).
 *
 * Resolve strings through `@/hooks/useTranslation` (`t("key")`) — never read
 * this map directly from components.
 */

/** English source strings; the key set every locale must satisfy. */
const en = {
  // Topbar
  "topbar.tools": "tools",
  "topbar.save": "Save",
  "topbar.saving": "Saving…",
  "topbar.saved": "Saved",
  "topbar.error": "Error",
  "topbar.signOut": "Sign out",

  // Settings dialog
  "settings.title": "Settings",
  "settings.subtitle": "Preferences are stored on this device only.",
  "settings.reset": "Reset to defaults",

  // Appearance / theme
  "settings.theme": "Theme",
  "settings.theme.desc": "Color scheme for the app shell.",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.system": "System",

  // Language
  "settings.language": "Language",
  "settings.language.desc": "UI display language.",

  // Toggle settings
  "settings.reducedMotion": "Reduced motion",
  "settings.reducedMotion.desc":
    "Minimise animations and transitions across the app.",
  "settings.autoSave": "Auto-save",
  "settings.autoSave.desc":
    "Persist tool changes automatically without pressing Save.",
  "settings.confirmBeforeDelete": "Confirm before delete",
  "settings.confirmBeforeDelete.desc":
    "Ask for confirmation before deleting a tool or node.",
  "settings.sidebarCollapsed": "Collapse sidebar by default",
  "settings.sidebarCollapsed.desc": "Start with the tools sidebar collapsed.",

  // Tools panel
  "tools.title": "Tools",
  "tools.new": "New tool",
  "tools.search": "Search tools…",
  "tools.options": "Tool options",
  "tools.preview": "Preview",
  "tools.rename": "Rename",
  "tools.share": "Share",
  "tools.delete": "Delete",
  "tools.empty": "No tools yet — create one to get started.",
  "tools.noMatch": "No tools match “{q}”.",
  "tools.deleteTitle": "Delete tool?",
  "tools.deleteBodyTail":
    "and all its nodes will be permanently removed. This cannot be undone.",
  "tools.shareError": "Could not enable sharing.",
  "tools.shareCopied": "Share link copied!",
  "tools.previewError": "Could not open preview.",
  "tools.popupBlocked": "Pop-up blocked — allow pop-ups to preview.",

  // Builder panel
  "builder.title": "Builder",
  "builder.placement.panel": "panel",
  "builder.placement.inline": "inline",
  "builder.emptyTitle": "This tool is empty",
  "builder.emptyBody":
    "Add nodes from the Node panel. Start with a State Control.",
  "builder.addInput": "Add input",
  "builder.dropToAdd": "Drop to add node",
  "builder.tab.chat": "chat",
  "builder.toggleTools": "Toggle tools panel",
  "builder.toggleNode": "Toggle node panel",

  // Chat panel (UI-only preview chat)
  "chat.greeting": "How can I help you today?",
  "chat.subtitle": "Start a conversation — this is a preview interface.",
  "chat.placeholder": "Message Builder…",
  "chat.send": "Send",
  "chat.stop": "Stop",
  "chat.you": "You",
  "chat.assistant": "Assistant",
  "chat.newChat": "New chat",
  "chat.hint": "Enter to send · Shift + Enter for a new line",
  "chat.demoReply":
    "This is a UI-only preview, so I can’t reply for real yet — your message would be answered here.",
  "chat.suggest.1": "Build a word counter tool",
  "chat.suggest.2": "Add an AI summarizer to this tool",
  "chat.suggest.3": "Connect an HTTP request to a table",
  "chat.thinking": "Thinking…",
  "chat.retry": "Retry",
  "chat.provider": "Provider",
  "chat.model": "Model",
  "chat.unread": "New reply",
  "chat.plan.title": "Review build plan",
  "chat.plan.slots": "State slots",
  "chat.plan.steps": "Steps",
  "chat.plan.confirm": "Build it",
  "chat.plan.cancel": "Cancel",
  "chat.plan.confirmed":
    "I approve this plan — build it NOW. Immediately call the build tools: add_state_slot for each slot, get_node_docs before each node type, then add_node and update_node to add and wire every step, then get_tool to verify. Do NOT reply with the plan, do NOT output any JSON, and do NOT call propose_plan again. The approved plan:\n{plan}",
  "chat.plan.selfFix":
    "Self-review the tool you just built against the approved plan. Use get_tool to inspect the live nodes, their config, wiring, and any warnings, and check that each planned step is actually built, correctly connected, and that the tool will work end to end. For anything that does not match the plan or will not work, diagnose the ROOT CAUSE (not just the symptom), reply with a short bug-fix list (problem → root cause → fix), then fix each item with the build tools and re-check with get_tool. If everything matches the plan and works, reply that the build is complete. Approved plan —\n{plan}\nDo not ask again.",
  "chat.fix.title": "Reviewing & fixing",
  "chat.fix.reviewing": "Reviewing the build against the plan…",
  "chat.plan.cancelled": "Cancelled — don't build that plan.",
  "chat.plan.askApprove":
    "If this looks good, reply **yes** or **build it** and I'll create the nodes and wire them as described.",
  "chat.build.title": "Building your tool",
  "chat.build.step": "Step {n}",
  "chat.review.title": "Is this correct?",
  "chat.review.body":
    "I built the plan. Check the preview — does it work the way you wanted?",
  "chat.review.yes": "Yes, looks good",
  "chat.review.no": "No, fix it",
  "chat.review.fixing": "Finding the root cause and fixing…",
  "chat.review.fixRequest":
    "The build is NOT correct. Find the root cause and fix it.",
  "chat.error.generic": "Something went wrong. Try again.",
  "chat.error.noKey":
    "Add a {provider} API key (key icon, left panel) to chat.",

  // Node panel (palette)
  "palette.title": "Node",
  "palette.search": "Filter nodes…",
  "palette.empty": "No nodes match your filter.",
  "palette.footer": "Nodes run top-to-bottom along the chain.",
  "palette.group.Data": "Data",
  "palette.group.Inputs": "Inputs",
  "palette.group.Logic": "Logic",
  "palette.group.Website Site": "Website Site",

  // Docs
  "docs.title": "Docs",
  "docs.backToStudio": "Back to Studio",
  "docs.link": "Docs",
  "docs.cardHint": "Click a node for full details",
  "docs.detail.summary": "Overview",
  "docs.detail.whenToUse": "When to use",
  "docs.detail.config": "Configuration",
  "docs.detail.io": "State in / out",
  "docs.detail.reads": "Reads",
  "docs.detail.writes": "Writes",
  "docs.detail.none": "—",
  "docs.detail.tips": "Tips",
  "docs.detail.example": "Example",
  "docs.detail.close": "Close",

  // Node card + editor chrome
  "node.delete": "Delete node",
  "node.back": "Back to palette",
  "node.close": "Close editor",

  // Live preview pane
  "preview.title": "Live Preview",
  "preview.subtitle": "What your tool’s users will see",
  "preview.live": "Live",
  "preview.running": "Running chain…",
  "preview.empty": "Add an input node to render a preview.",
  "preview.off": "Live preview off",
  "preview.enable": "Enable preview",
  "preview.viewport.title": "Website viewport",
  "preview.viewport.invalid":
    "Invalid URL — only http(s) pages can be embedded.",
  "preview.viewport.setUrl": "Set a URL to load a website here.",
  "preview.json.invalid": "Invalid JSON: {msg}",
  "preview.csv.choose": "Choose CSV file…",
  "preview.csv.invalid": "Invalid CSV: {msg}",
  "preview.csv.summary": "{rows} rows · {cols} columns",
  "preview.csv.more": "+ {n} more rows",
  "preview.markdown.empty": "Nothing to preview yet.",
  "preview.select.placeholder": "Select…",
  "preview.file.choose": "Choose file…",
  "preview.file.loaded": "File loaded",
  "preview.image.choose": "Choose image…",
  "preview.image.change": "Change image…",
  "preview.ai.title": "AI Response",
  "preview.ai.empty": "AI response will appear here after running the chain.",

  // Node catalog — per node-type label + blurb (shown in palette, card, editor)
  "node.state.label": "State Control",
  "node.state.blurb": "Define & manage the shared state this tool operates on.",
  "node.text_run.label": "Text",
  "node.text_run.blurb":
    "Single-line field that triggers a run. Toggle run & reset to clear after running.",
  "node.button.label": "Button",
  "node.button.blurb":
    "Standalone action button that runs the chain — no text field. Optional reset button too.",
  "node.number.label": "Number",
  "node.number.blurb":
    "Numeric value with a slider + number field. Set min / max / step; two-way bound to state.",
  "node.select.label": "Select",
  "node.select.blurb":
    "Single-choice dropdown. Use a static option list or bind the options to a state array.",
  "node.toggle.label": "Toggle",
  "node.toggle.blurb": "Boolean on/off switch, two-way bound to state.",
  "node.date.label": "Date / Time",
  "node.date.blurb":
    "Date, time, or date-time picker. The native value writes straight to bound state.",
  "node.file.label": "File upload",
  "node.file.blurb":
    "Upload any file. Encodes it as text, base64, or a data URL into bound state.",
  "node.image.label": "Image upload",
  "node.image.blurb":
    "Upload an image with a live preview. Writes a data URL — feeds AI vision.",
  "node.textarea.label": "Textarea",
  "node.textarea.blurb": "Multi-line text field, e.g. a message body.",
  "node.markdown.label": "Markdown",
  "node.markdown.blurb":
    "Multi-line Markdown field with a live rendered preview toggle.",
  "node.json.label": "JSON",
  "node.json.blurb":
    "Paste or edit JSON in a code editor. Valid JSON auto-formats; raw source writes to bound state.",
  "node.csv.label": "CSV",
  "node.csv.blurb":
    "Upload a CSV file. Parsed rows (typed, empty rows/columns dropped) write to bound state as an array.",
  "node.table.label": "Table",
  "node.table.blurb":
    "Display bound array data in a sortable, resizable, paginated table. Data is auto-optimized for display.",
  "node.code_input.label": "Code editor",
  "node.code_input.blurb":
    "Write or paste code in a Monaco editor with a selectable language; raw source writes to bound state.",
  "node.viewport.label": "View Port",
  "node.viewport.blurb":
    "Embed a website by URL in a sandboxed frame. Bind a state slot to drive the URL at runtime.",
  "node.convert_html.label": "Convert to HTML",
  "node.convert_html.blurb":
    "Copy a View Port page's static layout — HTML with its CSS inlined — into a state slot.",
  "node.themed.label": "Themed",
  "node.themed.blurb":
    "Read static page HTML from state and click any element to recolor it — every identical element updates too.",
  "node.html_sanitize.label": "HTML Sanitize",
  "node.html_sanitize.blurb":
    "Clean HTML from a state slot with sanitize-html — strips scripts & unsafe markup; output writes to bound state.",
  "node.code.label": "Code",
  "node.code.blurb": "A code block for custom logic / processing.",
  "node.ts_type.label": "TS Type Converter",
  "node.ts_type.blurb":
    "Convert JSON from a state slot into TypeScript interfaces; output writes to bound state.",
  "node.http_request.label": "HTTP Request",
  "node.http_request.blurb":
    "Call a real API through a server proxy. Method, URL, headers & body interpolate state; response writes to bound state.",
  "node.filter.label": "Filter",
  "node.filter.blurb":
    "Keep array rows whose field matches a condition; output writes to bound state.",
  "node.map.label": "Map / Transform",
  "node.map.blurb":
    "Reshape array rows into new objects by mapping output keys to source paths.",
  "node.sort.label": "Sort",
  "node.sort.blurb":
    "Order an array by a field, as text / number / date, ascending or descending.",
  "node.merge.label": "Merge / Join",
  "node.merge.blurb":
    "Join two state arrays on a key — right fields spread over matching left rows.",
  "node.template.label": "Template / String",
  "node.template.blurb":
    "Interpolate {{name}} state tokens into a text template; result writes to bound state.",
  "node.regex.label": "Regex",
  "node.regex.blurb":
    "Test, match, extract groups, or replace over a string with a regular expression.",
  "node.jsonpath.label": "JSONPath / Query",
  "node.jsonpath.blurb":
    "Pull a nested value out of JSON with a dotted/bracketed path (e.g. data.items[0].name).",
  "node.math.label": "Math / Expression",
  "node.math.blurb":
    "Evaluate a math expression over state (e.g. price * qty, sqrt, units, fractions) via mathjs; no JS eval.",
  "node.schema_validate.label": "Schema Validate",
  "node.schema_validate.blurb":
    "Check JSON shape against required field + type rules; writes a boolean to gate the chain.",
  "node.encode.label": "Encode / Decode",
  "node.encode.blurb":
    "Base64 / URL encode-decode, or a one-way SHA-256 hash over a string; output writes to state.",
  "node.canvas.label": "HTML Canvas",
  "node.canvas.blurb":
    "A free-form HTML div you populate with elements via JS.",
  "node.ai.label": "AI",
  "node.ai.blurb":
    "Ask Gemini or OpenRouter. Interpolate state via {{name}} in the prompt; reply writes to bound state.",

  // Node editor — shared field labels / placeholders
  "field.fieldLabel": "Field label",
  "field.description": "Description",
  "field.descPlaceholder": "Optional helper text shown below the label",
  "field.placeholder": "Placeholder",
  "field.buttonText": "Button text",
  "field.runButtonText": "Run button text",
  "field.resetButtonText": "Reset button text",
  "field.stateBinding": "State binding",
  "field.stateBinding.help": "Which state this node reads from / writes to.",
  "field.editorHeight": "Editor height (px)",
  "field.editorHeight.help":
    "Initial field height in the preview ({min}–{max}px).",
  "field.noState": "— no state —",
  "field.pickState": "Pick state…",
  "field.none": "— none —",

  // Node editor — toggles
  "toggle.runButton": "Run button",
  "toggle.runButton.desc": "Show a run button and submit on Enter.",
  "toggle.resetButton": "Reset button",
  "toggle.resetButton.descText":
    "Clear the field after each run and show a reset button.",
  "toggle.resetButton.descButton":
    "Show a reset button beside the action button.",

  // Node editor — run/reset targets
  "targets.run": "Run targets",
  "targets.reset": "Reset targets",
  "targets.run.empty":
    "No code, TS type, or AI nodes in this tool yet. Add some to target them.",
  "targets.reset.empty":
    "No code nodes in this tool yet. Add some to target them.",
  "targets.all": "All {n} nodes",
  "targets.selected": "{n} selected",
  "targets.help.runAll": "Nothing checked — run the whole chain.",
  "targets.help.resetAll": "Nothing checked — reset the whole chain.",
  "targets.help.runSome": "Runs {n} selected nodes, in chain order.",
  "targets.help.resetSome": "Resets {n} selected nodes, in chain order.",

  // Node editor — State Control
  "state.unnamed": "unnamed",
  "state.copyName": "Copy variable name",
  "state.options": "Variable options",
  "state.rename": "Rename variable",
  "state.setDefault": "Set default value",
  "state.remove": "Remove variable",
  "state.defaultPlaceholder": "default value",
  "state.add": "Add state",

  // Node editor — AI
  "ai.provider": "Provider",
  "ai.model": "Model",
  "ai.model.help": "Pick from list or type any model id.",
  "ai.prompt": "Prompt",
  "ai.prompt.help": "Use {{stateName}} to interpolate state.",
  "ai.output": "Output state",
  "ai.output.help": "Model reply writes here.",
  "ai.markdownOut": "Markdown output",
  "ai.markdownOut.desc": "Render reply as Markdown in the preview.",

  // Node editor — TS Type Converter
  "tstype.descPlaceholder": "What this converter is for",
  "tstype.root": "Root type name",
  "tstype.root.help": "Name of the generated top-level interface/type.",
  "tstype.input": "Input state (JSON source)",
  "tstype.input.help":
    "State slot holding the JSON to convert — bind a JSON input node here.",
  "tstype.output": "Output state (TypeScript)",
  "tstype.output.help":
    "Generated declarations write here. Updates live as the JSON changes; invalid JSON keeps the last output (runs report the parse error).",

  // Node editor — HTML Sanitize
  "sanitize.descPlaceholder": "What this sanitizer is for",
  "sanitize.input": "Input state (HTML)",
  "sanitize.input.help":
    "State slot holding the raw HTML — bind a Convert to HTML node’s output here.",
  "sanitize.output": "Output state (clean HTML)",
  "sanitize.output.help":
    "Sanitized HTML writes here. Updates live as the input changes — bind a Themed node to recolor the cleaned page.",
  "sanitize.keepStyles": "Keep styles",
  "sanitize.keepStyles.desc":
    "Preserve <style> blocks, inline style, and class/id (keeps theming intact). Synced across all HTML Sanitize nodes.",
  "sanitize.keepImages": "Keep images",
  "sanitize.keepImages.desc":
    "Preserve <img>/<picture> and their src, including data: image URIs. Synced across all HTML Sanitize nodes.",
  "sanitize.footer":
    "Always strips scripts, event handlers, unsafe URL schemes, and embedding tags (iframe / object / embed). Runs in the chain and live as the input changes.",

  // Node editor — website shared
  "web.defaultScreen": "Default screen",
  "web.pickScreen": "Pick screen…",
  "web.defaultScreen.help":
    "Screen the preview opens with — end users can still switch between fill / desktop / mobile. Fixed screens render at device width and scale to fit (width simulation; the site still sees a desktop browser).",
  "web.livePreview": "Live preview",
  "web.livePreview.desc":
    "Render the frame in the preview. Off by default — saves loading the page until you turn it on.",

  // Node editor — View Port
  "viewport.url": "URL",
  "viewport.url.help":
    "Page shown in the preview. A bare domain gets https:// prepended.",
  "viewport.urlState": "URL state (optional)",
  "viewport.urlState.help":
    "When the bound state holds a non-empty string it overrides the URL above — bind a text input or write it from a code node.",
  "viewport.footer":
    "The page loads in a sandboxed iframe. Sites that forbid embedding (X-Frame-Options / frame-ancestors) render blank — that is the remote site’s policy, not an error in your tool.",

  // Node editor — Convert to HTML
  "convert.source": "Source View Port",
  "convert.pickVp": "Pick View Port…",
  "convert.auto": "Auto — first View Port",
  "convert.vpFallback": "View Port",
  "convert.source.helpEmpty":
    "No View Port nodes yet — add one; this node copies its page.",
  "convert.source.help":
    "Whose page gets copied. Tracks the View Port’s URL, including state-driven overrides.",
  "convert.output": "Output state (HTML)",
  "convert.output.help":
    "The page’s static HTML (CSS inlined) writes here — bind a Themed node or read it from code nodes.",
  "convert.footer":
    "Copies the page’s static layout server-side — HTML with its linked CSS inlined, scripts removed — shows the snapshot, and offers a copy-to-clipboard button in the preview.",

  // Node editor — Themed
  "themed.htmlState": "HTML state",
  "themed.htmlState.help":
    "State slot holding the static page HTML to recolor — bind a Convert to HTML node’s output here. No View Port connection.",
  "themed.footer":
    "Click any element in the preview to recolor it — every identical element (same tag & classes) updates too. Scripts removed.",

  // Node editor — Code
  "code.descPlaceholder": "What this code block does",
  "code.code": "Code",
  "code.code.help":
    "Runs top-to-bottom in the chain; reads & writes state directly.",

  // Node editor — HTML Canvas
  "canvas.elementId": "Element ID",
  "canvas.elementId.help": "Auto-generated UUID. Target this div from your JS.",
  "canvas.htmljs": "HTML / JS",
  "canvas.htmljs.help": "Populates the div above.",

  // Node editor — Button
  "button.labelOptional": "Label (optional)",
  "button.labelPlaceholder": "Heading shown above the button",
  "button.footer": "Runs over current state — no input field.",

  // Node editor — Markdown / JSON / CSV / Table / Code editor helpers
  "markdown.help":
    "End users write Markdown and can toggle a live rendered preview.",
  "json.help":
    "End users paste or edit JSON in a code editor; valid JSON auto-formats. The raw source string lands in the bound state — use JSON.parse(state.get(…)) in code nodes.",
  "csv.header": "Header row",
  "csv.header.desc":
    "First row is column names — rows become objects keyed by header.",
  "csv.help":
    "End users upload a .csv file. The parsed rows land in the bound state as an array (typed values, empty rows/columns dropped) — iterate state.get(…) directly in code nodes.",
  "table.rowsPerPage": "Rows per page",
  "table.pickPageSize": "Pick page size…",
  "table.rows": "{n} rows",
  "table.help":
    "Default page size in the preview — end users can switch between {sizes}.",
  "table.footer":
    "Displays the bound state as a table — bind an array (e.g. CSV rows, a JSON array, or a code-node result). Data is auto-optimized for display; every column sorts (text, numbers, and auto-detected dates) and resizes by dragging the header edge.",
  "codeInput.language": "Language",
  "codeInput.pickLanguage": "Pick language…",
  "codeInput.language.help":
    "Drives syntax highlighting in the preview editor.",
  "codeInput.help":
    "End users write or paste code in a Monaco editor. The raw source string lands in the bound state — it is never executed.",

  // Number node
  "number.min": "Min",
  "number.max": "Max",
  "number.step": "Step",
  "number.help":
    "End users drag the slider or type a value. The number is written to the bound state as a string.",

  // Select node
  "select.options": "Options",
  "select.labelPlaceholder": "Label",
  "select.valuePlaceholder": "Value",
  "select.addOption": "Add option",
  "select.removeOption": "Remove option",
  "select.optionsState": "Options from state",
  "select.optionsState.help":
    "Optional. Bind a state slot holding an array (of strings or {value, label} objects) to drive the options at runtime — overrides the static list above.",

  // Toggle node
  "toggle.help":
    'Renders an on/off switch. The bound state holds "true" or "false".',

  // Date / Time node
  "date.mode": "Picker",
  "date.mode.help": "Which native picker the end user sees.",

  // File upload node
  "file.format": "Output format",
  "file.format.help":
    "How the chosen file is encoded into state: Text (UTF-8 contents), Base64 (raw, no prefix), or a Data URL.",
  "file.accept": "Accept filter",
  "file.accept.help":
    "Optional native filter (e.g. .pdf,.txt or image/*). Leave blank to allow any file.",

  // Image upload node
  "image.help":
    "End users upload an image; a data URL is written to the bound state — ready to feed an AI vision prompt or render elsewhere.",

  // Shared logic-node fields
  "logic.input": "Input state",
  "logic.output": "Output state",
  "logic.field": "Field path",
  "logic.field.help":
    "Dotted path into each row (e.g. user.name, items[0].name). Keys with spaces work as-is (e.g. Happy Birthday). Start with $ for full JSONPath (e.g. $.items[*].price, $['Happy Birthday']). Leave blank for the row itself.",

  // HTTP Request node
  "http.method": "Method",
  "http.url": "URL",
  "http.url.help":
    "Supports {{state}} interpolation. Requested through a server proxy (public http(s) only).",
  "http.headers": "Headers",
  "http.addHeader": "Add header",
  "http.removeHeader": "Remove header",
  "http.headerKey": "Header",
  "http.headerValue": "Value",
  "http.input": "Input state",
  "http.input.help":
    "Optional: bind a state slot to reference as {{input}} in the URL, headers, or body.",
  "http.body": "Body",
  "http.body.help":
    "Sent for POST / PUT / PATCH. Supports {{state}} interpolation.",
  "http.responseType": "Response",
  "http.output.help":
    "The parsed response is written here. JSON responses land as a parsed value.",
  "http.footer":
    "Runs only when the chain runs — never live as you type. Auth headers stay server-side.",

  // Filter node
  "filter.operator": "Operator",
  "filter.value": "Value",
  "filter.op.eq": "equals",
  "filter.op.neq": "not equals",
  "filter.op.gt": "greater than",
  "filter.op.gte": "greater or equal",
  "filter.op.lt": "less than",
  "filter.op.lte": "less or equal",
  "filter.op.contains": "contains",
  "filter.op.startsWith": "starts with",
  "filter.op.endsWith": "ends with",
  "filter.op.exists": "exists",
  "filter.op.notExists": "does not exist",
  "filter.help":
    "Keeps rows from the input array where the field satisfies the condition.",

  // Map node
  "map.fields": "Field mapping",
  "map.to": "Output key",
  "map.from": "Source path",
  "map.addField": "Add field",
  "map.removeField": "Remove field",
  "map.help":
    "Builds a new object per row: each output key copies the value at its source path.",

  // Sort node
  "sort.direction": "Direction",
  "sort.type": "Compare as",
  "sort.dir.asc": "Ascending",
  "sort.dir.desc": "Descending",
  "sort.type.string": "Text",
  "sort.type.number": "Number",
  "sort.type.date": "Date",
  "sort.help": "Orders the input array by the field path.",

  // Merge / Join node
  "merge.rightInput": "Right array (state)",
  "merge.leftKey": "Left key",
  "merge.rightKey": "Right key",
  "merge.joinKind": "Join",
  "merge.join.inner": "Inner (matched only)",
  "merge.join.left": "Left (keep unmatched)",
  "merge.help":
    "Joins left + right rows where the keys match; right fields override left.",

  // Template node
  "template.template": "Template",
  "template.template.help":
    "Use {{stateName}} tokens. They are replaced with the current state values.",

  // Regex node
  "regex.pattern": "Pattern",
  "regex.flags": "Flags",
  "regex.mode": "Mode",
  "regex.replacement": "Replacement",
  "regex.replacement.help":
    "Used in Replace mode. Supports $1, $2… group references.",
  "regex.mode.test": "Test (true/false)",
  "regex.mode.match": "Match",
  "regex.mode.extract": "Extract groups",
  "regex.mode.replace": "Replace",
  "regex.help": "Runs the regular expression over the input string.",

  // JSONPath node
  "jsonpath.path": "Path",
  "jsonpath.path.help":
    "Dotted / bracketed path, e.g. data.items[0].name. Start with $ for full JSONPath: $.items[*].price (all prices), $..name (recursive), $.items[?(@.price>10)] (filter), $['Happy Birthday'] (spaced key). Many matches return an array.",
  "jsonpath.help": "Resolves a nested value out of the input JSON.",
  "jsonpath.docs.title": "JSONPath cheatsheet",
  "jsonpath.docs": `Two path styles are supported.

SIMPLE (no leading $)
  status              top-level key
  user.name          nested key
  items[0]           array index
  items[0].name      index then key
  Happy Birthday     keys may contain spaces
  (a literal dot inside a key name is NOT reachable here — use $ form)

JSONPATH (start with $)
  $                   the whole input
  $.user.name        nested key
  $['Happy Birthday'] key with spaces / dots — bracket-quote it
  $[*]                every item of a root array
  $.items[*]         every item of an array
  $[*]['Last Name']  one field from every row  →  array
  $..name             recursive — name at any depth
  $.items[0,2]        multiple indexes
  $.items[1:3]        slice (start:end)
  $.items[-1:]        last item
  $.items[?(@.price>10)]      filter by expression
  $.items[?(@.active==true)]  filter by equality
  $[?(@['Last Name']=='Baxter')]  filter on a spaced key

RESULT SHAPE
  0 matches → empty / undefined
  1 match  → the value itself (scalar)
  2+ matches → an array of values

COMMON MISTAKE
  Root is already an array? Do NOT add .items.
  [{...},{...}]  →  $[*]['Last Name']   (not $.items[*]...)`,

  // Math node
  "math.expression": "Expression",
  "math.expression.help":
    "Reference state slots by name (e.g. price * qty). Powered by mathjs — functions, units, and fractions allowed; no JS eval.",
  "math.docs.title": "Expression cheatsheet",
  "math.docs": `Evaluated by mathjs. Reference any state slot by its name.

VARIABLES
  price * qty         multiply two state slots
  state1 + 5          slot plus a literal
  (a + b) / 2         parentheses group as expected
  (numeric-looking slots coerce to numbers; others pass through)

OPERATORS
  + - * /             add subtract multiply divide
  %                   modulo (remainder)
  ^                   power   →  2 ^ 10 = 1024
  ( )                 grouping

FUNCTIONS
  round(x)  floor(x)  ceil(x)  abs(x)
  sqrt(x)   cbrt(x)   pow(x,y)  exp(x)  log(x, base)
  min(a,b,...)  max(a,b,...)  mean(a,b,...)  sum(a,b,...)
  sin cos tan  (radians)  +  full mathjs library

CONSTANTS
  pi          3.14159...
  e           2.71828...

EXAMPLES
  round(total / count)           average, rounded
  sqrt(x ^ 2 + y ^ 2)            hypotenuse
  pi * r ^ 2                     circle area
  max(a, b, c)                   largest of three
  subtotal * 1.07                add 7% tax

FRACTIONS & UNITS
  1/3 + 1/6                      → 0.5
  2 inch to cm                   → 5.08 cm
  3 ft + 4 inch in cm            unit arithmetic

NOTES
  Empty expression or no output slot → node is skipped.
  Result must be a finite value; otherwise the node errors.`,

  // Schema Validate node
  "schema.rules": "Required fields",
  "schema.ruleField": "Field path",
  "schema.ruleType": "Type",
  "schema.addRule": "Add rule",
  "schema.removeRule": "Remove rule",
  "schema.errorOutput": "Errors state (optional)",
  "schema.errorOutput.help":
    "Optional state slot the newline-joined problem list is written into.",
  "schema.type.any": "Any",
  "schema.type.string": "String",
  "schema.type.number": "Number",
  "schema.type.boolean": "Boolean",
  "schema.type.object": "Object",
  "schema.type.array": "Array",
  "schema.help":
    'Writes "true"/"false" — gate the chain with a downstream Filter or Code node.',

  // Encode / Decode node
  "encode.operation": "Operation",
  "encode.help":
    "Transforms the input string. SHA-256 is a one-way hash (hex).",

  // Common
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.rename": "Rename",
  "common.copy": "Copy",

  // Welcome splash (post-login branding screen)
  "welcome.eyebrow": "Welcome back",
  "welcome.title": "Your studio is ready.",
  "welcome.subtitle":
    "Compose tools as a top-to-bottom chain of input, logic, and output nodes — with a live, interactive preview. No backend required.",
  "welcome.enter": "Enter studio",
  "welcome.node.input": "Input",
  "welcome.node.logic": "Logic",
  "welcome.node.output": "Output",
} as const;

/** A valid translation key. */
export type MessageKey = keyof typeof en;

/** Burmese (my) translations — must cover every {@link MessageKey}. */
const my: Record<MessageKey, string> = {
  "topbar.tools": "ကိရိယာများ",
  "topbar.save": "သိမ်းမည်",
  "topbar.saving": "သိမ်းနေသည်…",
  "topbar.saved": "သိမ်းပြီး",
  "topbar.error": "အမှား",
  "topbar.signOut": "ထွက်မည်",

  "settings.title": "ဆက်တင်များ",
  "settings.subtitle": "ဦးစားပေးချက်များကို ဤစက်ပစ္စည်းတွင်သာ သိမ်းဆည်းသည်။",
  "settings.reset": "မူလအတိုင်း ပြန်ထားမည်",

  "settings.theme": "အသွင်အပြင်",
  "settings.theme.desc": "အက်ပ်အတွက် အရောင်စနစ်။",
  "theme.light": "အလင်း",
  "theme.dark": "အမှောင်",
  "theme.system": "စနစ်အလိုက်",

  "settings.language": "ဘာသာစကား",
  "settings.language.desc": "မျက်နှာပြင် ပြသမည့်ဘာသာစကား။",

  "settings.reducedMotion": "လှုပ်ရှားမှု လျှော့ချ",
  "settings.reducedMotion.desc":
    "အက်ပ်တစ်ခုလုံးရှိ အန်နီမေးရှင်းနှင့် အကူးအပြောင်းများကို လျှော့ချသည်။",
  "settings.autoSave": "အလိုအလျောက် သိမ်းဆည်း",
  "settings.autoSave.desc":
    "Save ကိုမနှိပ်ဘဲ ကိရိယာအပြောင်းအလဲများကို အလိုအလျောက် သိမ်းဆည်းသည်။",
  "settings.confirmBeforeDelete": "မဖျက်မီ အတည်ပြုခိုင်း",
  "settings.confirmBeforeDelete.desc":
    "ကိရိယာ သို့မဟုတ် node တစ်ခုကို မဖျက်မီ အတည်ပြုချက်တောင်းသည်။",
  "settings.sidebarCollapsed": "Sidebar ကို မူရင်းအတိုင်း ခေါက်ထား",
  "settings.sidebarCollapsed.desc":
    "ကိရိယာ sidebar ကို ခေါက်ထားသည့်အနေအထားဖြင့် စတင်သည်။",

  "tools.title": "ကိရိယာများ",
  "tools.new": "ကိရိယာ အသစ်",
  "tools.search": "ကိရိယာ ရှာရန်…",
  "tools.options": "ကိရိယာ ရွေးချယ်စရာများ",
  "tools.preview": "အစမ်းကြည့်",
  "tools.rename": "အမည်ပြောင်း",
  "tools.share": "မျှဝေ",
  "tools.delete": "ဖျက်",
  "tools.empty": "ကိရိယာ မရှိသေးပါ — တစ်ခု ဖန်တီး၍ စတင်ပါ။",
  "tools.noMatch": "“{q}” နှင့် ကိုက်ညီသော ကိရိယာ မရှိပါ။",
  "tools.deleteTitle": "ကိရိယာ ဖျက်မလား။",
  "tools.deleteBodyTail":
    "နှင့် ၎င်း၏ node အားလုံးကို အပြီးအပိုင် ဖျက်ပစ်မည်။ ပြန်လည် ရယူ၍ မရပါ။",
  "tools.shareError": "မျှဝေခြင်း ဖွင့်၍ မရပါ။",
  "tools.shareCopied": "မျှဝေ လင့်ခ် ကူးယူပြီးပါပြီ။",
  "tools.previewError": "အစမ်းကြည့်ခြင်း ဖွင့်၍ မရပါ။",
  "tools.popupBlocked":
    "Pop-up ပိတ်ထားသည် — အစမ်းကြည့်ရန် pop-up ကို ခွင့်ပြုပါ။",

  "builder.title": "တည်ဆောက်ရေး",
  "builder.placement.panel": "ဘေးတန်း",
  "builder.placement.inline": "အတွင်း",
  "builder.emptyTitle": "ဤကိရိယာသည် ဗလာဖြစ်နေသည်",
  "builder.emptyBody":
    "Node panel မှ node များ ထည့်ပါ။ State Control ဖြင့် စတင်ပါ။",
  "builder.addInput": "Input ထည့်",
  "builder.dropToAdd": "Node ထည့်ရန် ချပါ",
  "builder.tab.chat": "ချတ်",
  "builder.toggleTools": "ကိရိယာ panel ပြ/ဖျောက်",
  "builder.toggleNode": "Node panel ပြ/ဖျောက်",

  "chat.greeting": "ဘာများ ကူညီပေးရမလဲ။",
  "chat.subtitle": "စကားစမြည် စတင်ပါ — ဤသည် preview မျက်နှာပြင် ဖြစ်သည်။",
  "chat.placeholder": "Builder သို့ စာပို့…",
  "chat.send": "ပို့",
  "chat.stop": "ရပ်",
  "chat.you": "သင်",
  "chat.assistant": "Assistant",
  "chat.newChat": "ချတ် အသစ်",
  "chat.hint": "ပို့ရန် Enter · စာကြောင်းသစ်အတွက် Shift + Enter",
  "chat.demoReply":
    "ဤသည် UI-only preview ဖြစ်သဖြင့် တကယ် ပြန်မဖြေနိုင်သေးပါ — သင့်စာကို ဤနေရာတွင် ဖြေကြားပေးမည်။",
  "chat.suggest.1": "စကားလုံး ရေတွက်သည့် tool တည်ဆောက်",
  "chat.suggest.2": "ဤ tool တွင် AI အကျဉ်းချုပ် ထည့်",
  "chat.suggest.3": "HTTP request ကို table နှင့် ချိတ်ဆက်",
  "chat.thinking": "စဉ်းစားနေသည်…",
  "chat.retry": "ပြန်ကြိုးစား",
  "chat.provider": "Provider",
  "chat.model": "Model",
  "chat.unread": "စာ အသစ်",
  "chat.plan.title": "တည်ဆောက်မှု အစီအစဉ် စစ်ဆေးပါ",
  "chat.plan.slots": "State slots",
  "chat.plan.steps": "အဆင့်များ",
  "chat.plan.confirm": "တည်ဆောက်",
  "chat.plan.cancel": "ပယ်ဖျက်",
  "chat.plan.confirmed":
    "ဤအစီအစဉ်ကို အတည်ပြုပါသည် — ယခု ချက်ချင်း တည်ဆောက်ပါ။ build tools များကို ချက်ချင်း ခေါ်ပါ — slot တစ်ခုစီအတွက် add_state_slot၊ node အမျိုးအစားတစ်ခုစီမတိုင်မီ get_node_docs၊ ပြီးနောက် အဆင့်တိုင်းကို add_node နှင့် update_node ဖြင့် ထည့်ပြီး ချိတ်ဆက်ပါ၊ ပြီးလျှင် get_tool ဖြင့် စစ်ဆေးပါ။ အစီအစဉ်ကို ပြန်မဖြေပါနှင့်၊ JSON ထုတ်မပြပါနှင့်၊ propose_plan ကိုလည်း ထပ်မခေါ်ပါနှင့်။ အတည်ပြုထားသော အစီအစဉ်—\n{plan}",
  "chat.plan.selfFix":
    "သင် တည်ဆောက်ပြီးသော tool ကို အတည်ပြုပြီး အစီအစဉ်နှင့် ကိုယ်တိုင် ပြန်စစ်ပါ။ get_tool ဖြင့် live nodes, ၎င်းတို့၏ config, ချိတ်ဆက်မှုနှင့် warning များကို စစ်ဆေးပြီး အစီအစဉ် အဆင့်တစ်ခုစီ တကယ် တည်ဆောက်ထား၊ မှန်ကန်စွာ ချိတ်ဆက်ထား၊ tool အစအဆုံး အလုပ်လုပ်မှု ရှိမရှိ စစ်ပါ။ အစီအစဉ်နှင့် မကိုက်ညီ သို့မဟုတ် အလုပ်မလုပ်သည့် အရာများအတွက် ROOT CAUSE (လက္ခဏာသက်သက် မဟုတ်) ကို ရှာဖွေ၍ bug-fix စာရင်း (ပြဿနာ → root cause → ပြင်နည်း) ကို အတိုချုပ် ဖြေပြီး၊ build tools ဖြင့် တစ်ခုစီ ပြင်ကာ get_tool ဖြင့် ပြန်စစ်ပါ။ အားလုံး ကိုက်ညီ၍ အလုပ်လုပ်လျှင် တည်ဆောက်မှု ပြီးစီးကြောင်း ဖြေပါ။ အတည်ပြုပြီး အစီအစဉ် —\n{plan}\nထပ်မမေးပါနှင့်။",
  "chat.fix.title": "ပြန်စစ်ပြီး ပြင်ဆင်နေသည်",
  "chat.fix.reviewing": "တည်ဆောက်မှုကို အစီအစဉ်နှင့် ပြန်စစ်နေသည်…",
  "chat.plan.cancelled": "ပယ်ဖျက်လိုက်ပြီ — ထို အစီအစဉ်ကို မတည်ဆောက်ပါနှင့်။",
  "chat.plan.askApprove":
    "ကောင်းပါက **yes** သို့မဟုတ် **build it** ဟု ပြန်ဖြေပါ — ဖော်ပြထားသည့်အတိုင်း node များ ဖန်တီးပြီး ချိတ်ဆက်ပေးပါမည်။",
  "chat.build.title": "သင့် tool ကို တည်ဆောက်နေသည်",
  "chat.build.step": "အဆင့် {n}",
  "chat.review.title": "ဒါ မှန်ပါသလား?",
  "chat.review.body":
    "အစီအစဉ်အတိုင်း တည်ဆောက်ပြီးပါပြီ။ Preview ကို စစ်ကြည့်ပါ — သင်လိုချင်သလို အလုပ်လုပ်ပါသလား?",
  "chat.review.yes": "ဟုတ်ကဲ့၊ ကောင်းပါသည်",
  "chat.review.no": "မဟုတ်ပါ၊ ပြင်ပါ",
  "chat.review.fixing": "မူရင်းအကြောင်းရင်းကို ရှာပြီး ပြင်ဆင်နေသည်…",
  "chat.review.fixRequest":
    "တည်ဆောက်မှု မှန်ကန်မှု မရှိပါ။ မူရင်းအကြောင်းရင်းကို ရှာပြီး ပြင်ဆင်ပါ။",
  "chat.error.generic": "တစ်ခုခု မှားယွင်းသွားသည်။ ပြန်ကြိုးစားပါ။",
  "chat.error.noKey":
    "ချတ်ရန် {provider} API key (key အိုင်ကွန်၊ ဘယ်ဘက် panel) ထည့်ပါ။",

  "palette.title": "Node များ",
  "palette.search": "Node များ စစ်ထုတ်…",
  "palette.empty": "စစ်ထုတ်မှုနှင့် ကိုက်ညီသော node မရှိပါ။",
  "palette.footer":
    "Node များသည် ကွင်းဆက်အတိုင်း အပေါ်မှအောက်သို့ လုပ်ဆောင်သည်။",
  "palette.group.Data": "ဒေတာ",
  "palette.group.Inputs": "ထည့်သွင်းမှုများ",
  "palette.group.Logic": "ယုတ္တိ",
  "palette.group.Website Site": "ဝဘ်ဆိုက်",

  // Docs
  "docs.title": "စာရွက်စာတမ်း",
  "docs.backToStudio": "Studio သို့ ပြန်",
  "docs.link": "စာရွက်စာတမ်း",
  "docs.cardHint": "အသေးစိတ်အတွက် node ကို နှိပ်ပါ",
  "docs.detail.summary": "ခြုံငုံသုံးသပ်ချက်",
  "docs.detail.whenToUse": "အသုံးပြုသင့်သည့်အချိန်",
  "docs.detail.config": "ပြင်ဆင်သတ်မှတ်ချက်",
  "docs.detail.io": "State ဝင်/ထွက်",
  "docs.detail.reads": "ဖတ်သည်",
  "docs.detail.writes": "ရေးသည်",
  "docs.detail.none": "—",
  "docs.detail.tips": "အကြံပြုချက်များ",
  "docs.detail.example": "ဥပမာ",
  "docs.detail.close": "ပိတ်",

  "node.delete": "Node ဖျက်",
  "node.back": "Palette သို့ ပြန်",
  "node.close": "တည်းဖြတ်မှု ပိတ်",

  "preview.title": "တိုက်ရိုက် အစမ်းကြည့်ရှု",
  "preview.subtitle": "သင့်ကိရိယာ၏ အသုံးပြုသူများ မြင်ရမည့်အရာ",
  "preview.live": "တိုက်ရိုက်",
  "preview.running": "ကွင်းဆက် လုပ်ဆောင်နေသည်…",
  "preview.empty": "အစမ်းကြည့်ရန် input node တစ်ခု ထည့်ပါ။",
  "preview.off": "တိုက်ရိုက် အစမ်းကြည့်ခြင်း ပိတ်ထားသည်",
  "preview.enable": "အစမ်းကြည့်ခြင်း ဖွင့်",
  "preview.viewport.title": "ဝဘ်ဆိုက် viewport",
  "preview.viewport.invalid":
    "URL မမှန်ပါ — http(s) စာမျက်နှာများသာ ထည့်သွင်း၍ ရသည်။",
  "preview.viewport.setUrl": "ဝဘ်ဆိုက် ဖွင့်ရန် URL တစ်ခု သတ်မှတ်ပါ။",
  "preview.json.invalid": "JSON မမှန်ပါ — {msg}",
  "preview.csv.choose": "CSV ဖိုင် ရွေးပါ…",
  "preview.csv.invalid": "CSV မမှန်ပါ — {msg}",
  "preview.csv.summary": "{rows} တန်း · {cols} ကော်လံ",
  "preview.csv.more": "+ {n} တန်း ထပ်ရှိသည်",
  "preview.markdown.empty": "အစမ်းကြည့်ရန် ဘာမှ မရှိသေးပါ။",
  "preview.select.placeholder": "ရွေးပါ…",
  "preview.file.choose": "ဖိုင် ရွေးပါ…",
  "preview.file.loaded": "ဖိုင် တင်ပြီး",
  "preview.image.choose": "ပုံ ရွေးပါ…",
  "preview.image.change": "ပုံ ပြောင်းပါ…",
  "preview.ai.title": "AI ၏ အဖြေ",
  "preview.ai.empty":
    "ကွင်းဆက် လုပ်ဆောင်ပြီးနောက် AI ၏ အဖြေ ဤနေရာတွင် ပေါ်လာမည်။",

  "node.state.label": "State ထိန်းချုပ်မှု",
  "node.state.blurb": "ဤကိရိယာ လုပ်ဆောင်မည့် မျှဝေ state ကို သတ်မှတ်၍ စီမံသည်။",
  "node.text_run.label": "စာသား",
  "node.text_run.blurb":
    "Run ဖြစ်စေသော တစ်ကြောင်းတည်း field။ Run နှင့် reset ဖွင့်ထားလျှင် run ပြီး ရှင်းသည်။",
  "node.button.label": "ခလုတ်",
  "node.button.blurb":
    "စာသား field မပါဘဲ ကွင်းဆက်ကို run သော သီးသန့် ခလုတ်။ Reset ခလုတ်လည်း ထည့်နိုင်သည်။",
  "node.number.label": "ဂဏန်း",
  "node.number.blurb":
    "Slider နှင့် ဂဏန်း field ပါသော ကိန်းဂဏန်းတန်ဖိုး။ min / max / step သတ်မှတ်; state နှင့် နှစ်ဖက် ချိတ်။",
  "node.select.label": "ရွေးချယ်စရာ",
  "node.select.blurb":
    "တစ်ခုတည်း ရွေး dropdown။ ပုံသေ စာရင်း သို့မဟုတ် state array နှင့် ချိတ်နိုင်သည်။",
  "node.toggle.label": "ခလုတ်ဖွင့်ပိတ်",
  "node.toggle.blurb": "Boolean ဖွင့်/ပိတ် ခလုတ်၊ state နှင့် နှစ်ဖက် ချိတ်။",
  "node.date.label": "ရက်စွဲ / အချိန်",
  "node.date.blurb":
    "ရက်စွဲ၊ အချိန် သို့မဟုတ် ရက်စွဲ-အချိန် ရွေးစရာ။ တန်ဖိုးကို ချိတ်ထားသော state သို့ တိုက်ရိုက် ရေး။",
  "node.file.label": "ဖိုင် တင်ခြင်း",
  "node.file.blurb":
    "ဖိုင် တစ်ခုခု တင်ပါ။ Text၊ base64 သို့မဟုတ် data URL အဖြစ် ချိတ်ထားသော state သို့ ရေးသည်။",
  "node.image.label": "ပုံ တင်ခြင်း",
  "node.image.blurb":
    "တိုက်ရိုက် ကြည့်ရှုမှုဖြင့် ပုံ တင်ပါ။ Data URL ရေးသည် — AI vision ကို ကျွေးသည်။",
  "node.textarea.label": "စာသားနေရာ",
  "node.textarea.blurb": "မျဉ်းများစွာ စာသား field — ဥပမာ စာ ကိုယ်ထည်။",
  "node.markdown.label": "Markdown",
  "node.markdown.blurb":
    "တိုက်ရိုက် ပြသမှု ခလုတ်ပါသော မျဉ်းများစွာ Markdown field။",
  "node.json.label": "JSON",
  "node.json.blurb":
    "ကုဒ် editor တွင် JSON paste သို့ တည်းဖြတ်။ မှန်ကန်သော JSON ကို auto-format; raw source ကို bound state သို့ ရေးသည်။",
  "node.csv.label": "CSV",
  "node.csv.blurb":
    "CSV ဖိုင် တင်ပါ။ Parse လုပ်ထားသော တန်းများ (typed, ဗလာ တန်း/ကော်လံ ဖယ်) ကို array အဖြစ် bound state သို့ ရေးသည်။",
  "node.table.label": "ဇယား",
  "node.table.blurb":
    "Bound array data ကို စီ၍ရ၊ အရွယ်ပြောင်း၍ရ၊ စာမျက်နှာခွဲ ဇယားဖြင့် ပြသသည်။ Data ကို ပြသရန် auto-optimize လုပ်သည်။",
  "node.code_input.label": "ကုဒ် တည်းဖြတ်",
  "node.code_input.blurb":
    "ဘာသာစကား ရွေး၍ Monaco editor တွင် ကုဒ် ရေး/paste; raw source ကို bound state သို့ ရေးသည်။",
  "node.viewport.label": "View Port",
  "node.viewport.blurb":
    "URL ဖြင့် ဝဘ်ဆိုက်ကို sandbox frame ထဲ ထည့်သည်။ Runtime တွင် URL ပြောင်းရန် state slot တစ်ခု bind လုပ်ပါ။",
  "node.convert_html.label": "HTML သို့ ပြောင်း",
  "node.convert_html.blurb":
    "View Port စာမျက်နှာ၏ static layout — CSS inline ပါသော HTML — ကို state slot သို့ ကူးသည်။",
  "node.themed.label": "အရောင်ပြင်",
  "node.themed.blurb":
    "State မှ static HTML ဖတ်၍ မည်သည့် element ကိုမဆို နှိပ်၍ အရောင်ပြောင်း — တူညီသော element အားလုံး ပြောင်းသည်။",
  "node.html_sanitize.label": "HTML သန့်စင်",
  "node.html_sanitize.blurb":
    "State slot မှ HTML ကို sanitize-html ဖြင့် သန့်စင် — script နှင့် မလုံခြုံ markup ဖယ်; output ကို bound state သို့ ရေးသည်။",
  "node.code.label": "ကုဒ်",
  "node.code.blurb": "စိတ်ကြိုက် logic / processing အတွက် ကုဒ် block။",
  "node.ts_type.label": "TS Type ပြောင်းစက်",
  "node.ts_type.blurb":
    "State slot မှ JSON ကို TypeScript interface သို့ ပြောင်း; output ကို bound state သို့ ရေးသည်။",
  "node.http_request.label": "HTTP Request",
  "node.http_request.blurb":
    "Server proxy မှတစ်ဆင့် တကယ့် API ကို ခေါ်သည်။ Method, URL, header & body များ state ကို interpolate လုပ်; တုံ့ပြန်ချက်ကို bound state သို့ ရေးသည်။",
  "node.filter.label": "စစ်ထုတ်",
  "node.filter.blurb":
    "Field သည် အခြေအနေနှင့် ကိုက်သော array တန်းများကို ထား; output ကို bound state သို့ ရေးသည်။",
  "node.map.label": "Map / အသွင်ပြောင်း",
  "node.map.blurb":
    "Output key များကို source path သို့ ချိတ်၍ array တန်းများကို object အသစ်အဖြစ် ပြန်ပုံဖော်သည်။",
  "node.sort.label": "စဉ်",
  "node.sort.blurb":
    "Array ကို field အလိုက် စဉ်သည် — စာသား / ဂဏန်း / ရက်စွဲ၊ ငယ်စဉ် သို့ ကြီးစဉ်။",
  "node.merge.label": "ပေါင်း / Join",
  "node.merge.blurb":
    "State array နှစ်ခုကို key တစ်ခုပေါ် join — right field များ matched left တန်းများပေါ် ဖြန့်သည်။",
  "node.template.label": "Template / စာသား",
  "node.template.blurb":
    "{{name}} state token များကို စာသား template ထဲ interpolate; ရလဒ်ကို bound state သို့ ရေးသည်။",
  "node.regex.label": "Regex",
  "node.regex.blurb":
    "Regular expression ဖြင့် string ပေါ် test, match, group extract သို့ replace လုပ်သည်။",
  "node.jsonpath.label": "JSONPath / Query",
  "node.jsonpath.blurb":
    "Dotted/bracketed path (ဥပမာ data.items[0].name) ဖြင့် JSON ထဲမှ nested value ကို ဆွဲထုတ်သည်။",
  "node.math.label": "Math / Expression",
  "node.math.blurb":
    "State ပေါ် သင်္ချာ expression တွက်သည် (ဥပမာ price * qty, sqrt, unit, fraction) — mathjs သုံး; JS eval မရှိ။",
  "node.schema_validate.label": "Schema စစ်ဆေး",
  "node.schema_validate.blurb":
    "လိုအပ်သော field + type စည်းမျဉ်းများနှင့် JSON ပုံစံ စစ်; ကွင်းဆက်ကို gate ရန် boolean ရေးသည်။",
  "node.encode.label": "Encode / Decode",
  "node.encode.blurb":
    "String ပေါ် Base64 / URL encode-decode သို့ တစ်လမ်းသွား SHA-256 hash; output ကို state သို့ ရေးသည်။",
  "node.canvas.label": "HTML Canvas",
  "node.canvas.blurb":
    "JS ဖြင့် element များ ထည့်သွင်းနိုင်သော လွတ်လပ်သော HTML div။",
  "node.ai.label": "AI",
  "node.ai.blurb":
    "Gemini သို့ OpenRouter ကို မေး။ Prompt ထဲ {{name}} ဖြင့် state interpolate; အဖြေကို bound state သို့ ရေးသည်။",

  "field.fieldLabel": "Field အမည်",
  "field.description": "ဖော်ပြချက်",
  "field.descPlaceholder": "Label အောက်တွင် ပြသမည့် အကူအညီ စာသား (optional)",
  "field.placeholder": "Placeholder",
  "field.buttonText": "ခလုတ် စာသား",
  "field.runButtonText": "Run ခလုတ် စာသား",
  "field.resetButtonText": "Reset ခလုတ် စာသား",
  "field.stateBinding": "State binding",
  "field.stateBinding.help": "ဤ node က ဖတ်/ရေးမည့် state။",
  "field.editorHeight": "Editor အမြင့် (px)",
  "field.editorHeight.help": "Preview ထဲ မူလ field အမြင့် ({min}–{max}px)။",
  "field.noState": "— state မရှိ —",
  "field.pickState": "State ရွေးပါ…",
  "field.none": "— မရှိ —",

  "toggle.runButton": "Run ခလုတ်",
  "toggle.runButton.desc": "Run ခလုတ် ပြ၍ Enter နှိပ်လျှင် submit လုပ်သည်။",
  "toggle.resetButton": "Reset ခလုတ်",
  "toggle.resetButton.descText":
    "Run တိုင်းပြီး field ကို ရှင်း၍ reset ခလုတ် ပြသည်။",
  "toggle.resetButton.descButton": "Action ခလုတ်ဘေးတွင် reset ခလုတ် ပြသည်။",

  "targets.run": "Run targets",
  "targets.reset": "Reset targets",
  "targets.run.empty":
    "ဤကိရိယာတွင် code, TS type, သို့ AI node မရှိသေးပါ။ Target လုပ်ရန် ထည့်ပါ။",
  "targets.reset.empty":
    "ဤကိရိယာတွင် code node မရှိသေးပါ။ Target လုပ်ရန် ထည့်ပါ။",
  "targets.all": "Node {n} ခုလုံး",
  "targets.selected": "{n} ခု ရွေးထား",
  "targets.help.runAll": "ဘာမှ မရွေးထား — ကွင်းဆက်တစ်ခုလုံး run သည်။",
  "targets.help.resetAll": "ဘာမှ မရွေးထား — ကွင်းဆက်တစ်ခုလုံး reset သည်။",
  "targets.help.runSome":
    "ရွေးထားသော node {n} ခုကို ကွင်းဆက်အစဉ်အတိုင်း run သည်။",
  "targets.help.resetSome":
    "ရွေးထားသော node {n} ခုကို ကွင်းဆက်အစဉ်အတိုင်း reset သည်။",

  "state.unnamed": "အမည်မဲ့",
  "state.copyName": "Variable အမည် ကူး",
  "state.options": "Variable ရွေးချယ်စရာများ",
  "state.rename": "Variable အမည်ပြောင်း",
  "state.setDefault": "မူရင်းတန်ဖိုး သတ်မှတ်",
  "state.remove": "Variable ဖယ်ရှား",
  "state.defaultPlaceholder": "မူရင်းတန်ဖိုး",
  "state.add": "State ထည့်",

  "ai.provider": "Provider",
  "ai.model": "Model",
  "ai.model.help": "စာရင်းမှ ရွေး သို့ model id တစ်ခုခု ရိုက်ပါ။",
  "ai.prompt": "Prompt",
  "ai.prompt.help": "State interpolate ရန် {{stateName}} သုံးပါ။",
  "ai.output": "Output state",
  "ai.output.help": "Model ၏ အဖြေ ဤနေရာသို့ ရေးသည်။",
  "ai.markdownOut": "Markdown output",
  "ai.markdownOut.desc": "Preview ထဲ အဖြေကို Markdown အဖြစ် ပြသည်။",

  "tstype.descPlaceholder": "ဤ converter ၏ ရည်ရွယ်ချက်",
  "tstype.root": "Root type အမည်",
  "tstype.root.help": "ထုတ်လုပ်သော top-level interface/type ၏ အမည်။",
  "tstype.input": "Input state (JSON source)",
  "tstype.input.help":
    "ပြောင်းမည့် JSON ပါသော state slot — JSON input node တစ်ခု ဤနေရာတွင် bind လုပ်ပါ။",
  "tstype.output": "Output state (TypeScript)",
  "tstype.output.help":
    "ထုတ်လုပ်ထားသော declaration များ ဤနေရာသို့ ရေးသည်။ JSON ပြောင်းသည်နှင့် တိုက်ရိုက် update; မမှန်သော JSON သည် နောက်ဆုံး output ကို ဆက်ထားသည် (run များက parse error ကို သတင်းပို့သည်)။",

  "sanitize.descPlaceholder": "ဤ sanitizer ၏ ရည်ရွယ်ချက်",
  "sanitize.input": "Input state (HTML)",
  "sanitize.input.help":
    "Raw HTML ပါသော state slot — Convert to HTML node ၏ output ကို ဤနေရာတွင် bind လုပ်ပါ။",
  "sanitize.output": "Output state (clean HTML)",
  "sanitize.output.help":
    "သန့်စင်ပြီး HTML ဤနေရာသို့ ရေးသည်။ Input ပြောင်းသည်နှင့် တိုက်ရိုက် update — သန့်စင်ပြီး စာမျက်နှာ အရောင်ပြောင်းရန် Themed node တစ်ခု bind လုပ်ပါ။",
  "sanitize.keepStyles": "Style များ ထား",
  "sanitize.keepStyles.desc":
    "<style> block, inline style, နှင့် class/id ကို ထိန်းထား (theming မပျက်စေ)။ HTML Sanitize node အားလုံးကြား sync လုပ်သည်။",
  "sanitize.keepImages": "ပုံများ ထား",
  "sanitize.keepImages.desc":
    "<img>/<picture> နှင့် ၎င်းတို့၏ src — data: image URI အပါအဝင် — ထိန်းထား။ HTML Sanitize node အားလုံးကြား sync လုပ်သည်။",
  "sanitize.footer":
    "Script, event handler, မလုံခြုံ URL scheme, နှင့် embedding tag (iframe / object / embed) များကို အမြဲ ဖယ်ရှားသည်။ ကွင်းဆက်ထဲနှင့် input ပြောင်းသည်နှင့် တိုက်ရိုက် run သည်။",

  "web.defaultScreen": "မူရင်း screen",
  "web.pickScreen": "Screen ရွေးပါ…",
  "web.defaultScreen.help":
    "Preview ဖွင့်လိုက်သည့် screen — အသုံးပြုသူများ fill / desktop / mobile ကြား ပြောင်းနိုင်သေးသည်။ Fixed screen များသည် device width ဖြင့် render လုပ်၍ အံဝင်အောင် scale လုပ်သည် (width simulation; ဆိုက်က desktop browser အဖြစ်သာ မြင်သည်)။",
  "web.livePreview": "တိုက်ရိုက် အစမ်းကြည့်",
  "web.livePreview.desc":
    "Preview ထဲ frame ကို render လုပ်သည်။ မူရင်းအားဖြင့် ပိတ် — ဖွင့်သည်အထိ စာမျက်နှာ load မလုပ်ဘဲ သက်သာစေသည်။",

  "viewport.url": "URL",
  "viewport.url.help":
    "Preview ထဲ ပြသမည့် စာမျက်နှာ။ Domain သက်သက်ဆိုလျှင် https:// ထည့်ပေးသည်။",
  "viewport.urlState": "URL state (optional)",
  "viewport.urlState.help":
    "Bind ထားသော state တွင် ဗလာမဟုတ်သော string ရှိလျှင် အထက်က URL ကို override လုပ်သည် — text input တစ်ခု bind လုပ် သို့ code node မှ ရေးပါ။",
  "viewport.footer":
    "စာမျက်နှာသည် sandbox iframe ထဲ load လုပ်သည်။ Embedding တားမြစ်သော ဆိုက်များ (X-Frame-Options / frame-ancestors) ဗလာ render ဖြစ်သည် — ၎င်းသည် ဝေးလံသော ဆိုက်၏ မူဝါဒ ဖြစ်၍ သင့်ကိရိယာ၏ အမှား မဟုတ်ပါ။",

  "convert.source": "Source View Port",
  "convert.pickVp": "View Port ရွေးပါ…",
  "convert.auto": "Auto — ပထမ View Port",
  "convert.vpFallback": "View Port",
  "convert.source.helpEmpty":
    "View Port node မရှိသေး — တစ်ခု ထည့်ပါ; ဤ node က ၎င်း၏ စာမျက်နှာကို ကူးသည်။",
  "convert.source.help":
    "မည်သူ၏ စာမျက်နှာ ကူးမည်။ View Port ၏ URL — state-driven override အပါအဝင် — ကို လိုက်သည်။",
  "convert.output": "Output state (HTML)",
  "convert.output.help":
    "စာမျက်နှာ၏ static HTML (CSS inline) ဤနေရာသို့ ရေးသည် — Themed node တစ်ခု bind လုပ် သို့ code node များမှ ဖတ်ပါ။",
  "convert.footer":
    "စာမျက်နှာ၏ static layout ကို server-side ကူးသည် — linked CSS inline ပါသော HTML, script ဖယ် — snapshot ပြ၍ preview ထဲ copy-to-clipboard ခလုတ် ပေးသည်။",

  "themed.htmlState": "HTML state",
  "themed.htmlState.help":
    "အရောင်ပြောင်းရန် static စာမျက်နှာ HTML ပါသော state slot — Convert to HTML node ၏ output ကို ဤနေရာတွင် bind လုပ်ပါ။ View Port ချိတ်ဆက်မှု မလို။",
  "themed.footer":
    "Preview ထဲ မည်သည့် element ကိုမဆို နှိပ်၍ အရောင်ပြောင်း — တူညီသော element (tag နှင့် class တူ) အားလုံး ပြောင်းသည်။ Script ဖယ်ထားသည်။",

  "code.descPlaceholder": "ဤ code block လုပ်ဆောင်ချက်",
  "code.code": "ကုဒ်",
  "code.code.help":
    "ကွင်းဆက်ထဲ အပေါ်မှအောက် run သည်; state ကို တိုက်ရိုက် ဖတ်/ရေးသည်။",

  "canvas.elementId": "Element ID",
  "canvas.elementId.help":
    "Auto-generated UUID။ သင့် JS မှ ဤ div ကို target လုပ်ပါ။",
  "canvas.htmljs": "HTML / JS",
  "canvas.htmljs.help": "အထက်က div ကို ဖြည့်သည်။",

  "button.labelOptional": "Label (optional)",
  "button.labelPlaceholder": "ခလုတ်အပေါ် ပြသမည့် ခေါင်းစဉ်",
  "button.footer": "လက်ရှိ state ပေါ်တွင် run သည် — input field မရှိ။",

  "markdown.help":
    "အသုံးပြုသူများ Markdown ရေး၍ တိုက်ရိုက် render preview ကို toggle လုပ်နိုင်သည်။",
  "json.help":
    "အသုံးပြုသူများ code editor တွင် JSON paste/တည်းဖြတ်; မှန်သော JSON auto-format ဖြစ်သည်။ Raw source string ကို bound state သို့ ရေးသည် — code node များတွင် JSON.parse(state.get(…)) သုံးပါ။",
  "csv.header": "ခေါင်းစီး တန်း",
  "csv.header.desc":
    "ပထမတန်းသည် ကော်လံအမည်များ — တန်းများသည် header ဖြင့် key လုပ်ထားသော object ဖြစ်လာသည်။",
  "csv.help":
    "အသုံးပြုသူများ .csv ဖိုင် တင်သည်။ Parse လုပ်ထားသော တန်းများ bound state သို့ array အဖြစ် ရောက်သည် (typed value, ဗလာ တန်း/ကော်လံ ဖယ်) — code node များတွင် state.get(…) ကို တိုက်ရိုက် iterate လုပ်ပါ။",
  "table.rowsPerPage": "စာမျက်နှာတစ်ခုလျှင် တန်း",
  "table.pickPageSize": "Page size ရွေးပါ…",
  "table.rows": "{n} တန်း",
  "table.help":
    "Preview ထဲ မူရင်း page size — အသုံးပြုသူများ {sizes} ကြား ပြောင်းနိုင်သည်။",
  "table.footer":
    "Bound state ကို ဇယားအဖြစ် ပြသည် — array တစ်ခု bind လုပ်ပါ (ဥပမာ CSV တန်း, JSON array, သို့ code-node ရလဒ်)။ Data ကို ပြသရန် auto-optimize လုပ်သည်; ကော်လံတိုင်း စီသည် (စာသား, ဂဏန်း, နှင့် auto-detect ရက်စွဲ) နှင့် header အစွန်း ဆွဲ၍ အရွယ်ပြောင်းသည်။",
  "codeInput.language": "ဘာသာစကား",
  "codeInput.pickLanguage": "ဘာသာစကား ရွေးပါ…",
  "codeInput.language.help":
    "Preview editor ထဲ syntax highlighting ကို ထိန်းသည်။",
  "codeInput.help":
    "အသုံးပြုသူများ Monaco editor တွင် code ရေး/paste။ Raw source string ကို bound state သို့ ရေးသည် — ဘယ်တော့မှ execute မလုပ်ပါ။",

  "number.min": "အနည်းဆုံး",
  "number.max": "အများဆုံး",
  "number.step": "အဆင့်",
  "number.help":
    "အသုံးပြုသူများ slider ဆွဲ သို့မဟုတ် တန်ဖိုး ရိုက်သည်။ ဂဏန်းကို bound state သို့ string အဖြစ် ရေးသည်။",

  "select.options": "ရွေးစရာများ",
  "select.labelPlaceholder": "Label",
  "select.valuePlaceholder": "တန်ဖိုး",
  "select.addOption": "ရွေးစရာ ထည့်",
  "select.removeOption": "ရွေးစရာ ဖယ်",
  "select.optionsState": "State မှ ရွေးစရာများ",
  "select.optionsState.help":
    "ရွေးချယ်နိုင်သည်။ array (string များ သို့ {value, label} object များ) ပါသော state slot ကို ချိတ်လျှင် runtime တွင် ရွေးစရာများကို ထိန်းသည် — အထက်ပါ ပုံသေစာရင်းကို လွှမ်းသည်။",

  "toggle.help":
    'ဖွင့်/ပိတ် ခလုတ် ပြသည်။ Bound state သည် "true" သို့ "false" ဖြစ်သည်။',

  "date.mode": "ရွေးစရာ",
  "date.mode.help": "အသုံးပြုသူ မြင်ရမည့် native picker အမျိုးအစား။",

  "file.format": "Output ပုံစံ",
  "file.format.help":
    "ရွေးထားသော ဖိုင်ကို state သို့ encode လုပ်ပုံ: Text (UTF-8)၊ Base64 (prefix မပါ)၊ သို့ Data URL။",
  "file.accept": "Accept စစ်ထုတ်",
  "file.accept.help":
    "ရွေးချယ်နိုင်သော native filter (ဥပမာ .pdf,.txt သို့ image/*)။ ဖိုင်အားလုံး ခွင့်ပြုရန် ဗလာထားပါ။",

  "image.help":
    "အသုံးပြုသူများ ပုံ တင်သည်; data URL ကို bound state သို့ ရေးသည် — AI vision prompt သို့ ကျွေးရန် သို့ အခြားနေရာ render ရန် အသင့်။",

  "logic.input": "Input state",
  "logic.output": "Output state",
  "logic.field": "Field path",
  "logic.field.help":
    "တန်းတစ်ခုစီ၏ dotted path (ဥပမာ user.name, items[0].name)။ space ပါသော key ကို အတိုင်းရိုက်နိုင် (ဥပမာ Happy Birthday)။ $ နဲ့စလျှင် JSONPath အပြည့် (ဥပမာ $.items[*].price, $['Happy Birthday'])။ တန်းကိုယ်တိုင်အတွက် ဗလာထားပါ။",

  "http.method": "Method",
  "http.url": "URL",
  "http.url.help":
    "{{state}} interpolation ပံ့ပိုးသည်။ Server proxy မှတစ်ဆင့် (public http(s) သာ)။",
  "http.headers": "Headers",
  "http.addHeader": "Header ထည့်",
  "http.removeHeader": "Header ဖယ်",
  "http.headerKey": "Header",
  "http.headerValue": "တန်ဖိုး",
  "http.input": "Input state",
  "http.input.help":
    "ရွေးချယ်နိုင်: state slot တစ်ခု bind လုပ်ပြီး URL, headers သို့မဟုတ် body တွင် {{input}} အဖြစ် ကိုးကားသုံးနိုင်သည်။",
  "http.body": "Body",
  "http.body.help":
    "POST / PUT / PATCH အတွက် ပို့သည်။ {{state}} interpolation ပံ့ပိုးသည်။",
  "http.responseType": "တုံ့ပြန်ချက်",
  "http.output.help":
    "Parse လုပ်ထားသော တုံ့ပြန်ချက်ကို ဤနေရာ ရေးသည်။ JSON ဆိုလျှင် parse လုပ်ထားသော value။",
  "http.footer":
    "ကွင်းဆက် run မှသာ run သည် — ရိုက်နေစဉ် live မဟုတ်။ Auth header များ server-side ၌ ရှိနေသည်။",

  "filter.operator": "Operator",
  "filter.value": "တန်ဖိုး",
  "filter.op.eq": "ညီ",
  "filter.op.neq": "မညီ",
  "filter.op.gt": "ကြီး",
  "filter.op.gte": "ကြီး သို့ ညီ",
  "filter.op.lt": "ငယ်",
  "filter.op.lte": "ငယ် သို့ ညီ",
  "filter.op.contains": "ပါဝင်",
  "filter.op.startsWith": "ဖြင့် စ",
  "filter.op.endsWith": "ဖြင့် ဆုံး",
  "filter.op.exists": "ရှိ",
  "filter.op.notExists": "မရှိ",
  "filter.help":
    "Field သည် အခြေအနေနှင့် ကိုက်သော input array တန်းများကို ထားသည်။",

  "map.fields": "Field mapping",
  "map.to": "Output key",
  "map.from": "Source path",
  "map.addField": "Field ထည့်",
  "map.removeField": "Field ဖယ်",
  "map.help":
    "တန်းတစ်ခုစီအတွက် object အသစ် တည်ဆောက်သည်: output key တစ်ခုစီသည် ၎င်း၏ source path တန်ဖိုးကို ကူးသည်။",

  "sort.direction": "ဦးတည်ချက်",
  "sort.type": "နှိုင်းယှဉ်ပုံ",
  "sort.dir.asc": "ငယ်စဉ်",
  "sort.dir.desc": "ကြီးစဉ်",
  "sort.type.string": "စာသား",
  "sort.type.number": "ဂဏန်း",
  "sort.type.date": "ရက်စွဲ",
  "sort.help": "Input array ကို field path အလိုက် စဉ်သည်။",

  "merge.rightInput": "Right array (state)",
  "merge.leftKey": "Left key",
  "merge.rightKey": "Right key",
  "merge.joinKind": "Join",
  "merge.join.inner": "Inner (ကိုက်သာ)",
  "merge.join.left": "Left (မကိုက်ကို ထား)",
  "merge.help":
    "Key ကိုက်သော left + right တန်းများ join; right field များ left ကို လွှမ်းသည်။",

  "template.template": "Template",
  "template.template.help":
    "{{stateName}} token သုံးပါ။ လက်ရှိ state တန်ဖိုးများဖြင့် အစားထိုးသည်။",

  "regex.pattern": "Pattern",
  "regex.flags": "Flags",
  "regex.mode": "Mode",
  "regex.replacement": "အစားထိုး",
  "regex.replacement.help":
    "Replace mode တွင် သုံးသည်။ $1, $2… group reference ပံ့ပိုးသည်။",
  "regex.mode.test": "Test (true/false)",
  "regex.mode.match": "Match",
  "regex.mode.extract": "Group ထုတ်",
  "regex.mode.replace": "အစားထိုး",
  "regex.help": "Input string ပေါ် regular expression ကို run သည်။",

  "jsonpath.path": "Path",
  "jsonpath.path.help":
    "Dotted / bracketed path၊ ဥပမာ data.items[0].name။ $ နဲ့စလျှင် JSONPath အပြည့်: $.items[*].price (price အားလုံး)၊ $..name (recursive)၊ $.items[?(@.price>10)] (filter)၊ $['Happy Birthday'] (space key)။ match များလျှင် array ပြန်သည်။",
  "jsonpath.help": "Input JSON ထဲမှ nested value ကို ဖြေရှင်းသည်။",
  "jsonpath.docs.title": "JSONPath cheatsheet",
  "jsonpath.docs": `Path ပုံစံ ၂ မျိုး ရှိသည်။

SIMPLE ($ မပါ)
  status              top-level key
  user.name          nested key
  items[0]           array index
  items[0].name      index ပြီး key
  Happy Birthday     key ထဲ space ပါနိုင်
  (key name ထဲ dot အစစ် ပါလျှင် ဤနေရာတွင် မရ — $ ပုံစံ သုံးပါ)

JSONPATH ($ နဲ့စ)
  $                   input တစ်ခုလုံး
  $.user.name        nested key
  $['Happy Birthday'] space/dot ပါ key — bracket-quote လုပ်ပါ
  $[*]                root array ၏ item တိုင်း
  $.items[*]         array item တိုင်း
  $[*]['Last Name']  row တိုင်းမှ field တစ်ခု  →  array
  $..name             recursive — depth မရွေး name
  $.items[0,2]        index များစွာ
  $.items[1:3]        slice (start:end)
  $.items[-1:]        နောက်ဆုံး item
  $.items[?(@.price>10)]      expression filter
  $.items[?(@.active==true)]  equality filter
  $[?(@['Last Name']=='Baxter')]  space key ပေါ် filter

RESULT SHAPE
  match 0 → empty / undefined
  match 1 → value ကိုယ်တိုင် (scalar)
  match 2+ → value array

အမှားများ
  Root က array ဖြစ်ပြီးသားလား? .items မထည့်ပါနဲ့။
  [{...},{...}]  →  $[*]['Last Name']   ($.items[*]... မဟုတ်)`,

  "math.expression": "Expression",
  "math.expression.help":
    "State slot များကို အမည်ဖြင့် ကိုးကား (ဥပမာ price * qty)။ mathjs သုံး — function, unit, fraction ခွင့်ပြု; JS eval မရှိ။",
  "math.docs.title": "Expression လမ်းညွှန်",
  "math.docs": `mathjs ဖြင့် တွက်သည်။ State slot တိုင်းကို အမည်ဖြင့် ကိုးကားနိုင်။

VARIABLES (ကိန်းရှင်)
  price * qty         state slot နှစ်ခု မြှောက်
  state1 + 5          slot နှင့် literal ပေါင်း
  (a + b) / 2         ကွင်းဖြင့် အုပ်စုဖွဲ့
  (ဂဏန်းပုံစံ slot → number; အခြား → အတိုင်း)

OPERATORS
  + - * /             ပေါင်း နုတ် မြှောက် စား
  %                   modulo (အကြွင်း)
  ^                   ထပ်ကိန်း  →  2 ^ 10 = 1024
  ( )                 အုပ်စု

FUNCTIONS
  round(x)  floor(x)  ceil(x)  abs(x)
  sqrt(x)   cbrt(x)   pow(x,y)  exp(x)  log(x, base)
  min(a,b,...)  max(a,b,...)  mean(a,b,...)  sum(a,b,...)
  sin cos tan  (radian)  +  mathjs library အပြည့်

CONSTANTS
  pi          3.14159...
  e           2.71828...

EXAMPLES
  round(total / count)           ပျမ်းမျှ၊ rounded
  sqrt(x ^ 2 + y ^ 2)            hypotenuse
  pi * r ^ 2                     စက်ဝိုင်း ဧရိယာ
  max(a, b, c)                   သုံးခုထဲ အကြီးဆုံး
  subtotal * 1.07                7% အခွန် ပေါင်း

FRACTIONS & UNITS
  1/3 + 1/6                      → 0.5
  2 inch to cm                   → 5.08 cm
  3 ft + 4 inch in cm            unit တွက်ချက်

မှတ်ချက်
  Expression ဗလာ / output slot မရှိ → node ကျော်။
  ရလဒ်သည် finite ဖြစ်ရမည်; မဟုတ်လျှင် node error။`,

  "schema.rules": "လိုအပ်သော field များ",
  "schema.ruleField": "Field path",
  "schema.ruleType": "Type",
  "schema.addRule": "စည်းမျဉ်း ထည့်",
  "schema.removeRule": "စည်းမျဉ်း ဖယ်",
  "schema.errorOutput": "Error state (ရွေးချယ်)",
  "schema.errorOutput.help":
    "ပြဿနာစာရင်းကို newline ဖြင့် ပေါင်း၍ ရေးမည့် ရွေးချယ်နိုင်သော state slot။",
  "schema.type.any": "မည်သည်မဆို",
  "schema.type.string": "String",
  "schema.type.number": "Number",
  "schema.type.boolean": "Boolean",
  "schema.type.object": "Object",
  "schema.type.array": "Array",
  "schema.help":
    '"true"/"false" ရေးသည် — အောက်ဖက် Filter သို့ Code node ဖြင့် ကွင်းဆက်ကို gate လုပ်ပါ။',

  "encode.operation": "လုပ်ဆောင်ချက်",
  "encode.help":
    "Input string ကို အသွင်ပြောင်းသည်။ SHA-256 သည် တစ်လမ်းသွား hash (hex)။",

  "common.cancel": "မလုပ်တော့",
  "common.delete": "ဖျက်",
  "common.rename": "အမည်ပြောင်း",
  "common.copy": "ကူး",

  // Welcome splash (post-login branding screen)
  "welcome.eyebrow": "ပြန်လည်ကြိုဆိုပါသည်",
  "welcome.title": "သင့် studio အသင့်ဖြစ်ပါပြီ။",
  "welcome.subtitle":
    "Tool များကို input, logic, output node များ၏ အပေါ်မှအောက် ကွင်းဆက်အဖြစ် တည်ဆောက်ပါ — တိုက်ရိုက် preview နှင့်အတူ။ Backend မလို။",
  "welcome.enter": "Studio သို့ ဝင်မည်",
  "welcome.node.input": "Input",
  "welcome.node.logic": "Logic",
  "welcome.node.output": "Output",
};

/** All message catalogs keyed by locale. */
export const MESSAGES: Record<AppLocale, Record<MessageKey, string>> = {
  en,
  my,
};
