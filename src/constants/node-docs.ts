/**
 * Long-form reference documentation for every node type, keyed by
 * {@link ToolNodeType}. Pure, serialisable data (no React, no icons) so it can
 * cross a server/client boundary, be embedded in an MDX docs page, OR be handed
 * to an AI tool call as machine-readable context about what each node does.
 *
 * This is the *content* layer (English): short labels/blurbs live in the i18n
 * catalog (`node.<type>.label` / `.blurb`); the in-depth fields below — config
 * controls, state in/out, tips, a worked example — live here. Sourced from the
 * node type interfaces (`@/types/tool-builder`), `createNode()` defaults, the
 * per-type editor forms (`@/features/NodeEditor`), and the preview runtime
 * (`@/lib/tool-builder-runtime`).
 *
 * Read it through {@link getNodeDetail}; for a fully-resolved, AI-ready record
 * (label + blurb + this detail in one object) use `getNodeReference()` in
 * `@/lib/node-catalog`.
 */
import type { ToolNodeType } from "@/types/tool-builder";

/** One configurable control shown in a node's editor form. */
export interface NodeDetailField {
  /** Field label as shown in the editor. */
  name: string;
  /** What the control does / its valid values. */
  description: string;
}

/** In-depth documentation for a single node type. */
export interface NodeDetail {
  /** 1–2 sentences: what the node does and its mental model. */
  summary: string;
  /** When to reach for this node. */
  whenToUse: string;
  /** Every editor config control, in form order. */
  config: NodeDetailField[];
  /** What the node reads from / writes to shared state (`null` when none). */
  io: { reads: string | null; writes: string | null };
  /** Actionable tips and gotchas. */
  tips: string[];
  /** One concrete usage example (`null` when not applicable). */
  example: string | null;
}

/** Per-type in-depth docs, keyed by node type. Ordered like `ToolNodeType`. */
export const NODE_DETAILS: Record<ToolNodeType, NodeDetail> = {
  state: {
    summary:
      'The State Control node ("State Control", slug @state, group "Data") defines and owns the single flat key/value store every other node in the tool reads from and writes to. It is a non-rendering, non-executing node: think of it as the variable declaration list for the whole chain. Each entry is a named slot with an optional default (seed) value; the runtime builds the initial state map from these slots and resolves index-based bindings against this list\'s order.',
    whenToUse:
      "Use it (there is exactly one per tool, created by default) to declare the named state slots your input, logic, and output nodes will bind to, and to set their seed/default values for the preview. Add a slot before pointing any node's binding at it; rename here so name-based bindings stay in sync.",
    config: [
      {
        name: "Variable name (per slot, read-only label)",
        description:
          "The slot's key, shown as a monospace label. Other nodes bind to this name. Shows the italic placeholder 'unnamed' when blank. Not edited inline — use the Rename action. New slots auto-name state1, state2, ... (next free stateN where N counts existing slots matching ^state\\d+$).",
      },
      {
        name: "Copy variable name (button, per slot)",
        description:
          "Icon button (aria-label 'Copy variable name') that copies the slot's name to the clipboard via navigator.clipboard.",
      },
      {
        name: "Variable options (… dropdown, per slot)",
        description:
          "Per-slot overflow menu (aria-label 'Variable options') containing the three actions below.",
      },
      {
        name: "Rename variable (menu item)",
        description:
          "Opens a dialog with a text input (confirm on Enter or the 'Rename' button, 'Cancel' to dismiss). The trimmed new name must be non-empty and different from the old one. Renaming cascades: every node whose binding is mode 'name' and matches the old name is updated to the new name.",
      },
      {
        name: "Set default value (menu item)",
        description:
          "Toggles a collapsible inline text input (placeholder 'default value') bound to the slot's value. This default seeds the slot in the preview's initial state map. Stored as a plain string.",
      },
      {
        name: "Remove variable (menu item, destructive)",
        description:
          "Deletes the slot from the states list. Bindings pointing at it are NOT cleaned up automatically.",
      },
      {
        name: "Add state (button)",
        description:
          "Appends a new slot with an auto-generated name (stateN) and an empty default value.",
      },
    ],
    io: {
      reads: null,
      writes:
        "Defines the entire shared state store. It does not run in the chain (runChain has no 'state' case), so it performs no per-run read or write. Its `states[]` seed the initial state map via initialStateMap (each slot's `name` -> its default `value` string), and its slot order backs index-mode binding resolution (resolveBinding returns stateNode.states[i].name for mode 'index'). All actual reads/writes are performed by other nodes against the names this node declares.",
    },
    tips: [
      "There is one State Control node per tool and it is created by default with a single slot named `state1` (empty default). At runtime the state node is located with `tool.nodes.find(n => n.type === 'state')`, so a tool with no state node yields no slots.",
      "All values are flat strings. Defaults set here are stored as strings, and nodes that hold structured data (toggle stores 'true'/'false', number stores a stringified number, json/csv hold strings/arrays) follow the same flat-string convention — set defaults accordingly.",
      "Rename only cascades to bindings stored under the `binding` field with mode 'name'. It does NOT rewrite `input`/`output`/`rightInput`/`errorOutput`/`optionsBinding` fields (Filter, Map, Sort, Merge, Template, Regex, JSONPath, Math, Schema Validate, Encode, HTTP Request, TS Type, HTML Sanitize, AI, etc.) or any index-mode binding — re-point those manually after renaming.",
      "Removing a slot does not fix nodes still bound to it. A dangling name-mode binding resolves to that literal name (a key absent from the map); an index-mode binding to a now-out-of-range index resolves to '' (empty name).",
      "Slot order matters for index-mode bindings: reordering or deleting slots shifts what `index` resolves to. Prefer name-mode bindings (the createNode default for every node is mode 'name') for stability.",
      "New slots auto-name by counting existing names matching ^state\\d+$, so manually named slots don't affect the next stateN, and you can end up with duplicate auto-names if you renamed some back.",
    ],
    example:
      "A subscribe tool declares two slots in State Control: `email` (default '') and `message` (default ''). A Text Input node binds (mode 'name') to `email`; a Code node's run() does `const log = state.get('message') || ''; state.set('message', log + 'Subscribed: ' + state.get('email') + '\\n')`; a Markdown output node binds to `message` to show the running log. The State Control node itself never executes — it just defines `email` and `message` and seeds them to '' for the preview.",
  },
  text_run: {
    summary:
      "A single-line text input node. As the user types it live-writes the raw string to its bound state slot and fires the debounced `change` chain; an optional run button (and Enter key) writes the value and runs the code/AI chain, and an optional reset button clears the field and runs reset(). Mental model: a text field wired to one state key, with a built-in trigger for the logic chain.",
    whenToUse:
      "Use when you need a short free-text input (a query, a name, a single value) that both stores into state and kicks off the tool's logic chain. Reach for it instead of `textarea` for one-line input, or instead of `button` when the trigger needs an accompanying text field.",
    config: [
      {
        name: "Field label",
        description:
          'Text input (i18n key field.fieldLabel). Bound to node.fieldLabel. The bold label rendered above the input in the preview. Default "Field". If left empty the preview still renders an empty label element.',
      },
      {
        name: "Description",
        description:
          'Text input (field.description) bound to node.description. Optional helper text shown as a small muted paragraph below the label. Placeholder in the editor is "Optional helper text shown below the label". Default "" (empty = no helper line rendered).',
      },
      {
        name: "Placeholder",
        description:
          'Text input (field.placeholder) bound to node.placeholder. Placeholder text shown inside the empty input box in the preview. Default "Type here…".',
      },
      {
        name: "Run button (toggle)",
        description:
          'Toggle (toggle.runButton, desc "Show a run button and submit on Enter.") bound to node.runEnabled. When ON: a run button is rendered and pressing Enter in the field triggers a run. When OFF: no button and Enter does nothing (the field still writes to state on each keystroke). Default ON (true).',
      },
      {
        name: "Run button text",
        description:
          'Text input (field.runButtonText) bound to node.buttonText. Only shown when Run button is ON. The label on the run button. Default "Run".',
      },
      {
        name: "Run targets",
        description:
          'Checklist target picker (TargetSelector, label targets.run "Run targets") bound to node.targets (string[] of node ids). Lists the tool\'s runnable logic/AI nodes — kinds: code, ts_type, http_request, filter, map, sort, merge, template, regex, jsonpath, math, schema_validate, encode, ai. Check specific nodes to run only those (in chain order); leave all unchecked to run the whole chain. Empty-state message when no runnable nodes exist: "No code, TS type, or AI nodes in this tool yet. Add some to target them."',
      },
      {
        name: "Reset button (toggle)",
        description:
          'Toggle (toggle.resetButton, desc "Clear the field after each run and show a reset button.") bound to node.resetEnabled. When ON: the field clears itself after each run, and a separate reset button is rendered. Default OFF (false).',
      },
      {
        name: "Reset button text",
        description:
          'Text input (field.resetButtonText) bound to node.resetText. Only shown when Reset button is ON. The label on the reset button. Default "Reset".',
      },
      {
        name: "Reset targets",
        description:
          'Checklist target picker (label targets.reset "Reset targets") bound to node.resetTargets (string[]). Only shown when Reset button is ON. Lists code nodes only (kinds: code). The reset button runs reset() on the checked code nodes (in chain order); none checked = reset the whole chain. Empty-state message: "No code nodes in this tool yet. Add some to target them."',
      },
      {
        name: "State binding",
        description:
          'State picker dropdown (BindingControl, label field.stateBinding "State binding", help "Which state this node reads from / writes to.") bound to node.binding. Selecting a slot writes binding = { mode: "name", value: <slot name> }. Disabled when no state slots exist (shows "— no state —"; otherwise "Pick state…"). Default { mode: "name", value: "state1" }. Note: the editor always sets mode "name"; the index binding mode exists in the type but is not selectable here.',
      },
    ],
    io: {
      reads:
        "On typing it merges into runtime state but does not read any other slot to render; the input's displayed value comes from local component input state, not from the bound slot. Effectively read-behaviour: none for rendering.",
      writes:
        'Writes the input string to the single slot named by node.binding (resolved via resolveBinding; editor sets mode "name"). Written on every keystroke (live change chain) and again on run (writes value then runs the chain).',
    },
    tips: [
      "Writes happen on EVERY keystroke, not just on run: each change sets state[binding] to the input string and fires the debounced live `change` chain. The run button / Enter additionally writes the value and runs the full `run` chain (runChain). So bound code nodes may see partial typed values via change() before the user ever clicks run.",
      "The stored value is always a string — there is no number/JSON parsing. Downstream code nodes must coerce it themselves.",
      "Enter only triggers a run when the Run button toggle is ON; with it OFF the field still writes state on typing but there is no run trigger from this node at all.",
      "Empty Run targets / Reset targets means 'run (or reset) the whole chain', NOT 'run nothing'. Check boxes to scope it down to specific nodes (in chain order). Run targets cover code/ts_type/http_request/filter/map/sort/merge/template/regex/jsonpath/math/schema_validate/encode/ai; reset targets are code nodes only.",
      "Enabling the Reset button changes run behaviour: after each successful run the field clears itself (the input box empties, though the state value written during the run remains). The reset button separately runs code-node reset() over reset targets.",
      'The editor\'s State binding dropdown only ever writes mode "name". If no state slots exist the control is disabled and the node has nowhere to write.',
    ],
    example:
      'A search box: Field label \\"Search term\\", Placeholder \\"Enter a keyword…\\", Run button ON with text \\"Search\\", State binding -> \\"query\\". Run targets: check only the http_request node that calls the search API. The user types a keyword (written live to state.query), presses Enter or clicks Search, which writes query and runs just that request node. Optionally enable the Reset button (\\"Clear\\") with reset targets pointing at the code node that empties the results slot.',
  },
  button: {
    summary:
      'The "button" node (NodeNeta label "Button", slug @button, group Inputs) is a standalone action button that renders no input field. Clicking it triggers the code/transform/AI chain (runChain) over the tool\'s current shared state; an optional second reset button triggers resetChain. Mental model: a manual trigger for logic that consumes existing state, rather than a control that owns a state slot.',
    whenToUse:
      'Use when you need to run logic on demand against state that other input nodes already populated, without collecting a fresh value — e.g. a "Generate", "Recalculate", or "Submit" action. Add the optional reset button to let users clear/restore state by re-running code nodes\' reset() functions.',
    config: [
      {
        name: "Label (optional)",
        description:
          'Maps to ButtonNode.fieldLabel. Free text heading rendered above the button. Placeholder: "Heading shown above the button". Default empty string (no heading). Purely cosmetic — does NOT create or bind to a state slot.',
      },
      {
        name: "Description",
        description:
          'Maps to ButtonNode.description. Free text helper line shown below the label. Placeholder: "Optional helper text shown below the label". Default empty string. Cosmetic only.',
      },
      {
        name: "Button text",
        description:
          'Maps to ButtonNode.buttonText. The clickable action button\'s caption. Default "Run". Free text.',
      },
      {
        name: "Reset button (toggle)",
        description:
          'Maps to ButtonNode.resetEnabled. Toggle row labelled "Reset button" with description "Show a reset button beside the action button." Default off (false). When on, reveals the Reset button text field and the Reset targets selector, and renders a second button that triggers resetChain.',
      },
      {
        name: "Reset button text",
        description:
          'Maps to ButtonNode.resetText. Only visible when Reset button is enabled. Caption for the reset button. Default "Reset". Free text.',
      },
      {
        name: "Run targets",
        description:
          'Maps to ButtonNode.targets (string[] of node ids). Multi-select dropdown of eligible runnable nodes (code, ts_type, http_request, filter, map, sort, merge, template, regex, jsonpath, math, schema_validate, encode, ai). Trigger shows "All {n} nodes" when none checked or "{n} selected". Help text: "Nothing checked — run the whole chain." / "Runs {n} selected nodes, in chain order." Empty when no eligible nodes exist: "No code, TS type, or AI nodes in this tool yet. Add some to target them." Empty array = run the entire chain top-to-bottom.',
      },
      {
        name: "Reset targets",
        description:
          'Maps to ButtonNode.resetTargets (string[] of node ids). Only visible when Reset button is enabled. Multi-select dropdown of eligible nodes — code nodes ONLY (reset() lives on code nodes). Trigger shows "All {n} nodes" / "{n} selected". Help text: "Nothing checked — reset the whole chain." / "Resets {n} selected nodes, in chain order." Empty state: "No code nodes in this tool yet. Add some to target them." Empty array = reset every code node.',
      },
      {
        name: "Footer note",
        description:
          'Static informational text rendered at the bottom of the editor: "Runs over current state — no input field." Not editable.',
      },
    ],
    io: {
      reads:
        "No state binding of its own — the node has no `binding` field and reads no slot directly. Indirectly, the chain it triggers reads whatever state slots its target code/transform/AI nodes consume.",
      writes:
        "Writes nothing itself. The state mutations come from the nodes it runs: runChain executes the selected target nodes (or the whole chain if `targets` is empty) and they `state.set(...)` into the shared map; the reset button's resetChain runs target code nodes' `reset(state)` to mutate state.",
    },
    tips: [
      "No state binding: unlike other Input nodes, a button never owns or writes a state slot. fieldLabel/description are cosmetic only — they do not create a slot.",
      "Empty Run targets means run EVERYTHING. Leaving the Run targets dropdown unchecked executes the entire chain top-to-bottom, not nothing. Check specific nodes to scope the run.",
      "Run targets vs Reset targets eligibility differs: run can target code, ts_type, http_request, filter, map, sort, merge, template, regex, jsonpath, math, schema_validate, encode, and ai nodes; reset can only target code nodes (because reset() is a code-node concept).",
      "The reset button only appears (and Reset button text / Reset targets fields only show) when the Reset button toggle is on (resetEnabled defaults to false).",
      "Targets are stored as node ids in chain order of the tool, not by selection order — the runtime iterates tool.nodes and only runs ids present in the targets set, so execution always follows top-to-bottom layout order.",
      "resetChain only invokes `reset(state, ai)` defined in code nodes; a code node with no reset() function in a reset target list is effectively a no-op.",
    ],
    example:
      'A tool has a Number input bound to state slot `seed`, a Code node that reads `seed` and writes a generated result to `output`, and a Markdown node rendering `{{output}}`. Add a Button node with Button text "Generate" and leave Run targets empty so the whole chain runs on click. Enable the Reset button (text "Clear"), and in Reset targets pick only the generator Code node — whose `reset(state)` does `state.set("output", "")` — so "Clear" wipes just the output while leaving `seed` untouched.',
  },
  number: {
    summary:
      'The "number" node (@number, group "Inputs") is a numeric input that renders a slider and a number stepper side by side, two-way bound to a single state slot. The end user drags the slider or types a value; the value is constrained by min/max/step and written back to the bound state as a stringified number, keeping the flat string state map consistent.',
    whenToUse:
      "Use it when a tool needs a bounded numeric parameter that an end user adjusts (e.g. count, percentage, threshold, font size) and that downstream logic/output nodes read via state. Prefer it over a free text field whenever the value should be range-constrained and presented as a slider.",
    config: [
      {
        name: "Field label",
        description:
          'Visible label shown above the slider/number controls in the rendered tool. Plain text. Default "Number". Maps to NumberNode.fieldLabel.',
      },
      {
        name: "Description",
        description:
          'Optional helper text rendered in small muted type beneath the label. Placeholder reads "Optional helper text shown below the label". Empty by default. Maps to NumberNode.description.',
      },
      {
        name: "Min",
        description:
          'Lowest allowed value (inclusive). type="number" input; only finite numbers are accepted (non-finite entries are ignored). Default 0. Sets the min attribute on both the slider and stepper, and is also used as the runtime fallback value. Maps to NumberNode.min.',
      },
      {
        name: "Max",
        description:
          'Highest allowed value (inclusive). type="number" input; only finite numbers are accepted. Default 100. Sets the max attribute on both controls. Maps to NumberNode.max.',
      },
      {
        name: "Step",
        description:
          'Increment for the slider and the number stepper. type="number" input; only finite numbers are accepted. Default 1. Maps to NumberNode.step.',
      },
      {
        name: "State binding",
        description:
          'Dropdown selecting which state slot this node reads from and writes to. Lists every slot defined in the state node by name; disabled with placeholder "— no state —" when no state exists, otherwise "Pick state…". Selecting a slot stores binding as { mode: "name", value: <stateName> }. Help text: "Which state this node reads from / writes to." Default binding targets state1. Maps to NumberNode.binding.',
      },
    ],
    io: {
      reads:
        "The bound state slot (resolved from binding via resolveBinding). On render the raw value is parsed with Number(); if not finite, the control falls back to the node's min.",
      writes:
        "The same bound state slot. On slider or stepper change it writes String(value) (a stringified number) back to state and triggers the debounced code-chain change().",
    },
    tips: [
      'The value is stored as a STRING (e.g. "42"), not a number — downstream code/math/template nodes must Number()-coerce it before arithmetic.',
      "If the bound state holds a non-numeric or empty value, the control silently displays min rather than erroring; seed the slot with a sensible numeric default in the state node.",
      "min/max/step are HTML constraints on the controls — the stepper enforces them on its own UI, but they are not re-clamped in the write path, so set them deliberately. step also governs slider granularity.",
      'The editor only writes binding mode "name"; resolveBinding also supports an "index" mode (positional state slot) at runtime, but the editor dropdown never produces it.',
      "Binding requires a state node to exist; with no state slots the dropdown is disabled and the node has nothing to read/write.",
    ],
    example:
      'A quiz-difficulty control: add a state slot `questionCount` (default \\"10\\"), add a Number node with Field label \\"Number of questions\\", Min 1, Max 50, Step 1, bound to `questionCount`. The user drags the slider to 25; state `questionCount` becomes \\"25\\", and a downstream code node reads it as Number(state.get(\\"questionCount\\")) to build the quiz.',
  },
  select: {
    summary:
      'The Select node is a single-choice dropdown input, two-way bound to one flat state slot. Options come from a static editor list, or—if an \\"Options from state\\" slot is bound and holds an array—are driven by that state at runtime; the chosen option\'s value string is written to the bound slot.',
    whenToUse:
      "Reach for it when the end user must pick exactly one value from a known set and store it in state for downstream logic. Use the static list for fixed choices, or bind options-from-state when the choices are produced dynamically (e.g. by a Code or HTTP node).",
    config: [
      {
        name: "Field label",
        description:
          'Text input (i18n field.fieldLabel). The bold label shown above the dropdown in the preview. Default "Select". Free text.',
      },
      {
        name: "Description",
        description:
          'Text input (i18n field.description, placeholder field.descPlaceholder: "Optional helper text shown below the label"). Renders as small muted helper text under the label in the preview, only when non-empty. Default "".',
      },
      {
        name: "Options",
        description:
          'Editable static option list (i18n select.options). Each row is two text inputs side by side: a Label input (placeholder "Label", select.labelPlaceholder) and a monospace Value input (placeholder "Value", select.valuePlaceholder), plus a trash button to remove that row (select.removeOption). "Add option" button (select.addOption) appends a new row defaulted to value `option{N}` / label `Option {N}`. Value is what gets written to state when chosen; Label is the display text and falls back to Value if blank. Default two options: {value:"option1", label:"Option 1"}, {value:"option2", label:"Option 2"}.',
      },
      {
        name: "Options from state",
        description:
          'Dropdown of state slot names (i18n select.optionsState), with a "— none —" entry (field.none) to leave it unbound. Help text (select.optionsState.help): "Optional. Bind a state slot holding an array (of strings or {value, label} objects) to drive the options at runtime — overrides the static list above." Writes optionsBinding as {mode:"name", value}. When set and that slot holds an array, it replaces the static Options list at runtime. Default unbound (value:"").',
      },
      {
        name: "State binding",
        description:
          'Dropdown of state slot names (i18n field.stateBinding) with help "Which state this node reads from / writes to." (field.stateBinding.help). The slot the chosen option\'s value is written to and read back from. Disabled with placeholder "— no state —" when no state slots exist; otherwise placeholder "Pick state…". Editor always writes {mode:"name", value}. Default {mode:"name", value:"state1"}.',
      },
    ],
    io: {
      reads:
        'Reads the bound state slot (binding) for its current value (defaults to empty string if unset). If "Options from state" (optionsBinding) is set, also reads that slot, expecting an array of strings or {value, label} objects to build the option list. Binding resolves by name (the editor only writes name mode), but the type/runtime also support index mode via resolveBinding.',
      writes:
        "On selection, writes the chosen option's value string into the bound state slot (binding) and triggers the live change() chain (debounced). Selecting the blank placeholder writes an empty string. Writes nothing to the optionsBinding slot — that slot is read-only here.",
    },
    tips: [
      "State is a flat string map: the value written is always the option's `value` as a string. Make the option values match what downstream nodes expect (the Label is display-only).",
      '"Options from state" overrides the static Options list entirely when its slot holds an array. For array items, string entries become value === label; object entries use {value, label} with value falling back to label (and vice-versa) when one is missing.',
      'The preview always prepends a blank placeholder option ("Select…") whose value is the empty string, so an unselected/empty bound slot shows as the placeholder.',
      "If the bound state slot's current value doesn't match any option value, the native <select> shows nothing selected (the empty placeholder); seed the state default to a valid option value to pre-select one.",
      'If "Options from state" is bound but the slot is not an array (e.g. a JSON string), it falls back to the static Options list — parse JSON into an array in an upstream node first.',
      "An option Label left blank falls back to showing its Value.",
    ],
    example:
      'Build a single-choice picker. State node has slots `country` (default \\"\\") and (optional) `countryOptions`. Add a Select node: Field label \\"Country\\", State binding `country`, and either fill the static Options list (Label \\"United States\\" / Value \\"us\\", Label \\"Japan\\" / Value \\"jp\\"), or set Options from state to `countryOptions` whose runtime value is `[{\\"value\\":\\"us\\",\\"label\\":\\"United States\\"},{\\"value\\":\\"jp\\",\\"label\\":\\"Japan\\"}]` (a Code/HTTP node could populate it). Picking \\"Japan\\" writes `\\"jp\\"` into the `country` state slot; downstream nodes read `state.country`.',
  },
  toggle: {
    summary:
      'A "Toggle" input node (NODE_META label "Toggle", slug @toggle, group "Inputs", blurb "Boolean on/off switch, two-way bound to state."). It renders an on/off switch whose bound state slot holds the string "true" or "false". Mental model: a two-way checkbox over one flat state key — the switch reflects the current state value and writing flips it.',
    whenToUse:
      "Use it whenever a tool needs a boolean flag the end user can flip (feature on/off, enable a branch, mark a checkbox) that downstream logic/code nodes can read from the shared state store. Reach for Select instead if you need more than two choices.",
    config: [
      {
        name: "Field label",
        description:
          'Text input (i18n key field.fieldLabel). The label shown beside the switch in the preview. Default config value: "Toggle". Stored in node.fieldLabel.',
      },
      {
        name: "Description",
        description:
          'Text input (i18n key field.description), placeholder "Optional helper text shown below the label". Optional helper text rendered under the label; only shown when non-empty. Default: "" (empty). Stored in node.description.',
      },
      {
        name: "State binding",
        description:
          'Select dropdown (i18n key field.stateBinding, help "Which state this node reads from / writes to."). Lists the names from the tool\'s state node; picking one sets binding = { mode: "name", value: <stateName> }. Disabled with placeholder "— no state —" when no state slots exist, otherwise placeholder "Pick state…". Default config value: { mode: "name", value: "state1" }. The editor only writes name-mode bindings, though the runtime resolver also supports an index mode.',
      },
    ],
    io: {
      reads:
        'The state slot named by its binding (resolveBinding(node.binding, stateNode)). The switch shows "on" when that value === the string "true" or the boolean true; any other value (including "false", "", or undefined) shows "off".',
      writes:
        'Same bound slot. Clicking the switch writes the string-coerced negation: String(!checked), i.e. the literal "true" or "false". Two-way / two-state — there is no separate input vs output binding. If no slot is resolved the write targets an empty-string key. Toggling also fires downstream code-node change() handlers via the debounced change pass.',
    },
    tips: [
      'Values are STRINGS, not booleans. State stores "true"/"false". When reading this slot in a code node, compare against the string (state.get("flag") === "true"), not a JS boolean.',
      'On-detection is strict: only "true" (string) or true (boolean) read as on. If another node writes "True", "1", or "yes" into the slot, the toggle will display as off.',
      'Default binding is { mode: "name", value: "state1" }, so a freshly dropped toggle points at a slot literally named state1 — rebind it (and make sure that slot exists) or its writes go to an unintended/empty key.',
      "The binding dropdown is disabled until the tool has a state node with at least one slot; add state first.",
      'The state node\'s seeded default for the slot decides the initial on/off position — seed it with "true" or "false" for a predictable starting state.',
    ],
    example:
      'State node defines a slot `darkMode` with default value `"false"`. A Toggle node has Field label = "Dark mode", Description = "Use the dark theme", and State binding = darkMode. At runtime the switch starts off; clicking it sets state darkMode = "true". A downstream code node reads it: `if (state.get("darkMode") === "true") { /* apply dark theme */ }`.',
  },
  date: {
    summary:
      "An input node that renders a native HTML date/time picker (date, time, or datetime-local) and two-way binds its string value to one flat state slot. Mental model: a form field whose chosen value is the slot's value — the picker shows what's in state and writes the picked value straight back.",
    whenToUse:
      "Reach for the Date node when you need the end user to enter a calendar date, a clock time, or both as a single form field, and you want that value captured into one state slot for downstream nodes to consume.",
    config: [
      {
        name: "Field label",
        description:
          'Text input (i18n key field.fieldLabel). The heading shown above the picker in the rendered tool. Defaults to "Date". Free text.',
      },
      {
        name: "Description",
        description:
          'Text input (i18n key field.description). Optional helper text rendered below the label in the preview. Placeholder: "Optional helper text shown below the label". Defaults to empty string; if blank, no helper line is rendered.',
      },
      {
        name: "Picker",
        description:
          'Select (i18n key date.mode; help text: "Which native picker the end user sees."). Chooses which native HTML input control renders. Options (DATE_MODES): "Date" (value date -> <input type="date">), "Time" (value time -> <input type="time">), "Date & time" (value datetime -> <input type="datetime-local">). Defaults to date.',
      },
      {
        name: "State binding",
        description:
          'Select (i18n key field.stateBinding; help text: "Which state this node reads from / writes to."). Picks one state slot (by name) from the state node\'s declared states to two-way bind. Defaults to { mode: "name", value: "state1" }. Disabled and shows "— no state —" when the state node declares no states; placeholder "Pick state…" otherwise.',
      },
    ],
    io: {
      reads:
        "The bound state slot (binding). The preview seeds the picker's value from runtime[boundName] (empty string when unset), so the node reflects whatever value is currently in that slot.",
      writes:
        "The same bound state slot (binding). On every change the native control's raw string value is written straight into that slot: `YYYY-MM-DD` for Date mode, `HH:mm` for Time mode, `YYYY-MM-DDTHH:mm` for Date & time mode. It is two-way bound — read and write target the same slot.",
    },
    tips: [
      "The value written to state is always a string in the native control's format, never a Date object or timestamp: `YYYY-MM-DD` (Date), `HH:mm` (Time), or `YYYY-MM-DDTHH:mm` (Date & time). Downstream logic nodes that expect a parseable timestamp must convert it (e.g. new Date(value) in a Code node).",
      "The Picker mode only swaps the native input type — it does not reformat or migrate an existing value in the slot. If the slot already holds a value in a different format, the native control may show it as blank/invalid until the user re-picks.",
      'It is two-way bound to a single slot via the State binding select: the same slot is both the source for the displayed value and the write target. Binding stores by name (mode "name") by default; the slot must exist on the state node or the binding select is disabled and shows "— no state —".',
      "Unlike logic nodes, the date node is NOT executed by runChain — its write happens in the preview renderer on user change (debounced). So its value only enters state through user interaction in the rendered tool, not as part of the chain pass.",
      "An empty/unset slot renders an empty picker; the slot keeps whatever default the state node seeds until the user picks a value.",
    ],
    example:
      'A booking tool: add a state slot `pickupDate`. Drop a Date node, set Field label = \\"Pickup date\\", Picker = \\"Date\\", State binding = `pickupDate`. When the user selects 2026-06-20 in the preview, state.pickupDate becomes the string \\"2026-06-20\\". A downstream Template node can then read `{{pickupDate}}`. Switching Picker to \\"Date & time\\" would instead write strings like \\"2026-06-20T14:30\\".',
  },
  file: {
    summary:
      'The "File upload" node (type "file", slug @file) is an input node. The end user picks a file via a native file picker; the file\'s bytes are encoded per the node\'s Output format and the resulting string is written into one bound state slot, then the live change chain re-runs. Mental model: a one-way input that turns an arbitrary uploaded file into a single string in flat state (no parsing — that\'s what the CSV node is for).',
    whenToUse:
      "Reach for this when a tool needs the raw contents of an arbitrary uploaded file as a string in state — e.g. feeding a document's text/base64 into an AI or HTTP node, or producing a data: URL. Use the Image node instead for pictures with a preview, or the CSV node when you need parsed rows.",
    config: [
      {
        name: "Field label",
        description:
          'i18n field.fieldLabel. Single-line text. The visible label rendered above the upload button in the preview. Default: "File".',
      },
      {
        name: "Description",
        description:
          'i18n field.description. Single-line text, placeholder "Optional helper text shown below the label". Optional helper text shown beneath the label; hidden when empty. Default: "".',
      },
      {
        name: "Output format",
        description:
          'i18n file.format. Select with three options (FILE_OUTPUT_FORMATS, in menu order): "Text (UTF-8)" (value text), "Base64" (value base64), "Data URL" (value dataurl). Controls how the chosen file is encoded into state: Text = UTF-8 contents; Base64 = raw base64 with no data: prefix; Data URL = a full data:<mime>;base64,... URI. Default: text. Help text: "How the chosen file is encoded into state: Text (UTF-8 contents), Base64 (raw, no prefix), or a Data URL."',
      },
      {
        name: "Accept filter",
        description:
          'i18n file.accept. Free-text input (monospace), placeholder ".pdf,.txt,image/*". Passed straight to the native <input type="file" accept> when non-empty; empty string allows any file. Default: "" (any file). Help text: "Optional native filter (e.g. .pdf,.txt or image/*). Leave blank to allow any file."',
      },
      {
        name: "State binding",
        description:
          'i18n field.stateBinding. Select listing the state slots defined by the state node; choosing one sets binding to {mode: "name", value: <slot name>}. Disabled with placeholder "— no state —" when no state slots exist, otherwise "Pick state…". This is the single slot the encoded string is written to. Default: {mode: "name", value: "state1"}. Help: "Which state this node reads from / writes to."',
      },
    ],
    io: {
      reads: null,
      writes:
        'The single state slot named by binding (resolved via resolveBinding: by name, or by positional index if mode is "index"). On file selection the runtime (PreviewPane loadFile) sets that slot to the encoded string — file.text() for text, the FileReader data URL for dataurl, or that data URL with the leading data:<mime>;base64, prefix stripped for base64 — then re-runs the change chain. It is a write-only input: it does not read existing state to render.',
    },
    tips: [
      "No parsing or validation: the slot receives a plain string. For binary files choose Base64 or Data URL — Text decodes the bytes as UTF-8 and will mangle non-text files.",
      "Base64 strips the data:<mime>;base64, prefix (regex ^data:[^;]*;base64,); Data URL keeps it. Pick base64 for APIs that want raw base64, dataurl for <img src> / Markdown embedding.",
      "The Accept filter is only a UI hint to the native picker (the accept attribute) — it does not enforce file type at runtime; users can still bypass it. Leave it blank to allow anything.",
      "If no state slot is bound (empty value) the upload is a no-op — loadFile returns early when the resolved name is empty, so nothing is written and the chain does not run. Make sure a state slot exists and is selected.",
      "The picker is reset after each selection (input value cleared), so re-selecting the same file fires the change chain again; selecting nothing leaves the slot unchanged.",
    ],
    example:
      'A \'Summarize a document\' tool: a File upload node with Field label \\"Source document\\", Output format \\"Text (UTF-8)\\", Accept filter \\".txt,.md\\", bound to state slot `docText`. The user picks notes.txt; `docText` is set to the file\'s text contents and the chain re-runs. A downstream AI node reads {{docText}} in its prompt to produce a summary. Switching Output format to \\"Data URL\\" with Accept \\"image/*\\" instead would let an AI vision node consume the upload as a data: URL.',
  },
  image: {
    summary:
      'The "Image upload" node (type "image", slug @image) is an Input node that lets the end user pick an image file in the preview. On upload it reads the file as a data: URL and writes that string into one bound state slot; it then renders a live thumbnail from that same slot. Mental model: a one-way image-to-state field whose value is a full data URL, ready to feed an AI vision prompt or be rendered downstream.',
    whenToUse:
      "Reach for it when the tool needs the user to supply an image and you want that image as a data: URL in state — e.g. feeding an AI vision node, or rendering the image in a Markdown/output node downstream.",
    config: [
      {
        name: "Field label",
        description:
          'Text input (i18n field.fieldLabel). The bold label shown above the upload control in the preview. Defaults to "Image". Free text; also used as the rendered <img> alt text.',
      },
      {
        name: "Description",
        description:
          'Text input (i18n field.description). Optional helper text rendered in muted style below the label (placeholder: "Optional helper text shown below the label"). Empty by default; hidden if blank.',
      },
      {
        name: "State binding",
        description:
          'Select (i18n field.stateBinding) listing the state slots defined by the state node. Picks the single slot the uploaded image is written to and read back from. Help text: "Which state this node reads from / writes to." Disabled (shows "— no state —") when no state slots exist; otherwise shows "Pick state…". Defaults to the slot named state1. Selecting a value always stores binding as { mode: "name", value }.',
      },
      {
        name: "image.help (static note)",
        description:
          'Not an input — a fixed muted helper line at the bottom of the editor: "End users upload an image; a data URL is written to the bound state — ready to feed an AI vision prompt or render elsewhere."',
      },
    ],
    io: {
      reads:
        'The bound state slot (binding resolved via resolveBinding). On every preview render it reads runtime[name]; if the value is a string it is used as the <img> src to show a thumbnail and to decide between the "Choose image…" and "Change image…" button labels.',
      writes:
        'The same bound state slot. On file selection the preview calls loadFile(name, file, "dataurl"), which FileReader.readAsDataURL(file) and stores the FULL data: URL string (e.g. data:image/png;base64,...) into runtime[name], then re-runs the code chain. Reading and writing target one and the same slot.',
    },
    tips: [
      'Binding is single-slot and always written as mode "name" by the editor — the same slot is both read (thumbnail) and written (upload). There is no separate input/output binding.',
      'The value stored is the FULL data URL including the "data:<mime>;base64," prefix (format "dataurl"), not raw base64. Unlike the File node, the image node has no format option and no base64-stripping; consumers that need bare base64 must strip the prefix themselves.',
      'The preview file picker hardcodes accept="image/*"; there is no editor control to widen or restrict accepted types (the type has no `accept` field, unlike FileNode).',
      'If no state slots are defined yet, the State binding select is disabled and shows "— no state —"; create a slot on the state node first.',
      "Large images become large data-URL strings held in state and passed through the chain (e.g. into AI prompts) — watch payload/token size.",
      "The seed/default value of the bound state slot is ignored for display unless it is itself a valid image src; the node only shows a thumbnail when the slot holds a string.",
    ],
    example:
      'A "Describe this photo" tool: a state node defines a slot `photo`. An Image upload node has Field label "Your photo", Description "PNG or JPG", and State binding = photo. The end user uploads cat.png; the node writes data:image/png;base64,iVBORw0... into state.photo and shows a thumbnail. A downstream AI vision node reads state.photo as the image input and writes a caption to another slot.',
  },
  textarea: {
    summary:
      'An Inputs-group node (label "Textarea", slug @textarea) that renders a multi-line text field two-way bound to a single state slot. Mental model: it is the editable string mirror of one state key — whatever the user types is written straight to that key, and the key\'s current value is shown back in the field.',
    whenToUse:
      "Reach for it whenever the tool needs free-form multi-line string input from the end user (message bodies, notes, prompts) that downstream logic/AI/template nodes will consume from state. For single-line text use a Text node; for rich Markdown authoring use the Markdown node.",
    config: [
      {
        name: "Field label",
        description:
          'Text input. Sets node.fieldLabel — the bold label shown above the field in the preview. Default "Message". Any string.',
      },
      {
        name: "Description",
        description:
          'Text input (placeholder "Optional helper text shown below the label"). Sets node.description — small muted helper text rendered under the label in the preview; only shown when non-empty. Default "". Any string.',
      },
      {
        name: "Placeholder",
        description:
          'Text input. Sets node.placeholder — the empty-field placeholder of the <textarea> in the preview. Default "Write a message…". Any string.',
      },
      {
        name: "Editor height (px)",
        description:
          'Number input (step 10). Sets node.editorHeight — the initial pixel height of the textarea in the preview (it stays vertically resizable by the end user). Help text: "Initial field height in the preview (80–800px)." Free typing while focused; on blur the value is clamped to 80–800. Default 120 (EDITOR_HEIGHTS.defaults.textarea).',
      },
      {
        name: "State binding",
        description:
          'Select dropdown listing every state defined on the state node. Sets node.binding to { mode: "name", value: <stateName> }. Help text: "Which state this node reads from / writes to." Disabled with "— no state —" when no state exists; otherwise placeholder "Pick state…". Default value "state1". This is the single read/write slot for the field.',
      },
    ],
    io: {
      reads:
        'The value of the single bound state slot (binding, mode "name", default "state1"), coerced to string for display (`runtime[name] ?? ""`).',
      writes:
        "The typed string back to that same bound state slot on every change (debounced re-run of the chain).",
    },
    tips: [
      'The field is two-way bound to exactly one state slot via State binding. The displayed value is `runtime[stateName] ?? ""` (always coerced to string), and every keystroke writes `e.target.value` (a string) back to that same slot. There is no separate read vs write slot.',
      "Edits are debounced: typing updates local state immediately but the node chain (code/AI nodes) is re-run via a debounced callback, so downstream outputs lag slightly behind keystrokes.",
      "Editor height only sets the INITIAL preview height; the rendered textarea is `resize-y`, so the end user can drag it taller/shorter. Values are clamped to 80–800px on blur — typing outside that range is allowed while focused but snaps back on blur.",
      "If the bound state slot is also the OUTPUT of a Markdown-emitting AI node, the preview stops showing an editable textarea and instead renders the value as rendered Markdown whenever it is non-empty (it falls back to the editable textarea only when the value is empty). Bind to a dedicated slot if you want it to always stay editable.",
    ],
    example:
      'A tool with state slot `messageBody`. Drop a Textarea node, set Field label = "Your message", Placeholder = "Type something…", Editor height = 200, State binding = messageBody. At runtime the end user types into the field, writing the string into state.messageBody; a downstream code or AI node then reads state.messageBody (e.g. interpolated into a prompt via {{messageBody}}).',
  },
  markdown: {
    summary:
      'A two-way bound, multi-line Markdown input field (NODE_META label "Markdown", slug "@markdown", group "Inputs"). The end user types raw Markdown into a textarea and can flip a per-node Write/Preview toggle to see it rendered live (GFM + KaTeX math + code highlighting via the shared MarkdownView). The raw Markdown source is stored in the bound state slot — think of it as a textarea whose value happens to be Markdown and that can render itself.',
    whenToUse:
      'Use it when you want an end user to author rich text (headings, lists, tables, code, math) and have the raw Markdown captured into state for a downstream code/AI node to read, or for a website/output node to render. Reach for plain "Textarea" instead when you only need flat text with no Markdown rendering.',
    config: [
      {
        name: "Field label",
        description:
          'Plain-text label shown above the field in the preview (config key fieldLabel). Defaults to "Markdown". Free text.',
      },
      {
        name: "Description",
        description:
          'Optional helper text rendered as small muted text under the label (config key description). Placeholder in the editor: "Optional helper text shown below the label". Empty string hides it. Free text.',
      },
      {
        name: "Placeholder",
        description:
          'Placeholder text shown inside the empty Write-mode textarea (config key placeholder). Default "# Write Markdown…". Free text. Not shown in Preview mode.',
      },
      {
        name: "Editor height (px)",
        description:
          "Initial height of the Write-mode textarea / minHeight of the Preview box, in px (config key editorHeight). Number input, step 10, clamped on blur to 80–800; default 220. Free typing is allowed while focused and only clamped on blur.",
      },
      {
        name: "State binding",
        description:
          'Dropdown selecting which state slot this node reads from and writes to (config key binding, always stored as {mode:"name", value:<stateName>}). Lists every state defined on the State node; disabled with "— no state —" if no states exist, otherwise "Pick state…". Default seed value "state1". Help text: "Which state this node reads from / writes to."',
      },
    ],
    io: {
      reads:
        'The state slot named by `binding` (resolved via resolveBinding). The current value `runtime[name] ?? ""` is shown as the textarea value in Write mode and rendered via MarkdownView in Preview mode.',
      writes:
        "The same bound state slot. Editing the Write-mode textarea sets `runtime[name] = e.target.value` immediately and pushes the change through a debounced state update (so downstream logic/code nodes re-run). The raw Markdown string is written verbatim — no parsing or transformation. There is no separate runtime transform (runSyncTransform does not handle markdown); it is a pure two-way bound input.",
    },
    tips: [
      "Binding is read/write to the SAME slot — there is no separate input vs. output. Whatever you bind to is both seeded into the field and overwritten as the user types.",
      "The Write/Preview toggle is end-user UI state only (kept per node id in the preview), not config — you cannot pin a node to start in Preview from the editor; it always opens in Write mode.",
      "State stores the RAW Markdown source string, not rendered HTML. Downstream code/AI nodes receive the literal Markdown text; render it yourself (e.g. via a website/output node) if you need HTML.",
      'If the bound slot is empty, Preview shows "Nothing to preview yet." rather than a blank box.',
      "Rendering supports GFM, KaTeX math and code highlighting and is sanitized (rehypeSanitize), and content is pre-processed for LaTeX delimiters and loose line breaks (remarkBreaks) — so single newlines become line breaks, which can differ from strict CommonMark.",
      "Editor height is clamped to 80–800px on blur; values outside that range typed in the editor will snap back when you leave the field.",
    ],
    example:
      'A tool collects a release note from the user. State node defines a "draft" slot. A Markdown node is bound to "draft" with Field label "Release notes", placeholder "# v2.0…", editor height 320. The user types `# v2.0\\n\\n- Fixes **bug** in $E=mc^2$` and toggles Preview to verify the rendered headings/list/math. The runtime stores the raw source in `state.draft`; a downstream AI node bound to read "draft" summarizes it, and a website node renders `{{draft}}` as Markdown.',
  },
  json: {
    summary:
      'The "json" node (NODE_META label "JSON", slug @json, group "Inputs", accent blue, Braces icon) is a two-way-bound input field that renders a JSON code editor in the preview. The end user pastes or edits JSON; when the document parses, it is auto-formatted in place, and the raw source string (not a parsed object) is stored in the bound state slot.',
    whenToUse:
      "Use it to collect free-form structured JSON from the end user into one state slot, then JSON.parse it in a downstream code node. Choose it over a plain textarea when you want code-editor affordances and auto-formatting of valid JSON.",
    config: [
      {
        name: "Field label",
        description:
          'Text input (i18n key field.fieldLabel, English "Field label"). Sets node.fieldLabel — the heading shown above the JSON editor in the preview. Default "JSON". Free text.',
      },
      {
        name: "Description",
        description:
          'Text input (i18n key field.description, English "Description"). Sets node.description — optional helper text rendered below the label in the preview. Placeholder is field.descPlaceholder ("Optional helper text shown below the label"). Default empty string. Free text.',
      },
      {
        name: "Editor height (px)",
        description:
          'Number input (i18n key field.editorHeight, English "Editor height (px)"). Sets node.editorHeight — the initial height of the JSON code editor in the preview. min=80, max=800, step=10 (from EDITOR_HEIGHTS). Typing while focused is unconstrained; on blur the value is clamped into the 80–800 range. Default 220 (EDITOR_HEIGHTS.defaults.json). Help text: "Initial field height in the preview (80–800px)."',
      },
      {
        name: "State binding",
        description:
          'Select dropdown (i18n key field.stateBinding, English "State binding"). Sets node.binding to { mode: "name", value: <stateName> } — the single flat state slot this field two-way binds to. Options are the names defined in the tool\'s state node; placeholder "Pick state…" (or "— no state —" / disabled when no states exist). Default { mode: "name", value: "state1" }. Help text: "Which state this node reads from / writes to."',
      },
    ],
    io: {
      reads:
        'The bound state slot (binding.mode "name", resolved via resolveBinding). The current value of that slot pre-populates the editor; the field is two-way, so the editor reflects whatever is in the bound slot.',
      writes:
        "The same bound state slot. As the end user edits, the raw JSON source STRING (auto-formatted when it parses) is written back to that slot. It writes a string, never a parsed object — downstream code must JSON.parse it. The node performs no work during runChain (it is not a code/AI node and not in runSyncTransform); all read/write is the live two-way binding in the preview UI.",
    },
    tips: [
      'The bound state holds a STRING, not an object. The json.help text is explicit: downstream code nodes must JSON.parse it (e.g. JSON.parse(state.get("…"))). Contrast with the CSV node, which writes a parsed array.',
      'Binding is name-mode only (a dropdown of state names); there is no manual/literal binding entry here. If the tool\'s state node defines no states, the dropdown is disabled ("— no state —") and the field cannot bind.',
      "Editor height free-types while focused but clamps to 80–800px on blur; out-of-range or non-numeric input snaps back (to the clamped value or the 220px default).",
      "Auto-formatting only happens when the document parses as valid JSON. Invalid/partial JSON is left as-is and that raw (unparseable) string is what lands in state — guard JSON.parse against malformed input downstream.",
      'Default binding is the literal name "state1"; if your state slot is named differently, the field silently binds to a non-existent slot until you pick the correct state in the dropdown.',
    ],
    example:
      'A tool has a state slot named `payload`. Add a JSON node, set Field label to \\"Request body\\", and bind State binding to `payload`. The end user pastes `{\\"id\\":1,\\"tags\\":[\\"a\\",\\"b\\"]}` into the editor; it auto-formats and the raw formatted string is written to `payload`. A downstream code node reads it with `JSON.parse(state.get(\\"payload\\"))` to get the object.',
  },
  csv: {
    summary:
      "An end-user input node that lets the tool's user upload (or drop) a .csv file. The file is parsed client-side with PapaParse into an optimized array (empty rows/columns dropped, numbers/booleans typed, header names trimmed and de-duplicated) and the parsed array — not the raw text — is written to the bound state slot. Mental model: a typed-array data source for the chain, ready to iterate in code nodes without manual parsing.",
    whenToUse:
      "Reach for it when the tool needs tabular data from the user as the chain's input and you want it pre-parsed into a usable array. Prefer it over the JSON node for spreadsheet-style data, since CSV writes a real array (JSON writes a raw string you must JSON.parse).",
    config: [
      {
        name: "Field label",
        description:
          'Text input (i18n key field.fieldLabel). The heading shown above the upload button in the rendered tool. Stored in config.fieldLabel; free text. Default "CSV file".',
      },
      {
        name: "Description",
        description:
          'Text input (i18n key field.description) with placeholder "Optional helper text shown below the label". Optional helper line rendered under the field label in the preview. Stored in config.description; free text. Default empty ("").',
      },
      {
        name: "Header row",
        description:
          'Toggle (ToggleRow, i18n key csv.header) with sub-label "First row is column names — rows become objects keyed by header." When on, the first CSV row is treated as column names and each data row is written as an object keyed by (trimmed, de-duplicated) header names; when off, each row is written as a positional array (unknown[][]). Stored in config.hasHeader (boolean). Default true.',
      },
      {
        name: "State binding",
        description:
          'Select (BindingControl, label i18n key field.stateBinding, help "Which state this node reads from / writes to."). Lists the slots declared in the single State node; choosing one sets binding = { mode: "name", value: <slotName> }. Only "name" mode is offered. Disabled with placeholder "— no state —" when no state slots exist, otherwise "Pick state…". Default { mode: "name", value: "state1" }. The parsed rows array is written to this slot on upload.',
      },
    ],
    io: {
      reads:
        'Does not read state at runtime — it is an end-user input/source node. (The card subtitle resolves the binding only to display "Using State: <slot>".)',
      writes:
        "On a successful file upload, writes the parsed rows array (objects keyed by header when Header row is on, otherwise positional arrays) to the single state slot named by binding.value; writes nothing on parse error or when no slot is bound.",
    },
    tips: [
      "Writes a parsed array, not text. With Header row ON each row is an object keyed by column name (Record<string, unknown>[]); with it OFF each row is a positional array (unknown[][]) and the preview synthesizes column headers col1…colN. Code-node logic must branch on which shape you chose.",
      'Parsing/writing happens only on upload in the preview (PreviewPane.loadCsv → parseCsv), not in the runtime transform pass. On a parse error or with no state slot bound, nothing is written (state keeps its previous value) and an inline "Invalid CSV" message is shown; the upload still re-runs the change chain only on success.',
      'Auto-optimization can surprise you: skipEmptyLines is greedy (blank rows vanish), dynamicTyping coerces cells so "007" becomes 7 and "true" becomes a boolean, every cell is trimmed, empty cells become null, and trailing all-empty ghost columns are dropped. Don\'t rely on raw string fidelity.',
      "Header names are made safe and unique: blank headers become column1, column2, …; duplicate headers get _2, _3 suffixes. Reference the normalized names in code nodes, not the originals.",
      'Binding only supports mode "name" (pick an existing state slot). If the State node declares no slots the control is disabled, and an empty binding value silently skips the write.',
    ],
    example:
      'A tool that ranks uploaded sales data. State node declares a slot named `orders`. Add a CSV node with Field label \\"Upload orders\\", Header row ON, State binding -> `orders`. The end user uploads orders.csv with columns id,customer,total. The node parses it to `[{ id: 1, customer: \\"Acme\\", total: 1240 }, ...]` (numbers already typed) and writes that array to `orders`. A downstream code node then reads it directly: `const rows = state.get(\\"orders\\"); const top = rows.sort((a,b)=>b.total-a.total).slice(0,5); state.set(\\"top5\\", top);` — no JSON.parse or Number() needed."',
  },
  table: {
    summary:
      'The "table" node (NODE_META label "Table", slug @table) is a read-only renderer that displays a bound state slot as a sortable, resizable, paginated data table. Mental model: point it at one state slot that already holds tabular data (an array of objects, an array of arrays, or a JSON string of either) — it auto-optimizes the data for display (drops empty rows/columns, types numeric/boolean strings) and never writes anything back. It is an output/display node, not an input or transform.',
    whenToUse:
      "Reach for it at the end of a chain to show tabular results to the end user — e.g. after a CSV upload node, a JSON input, or a code node that produces an array. Use it whenever you have array-of-row data in a single state slot and want a browsable, sortable preview rather than raw text.",
    config: [
      {
        name: "Field label",
        description:
          'Free text title shown for the node (node.fieldLabel). Default "Table".',
      },
      {
        name: "Description",
        description:
          'Optional helper text shown below the label (node.description). Placeholder: "Optional helper text shown below the label". Defaults to empty string.',
      },
      {
        name: "Rows per page",
        description:
          'Select for the default page size in the preview (node.pageSize, type TablePageSize). Options come from TABLE_PAGE_SIZES = [30, 50, 100], rendered as "30 rows" / "50 rows" / "100 rows". Default 30 (TABLE_PAGE_SIZES[0]). Trigger placeholder "Pick page size…". Help text: "Default page size in the preview — end users can switch between 30 / 50 / 100."',
      },
      {
        name: "State binding",
        description:
          'Select (BindingControl) choosing which state slot the table reads from (node.binding). Lists state names defined by the state node; selecting one stores { mode: "name", value: <stateName> }. Disabled with placeholder "— no state —" when no state exists, otherwise "Pick state…". Default { mode: "name", value: "state1" }. Help: "Which state this node reads from / writes to." (this node only reads).',
      },
    ],
    io: {
      reads:
        'The single state slot named by node.binding, resolved via resolveBinding(binding, stateNode). The slot\'s value is rendered as the table: it accepts an array of objects, an array of arrays, or a JSON string of either, and the table auto-optimizes it (empty rows/columns dropped, numeric/boolean strings typed). In the runtime, the only "table" handling is in nodeSubtitle, where the resolved binding name is shown under the "Using State" label.',
      writes: null,
    },
    tips: [
      'Pure renderer: the table never writes to state. The "reads from / writes to" wording in the State binding help is the shared BindingControl text — for this node only the read applies. Put a Table after the node that actually produces the array.',
      "The bound slot must contain tabular data. A JSON string of an array works (it is parsed), but a non-array value (plain object, number, etc.) has nothing meaningful to tabulate.",
      "Display is auto-optimized, not configurable per column: empty rows/columns are dropped and numeric/boolean strings are coerced to typed values, so what renders may not be byte-for-byte the raw state. Every column sorts (text, numbers, auto-detected dates) and resizes by dragging the header edge.",
      'BindingControl always saves the binding as mode "name". Although StateBinding also supports mode "index" (resolved positionally against stateNode.states), the editor UI for this node only ever sets a name-mode binding.',
      "Rows per page is just the default page size in the preview — end users can still switch between 30 / 50 / 100 at runtime; the visible page is virtualized.",
    ],
    example:
      'A CSV upload node parses an uploaded file into the state slot \\"rows\\" as an array of header-keyed objects. Add a Table node, set Field label \\"Orders\\", Rows per page \\"50\\", and State binding \\"rows\\". The end user sees the order rows in a sortable, resizable table, 50 per page, with empty columns dropped and numeric/date columns auto-typed for correct sorting.',
  },
  chart: {
    summary:
      'The "Chart" node (NODE_META label "Chart", slug @chart, group "Inputs") is a read-only d3 visualization bound to one state slot. It accepts the same shapes as the Table node — an array of objects, an array of arrays, or a JSON string of either (e.g. CSV rows) — runs it through the shared normalizer (empty rows/columns dropped, numeric/boolean strings typed, per-column kind detected), then auto-resolves which columns to plot: the first text/date column becomes the category (X) axis and every numeric column becomes a value (Y) series. Renders as a bar, line, area, pie, or scatter chart that resizes to the preview width. It never writes to state.',
    whenToUse:
      "Reach for it at the end of a chain to visualize an array — CSV rows, a JSON array, or a code/HTTP/transform node's result. Use it instead of the Table node when a trend or distribution reads better as a picture than a grid; pair the two (Table + Chart on the same slot) to show detail and shape together.",
    config: [
      {
        name: "Field label",
        description:
          'Text input (i18n field.fieldLabel). The bold title shown above the chart in the preview. Default "Chart".',
      },
      {
        name: "Description",
        description:
          'Text input (i18n field.description). Optional helper text under the label; hidden when empty. Default "".',
      },
      {
        name: "Chart type",
        description:
          'Select (CHART_TYPES). One of bar, line, area, pie, scatter. Stored in node.chartType. Default "bar". Bar/line/area plot one or more numeric series against the category axis; pie uses the category column for slices and the first numeric column for size; scatter plots the first two numeric columns against each other.',
      },
      {
        name: "X / category field",
        description:
          "Text input bound to node.xField (a column key). Leave blank to auto-detect (first text column, else first date column, else the first column). For scatter this is the horizontal numeric axis; blank auto-picks the first numeric column.",
      },
      {
        name: "Value fields (Y)",
        description:
          "Repeatable list bound to node.yFields (column keys). Leave empty to auto-detect every numeric column. Add multiple to plot grouped bars / multiple lines / overlaid areas. Pie and scatter use only the first entry as their value / vertical axis.",
      },
      {
        name: "Legend",
        description:
          "Toggle bound to node.showLegend. Shows colored chips for each series (bar/line/area/scatter) or category (pie). Default on.",
      },
      {
        name: "Gridlines",
        description:
          "Toggle bound to node.showGrid. Shows horizontal axis gridlines on bar/line/area/scatter (ignored by pie). Default on.",
      },
      {
        name: "Chart height (px)",
        description:
          "Number input bound to node.height, clamped to 120–800 on blur. The chart fills the available width and uses this for height. Default 280.",
      },
      {
        name: "State binding",
        description:
          'State picker (BindingControl) bound to node.binding. The slot holding the array (or JSON string) to plot. Editor always writes mode "name". Default { mode: "name", value: "state1" }.',
      },
    ],
    io: {
      reads:
        'The single state slot named by node.binding (resolved via resolveBinding). The value is normalized with normalizeTableData (the same helper the Table node uses) and plotted. In the runtime the only chart handling is in nodeSubtitle, where the resolved binding name shows under the "Using State" label.',
      writes: null,
    },
    tips: [
      'Pure renderer: the chart never writes to state — put it after the node that produces the array. The shared State binding help says "reads from / writes to", but only the read applies here.',
      "Auto-resolve mirrors the Table normalizer: a JSON string of an array is parsed, numeric/boolean strings are typed, and empty rows/columns are dropped before plotting. A non-array value (plain object, number) has nothing to plot and shows the empty state.",
      "Leave X / category and Value fields blank to let the node choose columns; set them by column key (header name, or col1/col2… for header-less arrays) to override. Series colors follow the order of the resolved value fields.",
      "Pie and scatter only use the first value field. Pie sums the first numeric column per category; scatter plots the first two numeric columns (or auto-picks them) as x and y.",
      "Gridlines apply to the cartesian charts (bar/line/area/scatter); the pie ignores the gridlines and axis settings.",
    ],
    example:
      'A CSV upload writes monthly rows like [{ "month": "Jan", "sales": 120, "refunds": 8 }, …] to the slot "rows". Add a Chart node, Field label "Monthly sales", Chart type "bar", State binding "rows", and leave X/Value blank. It auto-picks "month" as the category axis and plots "sales" and "refunds" as grouped bars. Switch Chart type to "line" for a trend, or "pie" (with a single value field "sales") for share-by-month.',
  },
  sprite: {
    summary:
      'The "Sprite" node (NODE_META label "Sprite", slug @sprite, group "Inputs") is a read-only sprite animation viewer bound to one state slot. The bound value is either a single sprite-sheet image (a URL or data: URL, sliced into a grid of frameWidth × frameHeight cells, left-to-right then top-to-bottom) or an array of frame images (each element a URL / data: URL / { src }). It plays the frames as a flip-book at node.fps. It never writes to state.',
    whenToUse:
      "Reach for it to preview an animated character or icon — e.g. a sprite sheet uploaded via an Image/File node, pasted as a data URL, or produced by a code/HTTP node. Use the per-track bindings to wire separate sheets for idle, intro, walk-left, walk-right, and a click reaction.",
    config: [
      {
        name: "Field label",
        description:
          'Text input (i18n field.fieldLabel). The bold title shown above the viewer. Default "Sprite".',
      },
      {
        name: "Description",
        description:
          'Text input (i18n field.description). Optional helper text under the label; hidden when empty. Default "".',
      },
      {
        name: "Frame width (px)",
        description:
          "Number input bound to node.frameWidth, clamped to 16–512 on blur. The width of one frame/cell and of the viewer box; a single sheet is sliced into columns of this width. Default 96.",
      },
      {
        name: "Frame height (px)",
        description:
          "Number input bound to node.frameHeight, clamped to 16–512 on blur. The height of one frame/cell and of the viewer box; a single sheet is sliced into rows of this height. Default 96.",
      },
      {
        name: "Speed (fps)",
        description:
          "Number input bound to node.fps, clamped to 1–60 on blur. Playback speed in frames per second. Default 12.",
      },
      {
        name: "State binding",
        description:
          'State picker (BindingControl) bound to node.binding — the default frames/sheet source. Per-track bindings fall back to this. Default { mode: "name", value: "state1" }.',
      },
      {
        name: "Animations (per track)",
        description:
          'Fixed list of five tracks in node.animations — idle, intro, left, right, click — each rendered as a control button. Per track: a Loop checkbox (node.animations[].loop) and a state Select for its own sheet (node.animations[].binding; "Default frames" = empty, reuse node.binding). idle and left/right default to looping; intro and click play once and settle back to idle.',
      },
    ],
    io: {
      reads:
        'Each track reads its own binding slot (or node.binding when blank), resolved via resolveBinding. A single image value is treated as a sprite sheet and sliced by frame size (natural size read on load); an array (or JSON string of one) is treated as discrete frames. In the runtime the only sprite handling is in nodeSubtitle, where the default binding name shows under the "Using State" label.',
      writes: null,
    },
    tips: [
      "Pure renderer: the sprite never writes to state — bind it to a slot another node produces (Image upload, data URL, code/HTTP result).",
      "Sheet slicing assumes uniform cells laid out left-to-right, top-to-bottom: columns = round(sheetWidth / frameWidth), rows = round(sheetHeight / frameHeight). Set frame width/height to the exact cell size so frames align.",
      "Bind one value with multiple images (array) to play arbitrary frames instead of a grid sheet; each element is shown whole (object-contain).",
      "Turn Loop off for intro/click so they run a single cycle then hand back to the idle loop. The idle (or first) track auto-plays on load.",
    ],
    example:
      'An Image upload writes a 6-frame walk sheet (600×150) as a data URL to the slot "sheet". Add a Sprite node, Field label "Hero", Frame width 100, Frame height 150, Speed 12, State binding "sheet". The preview slices the strip into 6 frames and loops them as an idle walk; bind separate sheets to the left/right/click tracks to switch animations from the control bar.',
  },
  code_input: {
    summary:
      'The "Code editor" node (type "code_input") is a two-way-bound input that renders a Monaco code editor in the preview. The end user writes or pastes raw source, which is stored verbatim (as a string) in the bound state slot. The selected language only drives syntax highlighting; the source is never executed. Mental model: it is a syntax-highlighted textarea wired to one flat state key.',
    whenToUse:
      "Reach for it when a tool needs the user to author or paste a block of code/config (JS, SQL, JSON, YAML, etc.) into the shared state, so a later node (AI prompt, HTTP body, code/logic node, or output renderer) can consume that raw text. Prefer it over a plain textarea when syntax highlighting helps the author; use the JSON/CSV/table input nodes instead when you need parsed/validated structured data rather than raw source.",
    config: [
      {
        name: "Field label",
        description:
          'Text shown as the field\'s label in the preview. Free text. Config key: fieldLabel; default "Code".',
      },
      {
        name: "Description",
        description:
          'Optional helper text rendered below the label in the preview. Free text; placeholder reads "Optional helper text shown below the label". Config key: description; default empty string.',
      },
      {
        name: "Language",
        description:
          'Select dropdown choosing the Monaco syntax highlighting mode (placeholder "Pick language…"). Help text: "Drives syntax highlighting in the preview editor." Options (CODE_INPUT_LANGUAGES): JavaScript, TypeScript, HTML, CSS, JSON, YAML, SQL, Python, XML, Markdown, Shell, Plain text. Config key: language; default "javascript". Highlighting only; no parsing or execution.',
      },
      {
        name: "Editor height (px)",
        description:
          'Number input for the editor\'s initial height in the preview (EditorHeightField). Help text: "Initial field height in the preview (80–800px)." You can type freely while focused; on blur the value is clamped to the 80–800 range. Config key: editorHeight; default 220. Omitting it falls back to the 220px type default.',
      },
      {
        name: "State binding",
        description:
          'Select dropdown (BindingControl) choosing which state slot this node reads from and writes to. Help text: "Which state this node reads from / writes to." Lists every state name from the single state node; disabled with placeholder "— no state —" when no states exist, otherwise "Pick state…". Choosing a value sets binding to { mode: "name", value: <stateName> }. Config key: binding; default { mode: "name", value: "state1" }. (StateBinding also supports mode "index" in the data model, but this editor only writes mode "name".)',
      },
    ],
    io: {
      reads:
        "The bound state slot (binding) — the editor is two-way bound, so it initializes its contents from the current value of that state key (seeded from the state node's defaults via initialStateMap).",
      writes:
        "The same bound state slot (binding): the raw editor source is written back as a plain string. There is no transform/coercion and no separate output binding — read and write target the one bound key.",
    },
    tips: [
      "The source is never executed — this node only stores text. To actually run code, feed the bound state into a code/logic node or use it as a template for an AI/HTTP node.",
      "Language is cosmetic: switching it changes highlighting only and does not validate or parse the contents, so e.g. choosing JSON will not reject invalid JSON. If you need parsed/validated data downstream, pair it with a parsing node or use the dedicated JSON/CSV inputs.",
      "The bound value is always a string; downstream consumers must parse it themselves.",
      "Editor height accepts any number while typing but is clamped to 80–800px on blur; leaving it empty reverts to the 220px default.",
      'Binding is required to persist input: with no state node defined the State binding dropdown is disabled ("— no state —") and the node has nowhere to write.',
    ],
    example:
      'A SQL playground tool: add a state slot `query`, drop a Code editor node with Field label \\"SQL query\\", Language = SQL, Editor height = 300, and State binding = `query`. The user types `SELECT * FROM users WHERE active = 1;`; that raw string lands in state.query. A downstream HTTP Request node then sends it as the request body to a query endpoint and writes the response to a `results` slot rendered by a Table node.',
  },
  viewport: {
    summary:
      'The "View Port" node (type "viewport", slug @viewport) embeds an external website by URL inside a sandboxed iframe in the tool\'s preview pane. Mental model: a read-only website renderer — it shows a page, optionally letting a bound state slot drive which URL is loaded at runtime, but it never participates in the executable chain and never writes state.',
    whenToUse:
      "Reach for it when you want to embed/preview a live external web page inside a tool, optionally driven by a state slot (e.g. a text input or code node that produces a URL). It's the upstream source for Convert to HTML / Themed nodes that snapshot a viewport's page.",
    config: [
      {
        name: "Field label",
        description:
          'Free text. The heading shown above the embedded frame in the preview. Default "Website" (from createNode). Stored as node.fieldLabel.',
      },
      {
        name: "Description",
        description:
          'Free text, optional. Helper text rendered below the label in the preview; placeholder is "Optional helper text shown below the label". Stored as node.description (default empty).',
      },
      {
        name: "URL",
        description:
          'Free text, monospace input, placeholder "https://example.com". The page shown in the preview when no bound state value overrides it. Help text: "Page shown in the preview. A bare domain gets https:// prepended." Stored as node.url (default empty).',
      },
      {
        name: "Live preview",
        description:
          'Toggle (ToggleRow). "Render the frame in the preview. Off by default — saves loading the page until you turn it on." When off, the iframe and its network load are skipped. Stored as node.previewEnabled; createNode default is true (the type field is off-by-default for nodes saved without it). Reads node.previewEnabled ?? false.',
      },
      {
        name: "Default screen",
        description:
          'Select. The simulated screen the preview opens with; end users can still switch. Options from VIEWPORT_DEVICES, shown in order: "Fill" (responsive, no fixed size — fills pane width at editor height), "Desktop (1440×900)", "Mobile (390×844)". Fixed screens render at device width and scale to fit (width simulation only; the site still sees a desktop browser). Stored as node.device (default "responsive").',
      },
      {
        name: "Editor height (px)",
        description:
          'Number input, step 10. Initial frame height in the preview; applies to the "Fill"/responsive screen only. Clamped on blur to 80–800. Default 480. Stored as node.editorHeight; falls back to the viewport type default (480) when omitted.',
      },
      {
        name: "URL state (optional)",
        description:
          'Select of state slot names plus "— none —". Binds a state slot whose non-empty string value overrides the URL field at runtime. Help: "When the bound state holds a non-empty string it overrides the URL above — bind a text input or write it from a code node." Stored as node.binding (mode "name"); default value is "" (unbound).',
      },
    ],
    io: {
      reads:
        'node.binding (the "URL state" slot, mode "name"). At runtime, if the bound slot holds a non-empty string it overrides the URL field and becomes the page loaded in the iframe. If the binding is empty/unbound or the value is empty, the static node.url is used instead. A bare domain has https:// prepended.',
      writes: null,
    },
    tips: [
      "Not part of the run chain: viewport is neither a code/ai/http/encode node nor a sync transform, so runChain skips it entirely. It is a pure renderer — it only reads its bound slot to decide which URL to show and writes nothing back to state.",
      "Live preview is off-by-default for older/saved nodes (previewEnabled ?? false), even though createNode seeds new nodes with previewEnabled: true. Until the toggle is on, the iframe and its network fetch are skipped, so the page won't load.",
      'Bound state only overrides the URL when it is a non-empty string. An empty bound value falls through to the static URL field; if both are empty the node badge shows "—".',
      'Editor height (80–800px, clamped on blur) only affects the "Fill"/responsive screen. Desktop (1440×900) and Mobile (390×844) render at fixed device width and scale to fit — width simulation only; the remote site still sees a desktop user agent.',
      "Sites that forbid embedding via X-Frame-Options / frame-ancestors render blank. That is the remote site's policy, not a tool error.",
    ],
    example:
      'Add a Text input bound to a state slot named "targetUrl", then add a View Port node. Leave URL blank, set Default screen to Mobile, and bind URL state → targetUrl. When the end user types https://example.com into the text input, the iframe re-renders that page at 390×844 scaled to fit. With targetUrl empty, the node falls back to whatever static URL you typed in the URL field.',
  },
  convert_html: {
    summary:
      'Convert to HTML (`convert_html`, slug `@convert_html`, group "Website Site") snapshots a View Port node\'s loaded page into a static HTML document — its linked CSS inlined and all scripts stripped — server-side via `/api/site-proxy`, writes that HTML string into a bound state slot, and renders the snapshot in a sandboxed iframe with a "Copy HTML" button. Mental model: it freezes another node\'s live web page into a portable, scriptless HTML blob that downstream nodes (e.g. Themed) can consume.',
    whenToUse:
      "Use it after a View Port node when you need the page's static markup as data — to feed a Themed node for recoloring, hand to code/HTML-Sanitize nodes, or offer end users a copy-to-clipboard of the rendered layout. It does not load its own URL; it always copies an existing View Port's page.",
    config: [
      {
        name: "Field label",
        description:
          'Heading shown above the node in the preview (i18n `field.fieldLabel`). Free text. Maps to `fieldLabel`; default "Convert to HTML". Empty hides the label.',
      },
      {
        name: "Description",
        description:
          'Optional helper text rendered under the label in the preview (i18n `field.description`, placeholder "Optional helper text shown below the label"). Maps to `description`; default empty.',
      },
      {
        name: "Source View Port",
        description:
          'Select (i18n `convert.source`) choosing which View Port node\'s page is copied. Options: "Auto — first View Port" (stored as `source: ""`, picks the first viewport node in chain order) plus one entry per existing View Port node, labelled `#<n> <its field label> · <its url>`. Maps to `source` (the chosen viewport node id). If no View Port nodes exist, the help text says to add one. The node tracks that View Port\'s URL including its state-driven URL override.',
      },
      {
        name: "Output state (HTML)",
        description:
          'StateSelect (i18n `convert.output`) binding the state slot the snapshot HTML is written into. Always saved as `binding: { mode: "name", value: <stateName> }`; default value empty (unbound). When empty, the snapshot still renders in the preview but nothing is written to state.',
      },
      {
        name: "Live preview",
        description:
          'Toggle (i18n `web.livePreview`, shared `PreviewToggleField`). Maps to `previewEnabled`; createNode default true. When off, the server-side snapshot fetch is skipped (no HTML is produced or written) and a "preview off / enable" notice is shown instead.',
      },
      {
        name: "Default screen",
        description:
          'Select (i18n `web.defaultScreen`, shared `DeviceSelectField`) for the simulated screen the snapshot frame opens with. Options from VIEWPORT_DEVICES: "Fill" (`responsive`), "Desktop (1440×900)", "Mobile (390×844)". Maps to `device`; default `responsive`. End users can still switch screens in the preview; fixed screens simulate width only.',
      },
      {
        name: "Editor height (px)",
        description:
          "Number input (i18n `field.editorHeight`, shared `EditorHeightField`) for the preview frame height in px; only applies to the `responsive`/Fill screen. Maps to `editorHeight`; min 80, max 800, step 10, clamped on blur. Default `EDITOR_HEIGHTS.defaults.convert_html` = 480.",
      },
    ],
    io: {
      reads:
        "Does not read the shared state store directly. It resolves its `source` to a View Port node and derives that View Port's effective URL — which itself may come from the View Port's own state-bound URL override — then fetches that URL via `/api/site-proxy`. So state is read only transitively through the chosen View Port.",
      writes:
        'Writes the static snapshot HTML string (CSS inlined, scripts removed) into the state slot named by `binding`. The write happens in the preview layer (PreviewPane `onHtml` -> `setRuntime`), not in `runChain`/`runSyncTransform`. It only writes when `previewEnabled` is true, a source View Port with a resolved URL exists, the fetch succeeds, and `binding.value` is non-empty; otherwise it writes an empty string ("") on reset/empty/failure, or nothing if unbound.',
    },
    tips: [
      "It never loads its own URL — it copies the page from a View Port node. With no View Port present (or the chosen one has no URL), it renders an empty-state notice and writes nothing useful.",
      "Output is a static, scriptless snapshot: all <script> tags are removed and linked CSS is inlined, so JS-rendered/interactive parts of the source page will not appear. This is by design, not a bug.",
      "The snapshot runs server-side through `/api/site-proxy`; sites that block embedding or proxying surface a fetch error in the frame. The data write only fires from the preview, and only while Live preview is on — turning it off skips the fetch and stops updating the bound state.",
      "Editor height and the Default screen affect only the preview frame, not the captured HTML. The HTML written to state is the same regardless of the simulated screen.",
      "If Output state (HTML) is left unbound, the preview frame and Copy HTML button still work, but downstream nodes get nothing — bind a state slot to pass the markup along (e.g. to a Themed node).",
    ],
    example:
      'Chain: View Port (url `https://example.com`) -> Convert to HTML (Source: \\"Auto — first View Port\\", Output state: `pageHtml`, Live preview on). On preview, the node fetches example.com through the site proxy, inlines its CSS, strips scripts, renders the snapshot at the Fill/480px frame, and writes the resulting HTML into `pageHtml`. A downstream Themed node bound to `pageHtml` then lets users click-recolor the captured layout.',
  },
  themed: {
    summary:
      'Themed is a website/output node (group \\"Website Site\\", slug @themed) that reads a static HTML document (CSS inlined) from a bound state slot and renders it in a sandboxed preview frame where clicking any element recolors that element and every identical element (same tag + classes) live. Mental model: a read-only, interactive theming surface layered on top of a captured page — think of it as the visual recolor end of a View Port → Convert to HTML → Themed pipeline."}',
    whenToUse:
      "Reach for Themed when you want to let users interactively recolor a captured static web page — clicking an element retints all matching elements at once — as the visual output stage after capturing a page with View Port and Convert to HTML.",
    config: [
      {
        name: "Field label",
        description:
          'Text input (i18n field.fieldLabel). Sets node.fieldLabel — the display name shown for this Themed website block in the rendered tool. Default "Themed website". Free text.',
      },
      {
        name: "Description",
        description:
          'Text input (i18n field.description). Sets node.description — optional helper text shown below the label (placeholder "Optional helper text shown below the label"). Default empty string. Free text.',
      },
      {
        name: "HTML state",
        description:
          'State slot picker (i18n themed.htmlState, StateSelect dropdown). Sets node.binding to { mode: "name", value: <state name> } — the state slot holding the static page HTML (CSS inlined) to recolor. Help text: bind a Convert to HTML node\'s output here; no View Port connection. Options are the names declared on the State node; disabled (shows "— no state —") when no states exist. Default value "" (unbound).',
      },
      {
        name: "Live preview",
        description:
          "Toggle (i18n web.livePreview, ToggleRow). Sets node.previewEnabled. When on, the recolor iframe renders in the preview; off by default to avoid loading the page until enabled. createNode default is true; an omitted/undefined value is treated as false (off).",
      },
      {
        name: "Default screen",
        description:
          'Select (i18n web.defaultScreen). Sets node.device to the simulated screen the preview opens with. Options from VIEWPORT_DEVICES: "Fill" (responsive), "Desktop (1440×900)", "Mobile (390×844)". End users can still switch screens in the preview. Fixed screens render at device width and scale to fit. Default "responsive".',
      },
      {
        name: "Editor height (px)",
        description:
          "Number input (i18n field.editorHeight). Sets node.editorHeight — initial frame height in the preview, applied on the responsive/Fill screen. Min 80, max 800, step 10; clamped to that range on blur. Default 480 (EDITOR_HEIGHTS.defaults.themed).",
      },
    ],
    io: {
      reads:
        'node.binding (mode "name") — the bound state slot holding the static HTML document (CSS inlined), typically a Convert to HTML node\'s output. Read client-side to populate the sandboxed recolor frame.',
      writes: null,
    },
    tips: [
      'It does NOT write to state. The runtime has no execution branch for "themed" (only a node-summary label "Recolors"); recolor clicks live entirely inside the preview frame and are not persisted back to any state slot or to the source HTML.',
      "Bind HTML state to a Convert to HTML node's output (static page HTML with CSS inlined), not to a live View Port — Themed does not connect to a View Port and expects a self-contained HTML document.",
      "Scripts are stripped from the rendered frame, so JS-driven behavior in the captured page will not run in the Themed preview.",
      "Live preview is off unless enabled. createNode seeds previewEnabled=true, but an omitted/undefined value renders as off — the recolor iframe is skipped until the toggle is on.",
      'binding is always stored as { mode: "name", value } via the state picker; there is no manual/literal binding mode here, and an empty value means unbound (preview has nothing to render).',
      "Editor height only governs the responsive/Fill screen; Desktop and Mobile render at fixed device dimensions and scale to fit. Values outside 80–800px are clamped on blur.",
    ],
    example:
      "A tool chain: State node declares a `pageHtml` slot → a View Port node loads a site → a Convert to HTML node copies that page's static layout (CSS inlined) into `pageHtml` → a Themed node binds HTML state = `pageHtml`, Default screen = Desktop, Live preview = on. In the preview the author clicks the site's primary button; that button and every other element with the same tag and classes recolor together, live, without touching state.",
  },
  html_sanitize: {
    summary:
      "HTML Sanitize is a logic/transform node that reads raw HTML from one state slot, cleans it with the `sanitize-html` library against a layout-preserving allowlist, and writes the cleaned HTML back into another state slot. Mental model: a safety filter that sits between a Convert to HTML / site-proxy source and a Themed/website renderer — it always strips scripts, event handlers, unsafe URL schemes, and embedding tags (iframe/object/embed) while keeping structural, text, table, media, SVG, and form-display markup so the page still renders.",
    whenToUse:
      "Reach for this when a state slot holds untrusted or scraped HTML (e.g. the output of a Convert to HTML node or the site proxy) that you intend to render in a Themed or website node, and you need to guarantee scripts/unsafe markup are removed before display.",
    config: [
      {
        name: "Description",
        description:
          'Free-text label for the node (field.description). Placeholder: "What this sanitizer is for". Cosmetic only — shows on the node card; not used at runtime.',
      },
      {
        name: "Input state (HTML)",
        description:
          'Dropdown (StateSelect) that picks the state slot holding the raw HTML to clean. Stored as a name-mode StateBinding ({mode:"name", value:<stateName>}); there is no literal/typed-value mode. Help text: "State slot holding the raw HTML — bind a Convert to HTML node\'s output here."',
      },
      {
        name: "Output state (clean HTML)",
        description:
          'Dropdown (StateSelect) that picks the state slot the sanitized HTML is written into. Also a name-mode StateBinding. Help text: "Sanitized HTML writes here. Updates live as the input changes — bind a Themed node to recolor the cleaned page."',
      },
      {
        name: "Keep styles",
        description:
          'Toggle (allowStyles, defaults to true). When on, preserves <style> blocks, inline style attributes, and class/id attributes (keeps theming intact). GOTCHA: this toggle is tool-wide — flipping it calls syncAllSanitizers and applies the same value to EVERY html_sanitize node in the tool. Description text: "Preserve <style> blocks, inline style, and class/id (keeps theming intact). Synced across all HTML Sanitize nodes."',
      },
      {
        name: "Keep images",
        description:
          'Toggle (allowImages, defaults to true). When on, preserves <img>/<picture> and their src, including data: image URIs. Also tool-wide / synced across all html_sanitize nodes via syncAllSanitizers. Description text: "Preserve <img>/<picture> and their src, including data: image URIs. Synced across all HTML Sanitize nodes."',
      },
    ],
    io: {
      reads:
        'Reads the state slot named by the Input (HTML) binding. The raw value is coerced to a string: a string is used as-is, null/undefined become "", any other type is String()-ified before sanitizing.',
      writes:
        "Writes the sanitized HTML string into the state slot named by the Output (clean HTML) binding (state[outName] = sanitizeHtmlDoc(source, allowStyles, allowImages)).",
    },
    tips: [
      "The two toggles are NOT per-node: changing Keep styles or Keep images rewrites that flag on every HTML Sanitize node in the whole tool. You cannot have one sanitizer keep styles while another strips them.",
      "If either Input or Output is left unbound (empty value), the node is a no-op — runHtmlSanitizeNode returns early and writes nothing, so the output slot keeps its previous value.",
      "Always-stripped regardless of toggles: <script>, event-handler attributes (onclick etc.), unsafe URL schemes (e.g. javascript:), and embedding tags <iframe>/<object>/<embed>. Don't rely on this node to pass through embeds.",
      "Sanitization runs entirely client-side (no network) and runs both during the normal chain pass AND live as the input state changes — so binding the output to a Themed node re-cleans automatically when upstream HTML updates.",
      "The allowlist is layout-preserving (structural, text, table, media containers, SVG, and display-only form tags are kept), but <base> is intentionally allowed so site-proxy-injected <base href> keeps relative image/asset URLs resolving.",
    ],
    example:
      "A Convert to HTML node writes scraped page markup into state slot `rawPage`. An HTML Sanitize node sets Input state (HTML) = `rawPage`, Output state (clean HTML) = `safePage`, with Keep styles and Keep images both ON. A downstream Themed node binds to `safePage`, so it renders the cleaned, script-free page while the original styling and images survive.",
  },
  code: {
    summary:
      'The "Code" node (NODE_META label "Code", slug @code, blurb "A code block for custom logic / processing.") is a logic node that runs author-written JavaScript against the tool\'s flat key/value state store. Its body defines up to three functions — run(state, ai), change(state, ai), reset(state, ai) — each receiving a state shim (get/set/copyToClipboard) and an ai helper. Mental model: it is the escape hatch for arbitrary transforms; instead of a fixed input/output binding it reads and writes any state slot you name via state.get/state.set.',
    whenToUse:
      "Reach for it when no purpose-built logic node (Filter, Map, Template, Regex, Math, etc.) covers the transform you need, or when you must coordinate several state slots with conditional/imperative logic, copy text to the clipboard, or call an AI helper directly from code.",
    config: [
      {
        name: "Description",
        description:
          'Free-text single-line input (i18n key field.description, placeholder "What this code block does"). Author-only note describing the block; not used at runtime. Stored in node.description. Any string; defaults to empty.',
      },
      {
        name: "Code",
        description:
          'Monaco code editor (i18n key code.code, label "Code", language fixed to javascript, height 320px or full-height in panel mode). Holds the JavaScript body in node.code. The body may define `async function run(state, ai)`, `async function change(state, ai)`, and/or `async function reset(state, ai)`; any subset is allowed. Default value (DEFAULT_CODE) ships a run/change/reset skeleton operating on "email"/"message" slots. Help text below (code.code.help): "Runs top-to-bottom in the chain; reads & writes state directly."',
      },
      {
        name: "Ask AI (inside the Code editor)",
        description:
          'An Ask AI panel built into the CodeEditor (Sparkles button + prompt box with a Send action). It includes a provider selector with values "gemini" and "openrouter" (AiProvider) and a model selector; the chosen values persist to node.aiProvider and node.aiModel. This is an authoring aid that drafts/edits code via the LLM and does not affect node execution at runtime.',
      },
    ],
    io: {
      reads:
        'Author-defined. There is no fixed input binding. The body reads any state slot via `state.get("slotName")`; whatever keys the code references are what it reads.',
      writes:
        "Author-defined. There is no fixed output binding. The body writes any state slot via `state.set(\"slotName\", value)`; writes go straight into the chain's working state map. `state.copyToClipboard(text)` additionally copies a string to the user's clipboard (browser-only, best-effort, returns a Promise<boolean>).",
    },
    tips: [
      'Three lifecycle hooks fire from different chain passes: `run` executes in runChain (on a trigger/button run), `change` executes in changeChain (live, as bound inputs change), and `reset` executes in resetChain (when a reset button fires). Define only the ones you need; each is invoked only `if typeof === "function"`.',
      "Field/Button nodes can target a subset of code nodes by id (targetIds); an empty target list runs/resets the whole chain. A code node only runs when it is in scope for that trigger.",
      "Errors are swallowed to keep the preview alive — `run`/`reset` failures are logged to console.error and surfaced via onError, while `change` failures are only console.warn. A broken node fails silently in the UI, so check the console.",
      "state.set values are not auto-stringified by the code path: objects/arrays you store stay structured (downstream Table/Filter/etc. can read them), but bound text inputs only render strings, and some consumers (e.g. ts_type) re-serialize non-strings. The state node re-serializes parsed objects when persisting.",
      "The editor language is locked to JavaScript and bodies are wrapped in an AsyncFunction, so top-level `await` works inside your functions but you cannot use ES module import/export.",
      "The second `ai` argument exposes `ai.gemini(...)` and `ai.openrouter(...)` helpers (from aiHelpers) for calling models directly from code — separate from the authoring-only Ask AI panel.",
    ],
    example:
      'A newsletter signup tool with an "email" text input and a "message" log slot. The Code node body:\n\nasync function run(state) {\n  const email = state.get("email");\n  if (!email) return;\n  const log = state.get("message") || "";\n  state.set("message", log + "Subscribed: " + email + "\\n");\n}\nasync function reset(state) {\n  state.set("email", "");\n  state.set("message", "");\n}\n\nWhen the submit button runs the chain, run() appends the email to the message log; the reset button clears both slots.',
  },
  ts_type: {
    summary:
      'The TS Type Converter node ("TS Type Converter", slug @ts_type, group Logic) reads JSON from a state slot and generates matching TypeScript interfaces/types into another slot. It is a synchronous transform node — it runs in the live preview pass, no trigger or API call needed.',
    whenToUse:
      "Use it when you have a JSON payload (e.g. an HTTP Request response, a pasted sample, or a Code node's output) and want ready-to-paste TypeScript types describing its shape.",
    config: [
      {
        name: "Description",
        description:
          'Optional free-text note about what this converter is for (placeholder "What this converter is for"). Stored on node.description; does not affect output.',
      },
      {
        name: "Root type name",
        description:
          'The name of the generated top-level interface/type (node.rootName, default "Root", rendered monospace). Falls back to "Root" when blank.',
      },
      {
        name: "Input state (JSON source)",
        description:
          "State slot to read the JSON source from (name-mode binding). A Code node may have stored a parsed object here — it is re-serialized before conversion.",
      },
      {
        name: "Output state (TypeScript)",
        description:
          "State slot the generated TypeScript declarations are written to (name-mode binding).",
      },
    ],
    io: {
      reads:
        "The input state slot — a JSON source string. If the slot holds a parsed object/array (e.g. set by a Code node) it is re-serialized via JSON.stringify before parsing.",
      writes:
        "The output state slot — the generated TypeScript declarations. Writes an empty string when the source is blank; both bindings must resolve or the node no-ops.",
    },
    tips: [
      "Invalid JSON makes the underlying jsonToTs throw; the chain catches it and logs a runtime error rather than writing partial output.",
      "Root type name only sets the top-level type's name; nested object shapes get their own generated interfaces.",
      "Pair it with HTTP Request: bind this node's input to the request's output slot to type an API response.",
      "Both input and output use name-mode bindings by default — renaming a state slot in State Control does NOT rewrite them, so re-point manually.",
    ],
    example:
      "An HTTP Request writes its JSON body to state `apiData`. A TS Type Converter reads `apiData`, root name `User`, and writes to `userTypes` — yielding `interface User { id: number; name: string; ... }` for display in a Code editor output.",
  },
  http_request: {
    summary:
      'The HTTP Request node (type "http_request", label "HTTP Request", slug @http_request, group Logic) calls a real external API through a server-side, SSRF-guarded proxy (/api/http-proxy) and writes the parsed response into a bound state slot. Mental model: a transform node that runs in chain order when the tool runs — its inputs come from {{stateName}} tokens interpolated into the URL, header values, and body, and its single output is the response value.',
    whenToUse:
      "Reach for it when a tool needs live data from (or needs to push data to) an external HTTP(S) API mid-chain — e.g. fetching a record by an id the user typed, then feeding the JSON into Filter/Map/Table nodes downstream. Use it instead of a Code node when you just need a plain authenticated request without custom logic.",
    config: [
      {
        name: "Description",
        description:
          'Optional free-text helper note for the node (placeholder: "Optional helper text shown below the label"). Stored in config.description; does not affect execution.',
      },
      {
        name: "Method",
        description:
          "Select of the HTTP verb. Options in menu order: GET, POST, PUT, PATCH, DELETE. Default GET. GET and DELETE are treated as bodyless (the Body field is hidden and no body is sent).",
      },
      {
        name: "URL",
        description:
          'Mono text input for the request URL (placeholder https://api.example.com/{{id}}, default https://api.example.com/data). Supports {{stateName}} interpolation. Help text: "Supports {{state}} interpolation. Requested through a server proxy (public http(s) only)."',
      },
      {
        name: "Headers",
        description:
          'Repeatable list of key/value rows (each input is mono; placeholders "Header" and "Value"). "Add header" appends a blank row; the trash button removes a row (aria-label "Remove header"). Default is an empty list. Header values support {{stateName}} interpolation; rows with a blank/whitespace-only key are dropped at runtime. The proxy strips host, content-length, and connection headers.',
      },
      {
        name: "Input state",
        description:
          'Optional StateSelect (with a "— none —" clear option) binding config.input to a state slot. When bound, that slot\'s value is exposed as the `{{input}}` token and can be referenced in the URL, header values, and body alongside any other `{{stateName}}`. Always rendered (URL/headers exist for every method). Default binding { mode: "name", value: "" } (unbound). Help text: "Optional: bind a state slot to reference as {{input}} in the URL, headers, or body."',
      },
      {
        name: "Body",
        description:
          'Multi-line mono textarea for the request body (default empty string). Only rendered for POST/PUT/PATCH (hidden for GET and DELETE). Supports {{stateName}} interpolation, including the {{input}} token when Input state is bound. Help text: "Sent for POST / PUT / PATCH. Supports {{state}} interpolation."',
      },
      {
        name: "Response",
        description:
          'Select for how the response is parsed before writing. Options in menu order: JSON (value "json", default) and Text (value "text"). JSON runs JSON.parse on the body and falls back to the raw text if parsing fails; Text writes the raw response string.',
      },
      {
        name: "Output state",
        description:
          'State picker (StateSelect) choosing which state slot the parsed response is written into. Default binding { mode: "name", value: "state1" }; the editor always writes mode "name". Help text: "The parsed response is written here. JSON responses land as a parsed value."',
      },
    ],
    io: {
      reads:
        "Pulls from state via interpolation: every {{stateName}} token in the URL, each header value, and the body is replaced via interpolate() against the shared state (token regex {{ name }}, name chars [\\w$]; a null/undefined or missing state value resolves to an empty string, anything else is String()-coerced). The optional `input` binding adds one extra token: when bound, the resolved slot's value is available as {{input}} in all three places (it shadows any real state slot literally named `input`).",
      writes:
        'The parsed response body into the slot named by the output binding (resolved by name, or by positional index if mode is "index"). null/undefined response normalizes to an empty string; arrays/objects are written structured (so JSON responses stay as parsed objects/arrays for downstream Filter/Map/Table nodes). If the output binding resolves to an empty name, the node returns and writes nothing.',
    },
    tips: [
      'Runs only when the chain runs, never live as you type (unlike input nodes that re-run on change). Footer note: "Runs only when the chain runs — never live as you type. Auth headers stay server-side."',
      "All real calls go through the same-origin /api/http-proxy relay, not the browser directly — this dodges CORS and keeps auth headers off the network tab. Only public http(s) URLs pass the SSRF guard (validateTarget); localhost/private/internal hosts and a redirect that lands on a blocked host are rejected with a 400.",
      "Interpolation only fires inside {{ }} tokens and only matches word/$-characters, so dotted/bracket paths like {{user.name}} won't resolve — pre-flatten the value into its own state slot first. A missing or null state value becomes an empty string, not the literal token.",
      "Body is dropped entirely for GET and DELETE (both editor-hidden and proxy-side), so switching method to GET silently discards a body you authored.",
      "Response parsing is lenient: with Response = JSON, an upstream that returns non-JSON text falls back to the raw string rather than erroring. The proxy caps the body at 8 MB and times out per the shared FETCH_TIMEOUT_MS.",
      "Errors (network failure, SSRF block, too-large body, bad method) are caught by the chain runner, logged, and surfaced via onError — they do not write to the output slot, so the prior value remains.",
    ],
    example:
      "A tool has a Text Input bound to state `userId` and an HTTP Request node configured: Method GET, URL `https://api.github.com/users/{{userId}}`, one header `Accept: application/vnd.github+json`, Response = JSON, Output state = `profile`. When the chain runs, {{userId}} is interpolated from state, the proxy fetches the user, and the parsed JSON object lands in `profile` — a downstream JSONPath or Template node can then read `profile.name`.",
  },
  filter: {
    summary:
      "The Filter node is a Logic-group transform that keeps only the rows of an input array whose chosen field satisfies a comparison, writing the surviving rows as a new array to an output state slot. Mental model: a row-keep gate — read array from one state key, test each row against operator+value, write the filtered array to another state key.",
    whenToUse:
      "Reach for Filter when an upstream node has produced an array in state and you want to narrow it to rows matching one condition (e.g. only active users, only items over a price). For multi-condition logic or reshaping rows use a Code or Map node instead.",
    config: [
      {
        name: "Description",
        description:
          'Optional free-text helper note for the node (placeholder: "Optional helper text shown below the label"). Stored in `description`; does not affect execution.',
      },
      {
        name: "Input state",
        description:
          'State-slot picker (StateSelect) choosing the state key to read the source array from. Bound as `input` with mode "name". The editor always writes by name, never by index.',
      },
      {
        name: "Output state",
        description:
          'State-slot picker choosing the state key the filtered array is written to. Bound as `output` with mode "name". Can be the same slot as Input (in-place) or a different slot.',
      },
      {
        name: "Field path",
        description:
          "Text input (`field`, monospace) — dotted/bracketed path read on each row, e.g. `status`, `user.name`, `items[0].name`. Keys with spaces work as-is (e.g. `Happy Birthday`). Start with `$` for full JSONPath (e.g. `$.items[*].price`, `$['Happy Birthday']`). Leave blank to test the row value itself (use for arrays of primitives). Placeholder: `status`.",
      },
      {
        name: "Operator",
        description:
          "Select (`operator`, default `eq`). Options in menu order: equals (eq), not equals (neq), greater than (gt), greater or equal (gte), less than (lt), less or equal (lte), contains, starts with (startsWith), ends with (endsWith), exists, does not exist (notExists). eq/neq compare as strings; gt/gte/lt/lte coerce both sides to numbers; contains/startsWith/endsWith are string operations; exists/notExists test presence only.",
      },
      {
        name: "Value",
        description:
          "Text input (`value`) — the comparison string the field is tested against. This field is HIDDEN in the editor when the operator is `exists` or `does not exist` (VALUELESS_FILTER_OPERATORS), since those ignore the value.",
      },
    ],
    io: {
      reads:
        "Reads the state slot named by `input`. The value is coerced via asArray: a real array passes through, a JSON-string of an array is parsed, anything else (object, number, non-array JSON, empty) becomes [].",
      writes:
        "Writes the filtered array (an actual array value) to the state slot named by `output`. If either input or output resolves to an empty name, the node does nothing (no write). When the source coerces to [], it writes an empty array.",
    },
    tips: [
      "Input must resolve to an array (or a JSON string of one). Objects or scalars in the input slot are treated as [] and produce an empty output — there is no error.",
      'Comparisons are string-based unless you pick a numeric operator (gt/gte/lt/lte), which Number()-coerces both sides. eq/neq do NOT coerce: numeric field 10 vs value "10" matches via String(), but value "10.0" would not equal "10".',
      'exists/notExists treat undefined, null, AND empty string "" as absent — an empty-string field counts as not existing. The Value box disappears for these operators.',
      "Leave Field path blank to filter an array of primitives against the row itself (e.g. filter a string array with `contains`).",
      "A `$`-prefixed Field path runs full JSONPath per row; if it matches 2+ nodes it returns an array (compared via String()), 0 matches returns undefined. Plain dotted paths resolve missing segments to undefined.",
      "Output writes a structured array (not a JSON string), so downstream Table/Filter/Map nodes can consume it directly. Setting Output to the same slot as Input filters in place.",
    ],
    example:
      'Input state `users` holds [{name:"Ada",active:true},{name:"Lin",active:false}]. Set Field path = `active`, Operator = equals, Value = `true`, Output state = `activeUsers`. The node writes [{name:"Ada",active:true}] to `activeUsers` (boolean true is stringified to "true" and matches).',
  },
  map: {
    summary:
      'The Map node (type "map", label "Map / Transform", slug @map, Logic group) reshapes an array. For each row of the input array it builds a brand-new object, copying the value at each mapping row\'s source path into the named output key, then writes the resulting array to the output slot. Mental model: a column projector/renamer you place before a Table or Sort.',
    whenToUse:
      "Reach for it when an upstream array (e.g. an HTTP/JSON response) has nested or badly named fields and a downstream consumer (Table, Sort, Merge, output) needs a flat, predictably keyed shape. Use it to project, rename, or flatten columns without writing code.",
    config: [
      {
        name: "Description",
        description:
          "Optional free-text helper note for the node (label i18n: field.description, placeholder 'Optional helper text shown below the label'). Stored on node.description; does not affect runtime.",
      },
      {
        name: "Input state",
        description:
          "State-slot picker (StateSelect). Selecting a slot sets node.input = { mode: \"name\", value }. This is the array the node reads. The editor always writes binding mode 'name'.",
      },
      {
        name: "Output state",
        description:
          'State-slot picker (StateSelect). Sets node.output = { mode: "name", value }. The mapped array is written here. May be the same slot as Input (in-place reshape).',
      },
      {
        name: "Field mapping",
        description:
          "Repeatable list of mapping rows (label 'Field mapping'). Each row = one entry in node.fields. Rows render in array order and produce keys in that order.",
      },
      {
        name: "Output key (per row, the left input labelled '←' target)",
        description:
          "Text input (placeholder 'Output key'), bound to field.to. The key name written on each output object. Rows whose 'to' is blank/whitespace are skipped entirely at runtime.",
      },
      {
        name: "Source path (per row, the right input)",
        description:
          "Text input (placeholder 'Source path'), bound to field.from. Path read from each input row via getPath: blank = the whole row; dotted/bracketed path like a.b[0].c; or a JSONPath starting with '$'. Missing paths resolve to undefined.",
      },
      {
        name: "Remove field button",
        description:
          "Trash icon (aria-label 'Remove field') that deletes that mapping row from node.fields.",
      },
      {
        name: "Add field button",
        description:
          'Button \'Add field\' that appends a new empty row { to: "", from: "" } to node.fields.',
      },
      {
        name: "Help text",
        description:
          "Static caption: 'Builds a new object per row: each output key copies the value at its source path.' No control, informational only.",
      },
    ],
    io: {
      reads:
        "Reads the array at the state slot named by node.input (resolveBinding, mode 'name'); coerced through asArray (array, or JSON-string-of-array, else []).",
      writes:
        "Writes the mapped array (one new object per input row) to the state slot named by node.output. No-op (no write) if input or output binding is unresolved.",
    },
    tips: [
      "Both Input state and Output state pickers force binding mode 'name' (StateSelect). There is no positional/index binding from this editor even though StateBinding supports one. If either binding resolves to empty (no slot selected / unknown name), runMapNode is a no-op and the output slot is left untouched.",
      "Input is coerced via asArray: a real JS array passes through; a string that JSON-parses to an array is used; anything else (object, plain string, number) becomes [] so the output is an empty array. It never wraps a single object into a one-element array.",
      "Per row, an empty Source path copies the WHOLE row into that output key (getPath returns the value itself). An empty/whitespace Output key makes the row contribute nothing (it is skipped), so blank rows are silently ignored.",
      "Source path supports three forms via getPath: blank or '$' = whole row; dotted/bracketed like a.b[0].c (segments may contain spaces); or full JSONPath when it starts with '$' (wildcards, filters, '$..recursive', bracket-quoted keys). A JSONPath matching 0 results yields undefined; >=2 results yields an array. Missing dotted segments yield undefined.",
      "Output values are stored structurally (objects/arrays kept as-is, undefined included) — they are NOT stringified, so the output slot holds real array-of-objects, ideal for Table/Sort but not directly editable in a text input.",
      "Mapping rows can be reordered/removed; output key order follows node.fields order. Duplicate Output keys overwrite each other (last row wins for that key).",
    ],
    example:
      'A previous HTTP node wrote a raw array to state slot `users`:\n[{ "id": 1, "profile": { "name": "Ada" }, "email": "ada@x.io" }, ...]\nConfigure a Map node: Input state = users, Output state = tableRows, with field mapping rows:\n  Output key `name`  ← Source path `profile.name`\n  Output key `email` ← Source path `email`\n  Output key `id`    ← Source path `id`\nRuntime writes to `tableRows`:\n[{ "name": "Ada", "email": "ada@x.io", "id": 1 }, ...]\nNow a downstream Table node bound to `tableRows` renders clean, renamed columns.',
  },
  sort: {
    summary:
      'The Sort node (type "sort", slug @sort, Logic group) reads an array from one state slot, orders its rows by a field path compared as text, number, or date, ascending or descending, and writes the reordered array to a state slot. Mental model: a single-pass array reorderer in the top-to-bottom chain — same data, new order.',
    whenToUse:
      "Reach for Sort when a downstream node (a table, template, or output) needs an array ordered by one of its fields — e.g. ranking rows by a numeric column, alphabetizing by name, or putting records in chronological order. Place it after the node that produces the array and before whatever consumes the ordered result.",
    config: [
      {
        name: "Description",
        description:
          "Optional free-text note for the node. Documentation only; not used at runtime.",
      },
      {
        name: "Input state",
        description:
          "State-key dropdown (StateSelect) selecting the state slot to read the array from. Bound by name. The runtime coerces the value with asArray(): a real array passes through, a JSON-string of an array is parsed, anything else becomes []. Default: state1.",
      },
      {
        name: "Output state",
        description:
          "State-key dropdown selecting the state slot the sorted array is written to. Bound by name. Can be the same slot as Input (in-place), which is the default (state1).",
      },
      {
        name: "Field path",
        description:
          "Free-text input (monospace, placeholder \"name\"). Dotted/bracket path into each row used as the sort key, e.g. user.name or items[0].name. Keys with spaces work as-is (Happy Birthday). A path starting with $ is treated as full JSONPath (jsonpath-plus), e.g. $.items[*].price or $['Happy Birthday']. Leave blank to sort by the whole row itself. Maps to node.field.",
      },
      {
        name: "Direction",
        description:
          'Select with two options: "Ascending" (asc) and "Descending" (desc). desc negates the comparator result. Default: Ascending. Maps to node.direction.',
      },
      {
        name: "Compare as",
        description:
          'Select with three options: "Text" (string), "Number" (number), "Date" (date). Determines how the two key values are compared. Default: Text. Maps to node.sortType.',
      },
    ],
    io: {
      reads:
        "Reads the array from the Input state slot (node.input, bound by name; resolveBinding then asArray). Non-array/unparseable values are treated as an empty array.",
      writes:
        "Writes the sorted array to the Output state slot (node.output, bound by name). It writes a new array (a shallow copy of the input is sorted in place), so binding Input and Output to the same slot replaces it; if Input cannot be coerced to an array, an empty array is written.",
    },
    tips: [
      "Field path resolution has three modes: blank = sort by the whole row value itself; a normal dotted/bracket path (a.b[0].c, dot-segments may contain spaces); or a path starting with $ which switches to full JSONPath. A JSONPath that matches 2+ values returns an array as the key, which compareSort will stringify — usually not what you want for a sort key.",
      'Comparator coercion per Compare as: Number does Number(a)-Number(b) (non-numeric keys become NaN, producing unstable/0 comparisons); Date parses with new Date(String(key)).getTime() (an unparseable date is NaN); Text uses String(a ?? \'\').localeCompare(...). Pick the type that matches the underlying data, especially for numeric strings — comparing them as Text sorts lexically ("120" before "40").',
      "Input is coerced with asArray(): a real array or a JSON-string of an array works, but any non-array (object, number, plain string, null) silently becomes [] and an empty array is written to the output — there is no error.",
      "Output defaults to the same slot as Input (state1), sorting in place. Point Output at a different slot to keep the original order available downstream.",
      "Sorting is a single stable-ish pass using Array.prototype.sort with no tie-breaker, so equal keys keep their relative input order only as far as the engine's sort guarantees; chain a second Sort node if you need multi-key ordering (sort by the secondary key first, then the primary).",
    ],
    example:
      'A code node writes an array of order objects to state slot `orders`, e.g. `[{"customer":"Ann","total":"120","placed":"2026-02-01"},{"customer":"Bob","total":"40","placed":"2026-01-15"}]`. A Sort node with Input state = `orders`, Output state = `orders`, Field path = `total`, Direction = Descending, Compare as = Number reorders the array so the largest `total` is first (Bob\'s 40 after Ann\'s 120). Switching Compare as to Text would instead order them lexically ("120" before "40").',
  },
  merge: {
    summary:
      "The \"Merge / Join\" node (Logic group, slug `@merge`) combines two state arrays on a key, like a SQL join. It reads a left array (`input`) and a right array (`rightInput`), matches rows where `leftKey` equals `rightKey`, and writes an array of merged objects to `output` where the right row's fields are spread over (override) the left row's. Mental model: enrich/augment one array of records with fields from another keyed lookup.",
    whenToUse:
      "Use it when one state array of records needs fields pulled in from a second array keyed by a shared id (e.g. attaching user details to orders, or merging an API response with a lookup table) before rendering or further transforming.",
    config: [
      {
        name: "Description",
        description:
          "Free-text note for the node (DescriptionField). Stored in `description`. No runtime effect; documentation only.",
      },
      {
        name: "Input state",
        description:
          'i18n `logic.input`. StateSelect bound to `input` — the LEFT (primary) array. Picks an existing state name (always saved as { mode: "name", value }). Default "state1". Read with asArray: a real array is used as-is; a JSON-string array is parsed; anything else becomes [].',
      },
      {
        name: "Right array (state)",
        description:
          'i18n `merge.rightInput`. StateSelect bound to `rightInput` — the RIGHT array to join against. Saved as { mode: "name", value }. Default value is "" (empty), so the node no-ops until you pick a state. Coerced with asArray just like the left side.',
      },
      {
        name: "Left key",
        description:
          'i18n `merge.leftKey`. Free-text monospace input bound to `leftKey`. Dotted/bracketed path read from each LEFT row via getPath (e.g. `id`, `user.id`, `items[0].id`; `$`-prefixed values use full JSONPath). Default "id". The resolved value is String()-coerced before comparison.',
      },
      {
        name: "Right key",
        description:
          'i18n `merge.rightKey`. Free-text monospace input bound to `rightKey`. Dotted/bracketed path read from each RIGHT row via getPath to build the join index. Default "id". String()-coerced before comparison, so it matches the left key by stringified value.',
      },
      {
        name: "Join",
        description:
          'i18n `merge.joinKind`. Select bound to `joinKind`; options from JOIN_KINDS in menu order: "Inner (matched only)" (inner) drops left rows with no right match; "Left (keep unmatched)" (left) keeps unmatched left rows unchanged. Default "inner".',
      },
      {
        name: "Output state",
        description:
          'i18n `logic.output`. StateSelect bound to `output`. Saved as { mode: "name", value }. Default "state1" (same as input, so by default it overwrites the left array in place). Receives the joined array.',
      },
      {
        name: "(help text)",
        description:
          'Static caption (`merge.help`): "Joins left + right rows where the keys match; right fields override left." Not editable.',
      },
    ],
    io: {
      reads:
        "Two state slots by name: `input` (left/primary array) and `rightInput` (right array). Each is coerced via asArray (array passes through, JSON-string array is parsed, otherwise []).",
      writes:
        'One state slot named by `output`: an array of merged row objects (right fields spread over left). For joinKind "inner" only matched left rows are emitted; for "left" unmatched left rows are kept as-is.',
    },
    tips: [
      'Default `rightInput` value is empty (""), and the runtime bails out (writes nothing) if input, rightInput, or output resolves to an empty state name — the node silently no-ops until you set the Right array.',
      "Right wins on field collisions: merged rows are { ...leftRow, ...rightRow }, so any field present on both sides takes the right value. There is no key prefixing or conflict warning.",
      "Only the FIRST/last right row per key is kept: the right array is indexed into a Map by stringified key, so duplicate right keys collapse to the last one written, and a left row can match at most one right row (no row multiplication like a SQL many-to-many join).",
      'Keys are compared as strings (String(getPath(...))), so 1 (number) matches "1" (string). undefined/null/missing keys stringify to "undefined"/"null" and can match each other unexpectedly.',
      "Inputs are coerced with asArray: a JSON-string array is parsed, but a non-array value (object, number, malformed JSON) becomes [] — a bad binding yields an empty result, not an error.",
      'Output defaults to the same state as Input ("state1"), so it overwrites the left array in place unless you point it elsewhere.',
      "Keys support dotted/bracketed paths and `$`-prefixed JSONPath via getPath (e.g. `user.id`, `items[0].id`); a blank key resolves to the whole row, which rarely matches usefully.",
      "Only `inner` and `left` joins exist — there is no right or full outer join, and right rows that match nothing are never emitted on their own.",
    ],
    example:
      'State `orders` = [{id:1, total:9}, {id:2, total:4}]; state `users` = [{id:1, name:\\"Ann\\"}]. Configure Input state = orders, Right array = users, Left key = `id`, Right key = `id`, Join = Inner (matched only), Output state = orders. Result written to `orders`: [{id:1, total:9, name:\\"Ann\\"}] — the unmatched order id:2 is dropped. Switching Join to Left keeps it: [{id:1, total:9, name:\\"Ann\\"}, {id:2, total:4}].',
  },
  template: {
    summary:
      'The Template / String node (type "template", slug @template, Logic group) interpolates {{stateName}} tokens in a text template against the shared state and writes the rendered string to a bound output state key. Mental model: a standalone version of the AI node\'s prompt templating — a string builder that stitches current state values into one text blob.',
    whenToUse:
      "Reach for it when you need to compose a human-readable string from one or more state values — e.g. building a prompt for a downstream AI node, formatting a message for an output/website node, or concatenating fields into a single key. Use it instead of a code node whenever simple {{token}} substitution is enough.",
    config: [
      {
        name: "Description",
        description:
          'Optional free-text helper note (node.description). Placeholder: "Optional helper text shown below the label". Documentation only; not used at runtime.',
      },
      {
        name: "Template",
        description:
          'Multi-line monospace textarea (node.template). The text to render. Use {{stateName}} tokens — they are replaced with the current state values. Help text: "Use {{stateName}} tokens. They are replaced with the current state values." Token regex is /\\{\\{\\s*([\\w$]+)\\s*\\}\\}/g, so whitespace inside braces is allowed and key names may contain word chars or $. Any text is valid; default is "Hello {{state1}}".',
      },
      {
        name: "Output state",
        description:
          'State key the rendered string is written to (node.output, StateBinding). Chosen via a StateSelect dropdown of existing state names; the editor always saves it as mode "name". Default "state1".',
      },
    ],
    io: {
      reads:
        "Every {{name}} token in the template reads the matching key from the shared state map (whatever values prior nodes have set). There is no single declared input binding — reads are driven entirely by the tokens present in the template.",
      writes:
        "The interpolated string is written to the state key resolved from the output binding (resolveBinding(node.output, stateNode)). If the output binding resolves to an empty name, the node returns early and writes nothing.",
    },
    tips: [
      'Output value is always a string. interpolate() coerces each token\'s value with String(v); objects/arrays render as their default string form (e.g. "[object Object]"), so use a code/JSONPath node first if you need specific formatting.',
      'A token whose state value is null or undefined renders as an empty string, not the literal "{{name}}" — missing keys silently disappear.',
      "Token names must match the regex [\\w$]+ (letters, digits, underscore, $). Dotted/nested paths like {{user.name}} are NOT supported — only flat state keys resolve.",
      "Whitespace inside braces is tolerated, so {{ state1 }} and {{state1}} are equivalent.",
      "The output is written with no read-before-write guard: it overwrites the target key on every run, so don't bind output to a key you still need to read inside the same template (it's read first, then written).",
    ],
    example:
      'State has firstName=\\"Ada\\" and topic=\\"graphs\\". Template node with Template = \\"Hi {{firstName}}, here is a summary about {{topic}}.\\" and Output state = prompt. After running, state.prompt = \\"Hi Ada, here is a summary about graphs.\\" — ready to feed into a downstream AI node.',
  },
  regex: {
    summary:
      'The Regex node (slug @regex, Logic group) runs a JavaScript regular expression over a string read from one state slot and writes the result to another. It supports four modes — Test, Match, Extract groups, and Replace — built on the native RegExp engine. Mental model: a single string-in, result-out transform where the "result" shape changes with the chosen mode (boolean string, single match string, array of full matches, array of capture groups, or replaced string).',
    whenToUse:
      "Reach for it when you need to validate a string against a pattern, pull substrings or capture groups out of free-form text, or do find-and-replace on a state value mid-chain. Use Logic nodes like JSONPath instead when the source is structured JSON rather than raw text.",
    config: [
      {
        name: "Description",
        description:
          "Optional helper text shown below the node label (field.description). Free text, not used at runtime.",
      },
      {
        name: "Input state",
        description:
          "State-slot picker (logic.input). Selects the state key whose value is read as the source string. Written as a name binding via StateSelect.",
      },
      {
        name: "Output state",
        description:
          "State-slot picker (logic.output). Selects the state key the result is written to. Name binding via StateSelect.",
      },
      {
        name: "Pattern",
        description:
          "The regular expression body (regex.pattern), entered as plain text without slashes. Placeholder \\d+. Passed directly to `new RegExp(pattern, flags)`. Required — node does nothing if empty.",
      },
      {
        name: "Flags",
        description:
          "RegExp flags string (regex.flags), e.g. gi. Placeholder gi. Empty string is treated as no flags. Default config value is g.",
      },
      {
        name: "Mode",
        description:
          "Select control (regex.mode) listing options in order: Test (true/false), Match, Extract groups, Replace (REGEX_MODES = test, match, extract, replace; default config value is match). Determines what gets written to the output slot.",
      },
      {
        name: "Replacement",
        description:
          "Text field (regex.replacement, placeholder $1) shown ONLY when Mode is Replace. Supports $1, $2… group references per its help text. Passed to String.replace as the replacement.",
      },
    ],
    io: {
      reads:
        'Reads the string value at the Input state slot (coerced via String(value ?? "")). Bindings are resolved through resolveBinding; the editor always emits name bindings.',
      writes:
        'Writes to the Output state slot. test → "true"/"false" string; replace → input with matches replaced; extract → array of capture groups from the first match (m.slice(1)), or [] if no match; match → with the global flag an array of all full matches (or []), without global the first full match string (or ""). No write occurs if Input, Output, or Pattern is empty.',
    },
    tips: [
      'Test mode writes a STRING "true"/"false", not a real boolean — downstream comparisons must match the string form.',
      "Extract mode only ever inspects the FIRST match (re.exec once) and returns its capture groups; the global flag does not make it collect groups across all matches. Use Match mode for all occurrences.",
      "Match mode behaves very differently by flag: with g you get an array (source.match), without g you get a single full-match string. Set flags deliberately.",
      "The node silently no-ops (writes nothing) when Pattern is empty or either binding is unset — there is no error surfaced; a leftover/default value will remain in the output slot.",
      "Pattern goes straight into new RegExp, so escape backslashes as you would in a regex literal body (e.g. \\d+), and an invalid pattern will throw at runtime.",
    ],
    example:
      'Extract a 4-digit year from a date string. Input state = orderDate (value \\"Shipped 2026-06-13\\"), Pattern = (\\\\d{4}), Flags = (empty), Mode = Extract groups, Output state = year. The node writes [\\"2026\\"] (the first capture group) to year.',
  },
  jsonpath: {
    summary:
      'The "JSONPath / Query" node (type `jsonpath`, slug `@jsonpath`, Logic group) extracts a single nested value out of a JSON input slot by resolving a dotted/bracketed path or a full JSONPath expression, then writes the resolved value into an output slot. Mental model: a read-one-value extractor — point it at a state slot holding JSON, give it a path, and it drops whatever it finds into another slot.',
    whenToUse:
      "Reach for it when an upstream node (e.g. an HTTP Request) parked a JSON object/array in state and you need to pluck out one nested field, array element, or a filtered/wildcard set of values. Use the `$` JSONPath form for wildcards, recursion, slices, and filters; use the simple dotted form for plain nested keys and indexes.",
    config: [
      {
        name: "Description",
        description:
          "Free-text note for the node (field.description). Optional; documentation only, does not affect execution.",
      },
      {
        name: "Input state",
        description:
          'State slot to read the source JSON from (logic.input). A dropdown of existing state slots (StateSelect); the editor always writes it back as binding mode "name". Defaults to "state1". The runtime runs asJson() on the slot value, so a stringified JSON value is JSON.parsed first; non-JSON strings are used as-is.',
      },
      {
        name: "Output state",
        description:
          'State slot the resolved value is written to (logic.output). Dropdown of state slots, stored as mode "name". Defaults to "state1" — by default input and output are the SAME slot, so the result overwrites the source unless you pick a different slot.',
      },
      {
        name: "Path",
        description:
          'The path expression (jsonpath.path, label "Path"). Free-text, monospaced, placeholder data.items[0].name. Two styles: SIMPLE dotted/bracketed (no leading $) e.g. status, user.name, items[0].name (dot-segments may contain spaces like "Happy Birthday"; a literal dot inside a key is not reachable in this form); and full JSONPATH starting with $ e.g. $ (whole input), $.user.name, $[\'Happy Birthday\'], $[*], $..name (recursive), $.items[0,2], $.items[1:3] (slice), $.items[-1:], $.items[?(@.price>10)] (filter). Empty path or $ returns the whole input. An inline help line and a collapsible "JSONPath cheatsheet" (jsonpath.docs) accompany the field.',
      },
    ],
    io: {
      reads:
        "The state slot named by the Input state binding (resolved via resolveBinding). Its value is normalized with asJson (parsed if it's a JSON string) before the path is applied.",
      writes:
        'The state slot named by the Output state binding, set to the resolved value passed through toStateValue (null/undefined become empty string ""; arrays/objects/primitives are stored as-is). If Input or Output resolves to an empty name, the node does nothing (no write).',
    },
    tips: [
      "Input and Output both default to state1, so an out-of-the-box jsonpath node overwrites its own source slot — set Output to a different slot if you need to keep the original JSON.",
      'Result shape depends on match count for $ JSONPath queries: 0 matches → empty string (toStateValue turns undefined into ""), exactly 1 match → that single value (scalar), 2+ matches → an array of values. Plan downstream nodes accordingly.',
      "If the root value is already a JSON array, do NOT prefix with .items — use $[*] / $[0] etc. directly; adding .items is the most common mistake called out in the built-in cheatsheet.",
      "Simple dotted paths cannot reach a key that literally contains a dot or other separators; switch to the $ form with bracket-quoting ($['my.key']) for spaced or punctuated keys.",
      'A missing or unmatched path yields an empty string rather than an error, so a downstream check sees "" not a thrown failure. The input is only parsed if it\'s valid JSON; a malformed JSON string falls through to asJson returning the raw string, and the path then resolves against a plain string (usually undefined → "").',
    ],
    example:
      'State slot `resp` holds {"data":{"items":[{"name":"Widget","price":9},{"name":"Gadget","price":12}]}} from an HTTP node. Set Input state = resp, Path = $.data.items[?(@.price>10)].name, Output state = pricey. After the node runs, `pricey` = "Gadget" (single match → scalar). Changing Path to data.items[0].name (simple form) would instead write "Widget".',
  },
  math: {
    summary:
      'The Math / Expression node (type "math", slug @math, group "Logic") evaluates a single mathjs expression over the shared state store and writes the stringified result to one output slot. Mental model: a one-line calculator/formula where every state slot is a variable you reference by its name.',
    whenToUse:
      "Reach for it to compute a derived value from one or more state slots (arithmetic, rounding, trig, units, fractions, etc.) without writing a full Code node. Use it for formulas like price * qty, percentages, averages, or geometric math where the result is a single value.",
    config: [
      {
        name: "Description (DescriptionField)",
        description:
          "Optional free-text note attached to the node (node.description). Documentation only; has no effect on execution.",
      },
      {
        name: "Expression",
        description:
          'Text input (monospace), i18n key math.expression. The mathjs expression to evaluate, e.g. price * qty. Reference any state slot by its bare name as a variable. Supports operators + - * / % ^ and parentheses, the full mathjs function library (round, floor, ceil, abs, sqrt, cbrt, pow, exp, log, min, max, mean, sum, trig in radians, etc.), constants pi and e, and units/fractions. No JavaScript eval; mathjs import/createUnit are disabled. Default config value is "state1". Empty/whitespace-only expressions are a no-op at runtime.',
      },
      {
        name: "Output state",
        description:
          'StateSelect dropdown, i18n key logic.output. Picks the state slot that receives the stringified result. Editing it always writes the binding as { mode: "name", value: <slot name> } (name mode only via this form). Default config value binds to "state1".',
      },
      {
        name: "Expression cheatsheet (collapsible details)",
        description:
          "A read-only <details> disclosure (math.docs.title / math.docs) showing a mathjs reference: variables, operators, functions, constants, examples, and fractions/units. No configurable controls inside; reference material only.",
      },
    ],
    io: {
      reads:
        "Implicitly reads every state slot referenced by name inside the Expression. The entire state map is passed to mathjs as the eval scope (via evalExpression in src/lib/transform.ts); string values that look numeric (non-empty and Number.isFinite) are coerced to numbers, all other values pass through unchanged. There is no explicit input binding control.",
      writes:
        "Writes the stringified evaluation result to the single Output state slot (resolved from node.output). numbers/booleans/strings become String(result); BigNumber/Fraction/Complex/Matrix/Unit use .toString(); anything else is JSON.stringify'd. No write occurs if the output binding is unresolved or the expression is empty/whitespace.",
    },
    tips: [
      "State slots are referenced as bare identifiers, NOT with {{ }} templating. Use price * qty, not {{price}} * {{qty}}. The slot's name must be a valid mathjs identifier.",
      'Result is always stored as a string, since the state store is flat string-keyed. Downstream numeric nodes re-coerce numeric-looking strings, so chaining math nodes works, but the slot literally holds e.g. "42".',
      "Only string state values that parse to a finite number are coerced to numbers; empty strings and non-numeric strings are passed through as-is, which can make arithmetic on a blank/garbage slot fail or produce a non-finite result.",
      "evalExpression throws (it is not caught inside runMathNode) when the result is null/undefined or a non-finite number (e.g. divide-by-zero, NaN). A malformed expression also throws from mathjs. Either aborts the run rather than writing a value.",
      'Output binding is forced to name mode by the editor (mode: "name"); the math editor offers no literal/index option and no separate input selector.',
      "Trig functions operate in radians, and ^ is exponentiation (2 ^ 10 = 1024), not bitwise XOR.",
    ],
    example:
      'With state slots price = \\"19.99\\", qty = \\"3\\", and an output slot total: set Expression to round(price * qty, 2) and Output state to total. After the node runs, state.total becomes \\"59.97\\".',
  },
  schema_validate: {
    summary:
      'schema_validate ("Schema Validate", Logic group) is a pure synchronous transform node that reads one state slot, parses it as JSON, and checks it against a list of required-field + type rules. It writes the string "true"/"false" to an output slot so a downstream Filter or Code node can gate the chain, and optionally writes a newline-joined list of problems to an errors slot.',
    whenToUse:
      "Use it to assert the shape of JSON sitting in state — required fields are present and have the expected type — before letting the rest of the chain consume it. Pair its boolean output with a Filter/Code node to stop or branch the chain on invalid data.",
    config: [
      {
        name: "Description",
        description:
          "Free-text node description / note. Cosmetic only; not used at runtime.",
      },
      {
        name: "Input state",
        description:
          'State-slot picker (StateSelect) for the JSON to validate. Always bound by name (mode "name"). The slot value is read and parsed with asJson: a JSON string is JSON.parse\'d into an object/array; an empty/blank string becomes ""; an unparseable string is left as the raw string; non-string values pass through unchanged. Default: state1.',
      },
      {
        name: "Required fields",
        description:
          "Repeatable list of validation rules. Each row has: (1) a 'Field path' text input (monospace) — a dotted/bracketed path such as user.name or items[0].id, also accepting a JSONPath expression starting with $ ($ or empty = the root value); (2) a 'Type' dropdown with options Any, String, Number, Boolean, Object, Array (in that order). A trash button removes the row. Each rule asserts the field exists; if type is not Any it also asserts the runtime type matches (arrays are detected as \"array\", everything else via typeof). Default: one rule with empty field path and type Any.",
      },
      {
        name: "Add rule",
        description: 'Appends a new empty rule (field path "", type Any).',
      },
      {
        name: "Output state",
        description:
          'State-slot picker (StateSelect), name-bound. Receives the overall result as the string "true" (all rules passed) or "false" (one or more failed). Default: state1. Required — if it does not resolve to a slot name the node does nothing.',
      },
      {
        name: "Errors state (optional)",
        description:
          'State-slot picker (StateSelect), name-bound. If set, receives the newline-joined list of problem messages (one per failed rule, e.g. "Missing field: user.name" or "Field age expected number, got string"); empty string when everything passed. If left unset (empty), no error output is written. Default: empty.',
      },
    ],
    io: {
      reads:
        "The 'Input state' slot (name-bound). Its value is run through asJson: JSON strings are parsed to objects/arrays, blank strings become \"\", unparseable strings stay as raw strings, non-strings pass through. Each rule's field path is then resolved against that root via getPath (dotted/bracketed paths like a.b[0].c, or JSONPath when it starts with $; $ or empty path = the root).",
      writes:
        "The 'Output state' slot gets the string \"true\" when zero rules failed, else \"false\". If the 'Errors state' slot resolves to a name, it gets the failed-rule messages joined by newlines (empty string when valid). The node no-ops if either Input state or Output state does not resolve to a slot name; the Errors write is skipped only when that slot is unset.",
    },
    tips: [
      'Bindings are name-only: the editor\'s StateSelect always writes mode "name", so there is no index-mode binding here despite the underlying StateBinding type supporting it.',
      'Output is a STRING, not a real boolean — it\'s literally "true"/"false". A downstream Filter/Code/Template node must compare against the string (e.g. value === "true"), not a boolean.',
      'Type checking uses JS typeof with one special case: arrays report as "array" (not "object"). null reports as "object". Choose type Any to assert presence only without checking the type.',
      'A present-but-undefined field fails as "Missing field" — getPath returning undefined is treated as missing, so you cannot distinguish a truly absent key from one whose resolved value is undefined.',
      "If the input slot holds a string that isn't valid JSON, asJson leaves it as the raw string, so paths into it resolve to undefined and most rules will report missing fields. Make sure the slot actually contains parseable JSON.",
      'An empty field path (or "$") targets the root value itself, useful for asserting the whole payload is e.g. an array or object.',
      "Leaving the Errors state slot empty is fine — it simply skips the error write; the boolean output is still produced.",
    ],
    example:
      'A slot `apiResponse` holds `{\\"user\\":{\\"name\\":\\"Ada\\"},\\"items\\":[]}`. Configure Input state = apiResponse, rules: `user.name` → String, `items` → Array, `user.age` → Number. Output state = isValid, Errors state = validationErrors. At runtime isValid becomes \\"false\\" and validationErrors becomes \\"Missing field: user.age\\". A following Filter node keyed on isValid === \\"true\\" then blocks the rest of the chain.',
  },
  encode: {
    summary:
      'The "Encode / Decode" node (type "encode", slug @encode, Logic group) takes the string held in one state slot, applies one reversible/encoding operation (Base64 encode/decode, URL encode/decode, or a one-way SHA-256 hex hash), and writes the result string to another state slot. Mental model: a single pure string transformer wired input-slot → operation → output-slot; input and output may be the same slot (in-place).',
    whenToUse:
      "Reach for it when you need to (de)serialize a state value for transport — e.g. Base64-encode a payload before an HTTP body, URL-encode a query parameter, decode an incoming token, or produce a SHA-256 digest of a string for fingerprinting/comparison. For pure-string, no-network transforms only; use Code for anything more complex.",
    config: [
      {
        name: "Description",
        description:
          'Optional free-text helper note for the node (field.description). Placeholder: "Optional helper text shown below the label". Stored in node.description; does not affect execution.',
      },
      {
        name: "Input state",
        description:
          'State-slot dropdown (logic.input) selecting which slot to read the source string from. Picker writes a name-mode binding (node.input = {mode:"name", value}). Default slot: state1.',
      },
      {
        name: "Output state",
        description:
          'State-slot dropdown (logic.output) selecting which slot the result string is written to. Name-mode binding (node.output = {mode:"name", value}). Default slot: state1 — so by default the node overwrites its own input in place.',
      },
      {
        name: "Operation",
        description:
          'Select (encode.operation, label "Operation") choosing the transform. Options in menu order: "Base64 encode" (base64_encode), "Base64 decode" (base64_decode), "URL encode" (url_encode), "URL decode" (url_decode), "SHA-256 hash" (hash_sha256). Default: Base64 encode. Below the select is static help text: "Transforms the input string. SHA-256 is a one-way hash (hex)."',
      },
    ],
    io: {
      reads:
        'State slot named by node.input (name-mode binding resolved via resolveBinding). Value is coerced with String(state[in] ?? ""), so a missing/undefined slot reads as an empty string.',
      writes:
        'State slot named by node.output. Writes the transformed string: base64_encode -> btoa(unescape(encodeURIComponent(src))); base64_decode -> decodeURIComponent(escape(atob(src))) ("" on decode error); url_encode -> encodeURIComponent(src); url_decode -> decodeURIComponent(src) (falls back to the original src on error); hash_sha256 -> lowercase hex digest via crypto.subtle.digest("SHA-256", ...). If either input or output binding resolves to an empty name, the node returns without writing.',
    },
    tips: [
      'Bindings are name-based: the editor always saves {mode:"name"}, so the dropdowns reference state slots by name. If a referenced slot is renamed/removed in the State node, the binding silently resolves to empty and the node no-ops.',
      'Default input and output are both "state1", which means out-of-the-box the node overwrites its source in place — set distinct slots if you need to keep the original.',
      "Base64 is UTF-8 safe (encodeURIComponent/unescape round-trip), but base64_decode swallows malformed input and writes an empty string rather than erroring; url_decode instead keeps the original string on a malformed escape.",
      "SHA-256 is one-way (hex string out) — there is no decode counterpart; don't expect to reverse it. It runs async via SubtleCrypto (the only async branch).",
      'Non-string inputs are stringified before encoding (e.g. an object becomes "[object Object]"); convert/serialize upstream if you mean to encode JSON.',
      "The node re-runs live as its bound input changes (cheap, local, no network); on an unexpected live-eval error it keeps the previous output value.",
    ],
    example:
      'A tool reads a user-entered API key into state slot "key". An Encode node with Input state = key, Output state = keyB64, Operation = "Base64 encode" produces e.g. key = "user:pass" -> keyB64 = "dXNlcjpwYXNz". A downstream HTTP Request node then interpolates {{keyB64}} into an Authorization header.',
  },
  ai: {
    summary:
      "The AI node (\"AI\", slug @ai, group Logic) sends a prompt to Gemini or OpenRouter and writes the model's reply to a state slot. It runs as part of the async code/AI chain (triggered by an input's run/targets), not the synchronous preview pass.",
    whenToUse:
      "Use it to summarize, rewrite, classify, extract, or generate text from your state via an LLM — anywhere you'd otherwise call a chat model by hand.",
    config: [
      {
        name: "Provider",
        description:
          "Select between Gemini and OpenRouter (node.provider). Determines which API the reply comes from.",
      },
      {
        name: "Model",
        description:
          "Model id combobox (node.model). Pick from the provider's curated list or type any id. Placeholder/default is gemini-2.5-flash for Gemini, openrouter/auto for OpenRouter.",
      },
      {
        name: "Prompt",
        description:
          "The user prompt textarea (node.prompt, monospace). Use {{stateName}} to interpolate state values into the prompt at run time.",
      },
      {
        name: "Output state",
        description:
          'State slot the model reply is written to (node.output, name-mode). "Model reply writes here."',
      },
      {
        name: "Markdown output",
        description:
          "Toggle (node.markdownOutput, default off). When on, the reply is rendered as Markdown in the preview instead of plain text.",
      },
    ],
    io: {
      reads:
        "Any state names referenced as {{name}} tokens in the prompt — interpolated at run time. An auto-built system instruction also lists every state slot (name + current value) so the model is aware of the tool's state.",
      writes:
        "The output state slot — the model's reply text. The node no-ops if the output binding does not resolve to a slot.",
    },
    tips: [
      "The prompt interpolates {{stateName}} — wire inputs into state, then reference them by name.",
      "There is no manual system prompt: the node auto-sends a state-aware system instruction listing the tool's slots (same approach as the code editor's Ask AI panel).",
      "Requires a configured API key for the chosen provider; a missing/invalid key surfaces as a runtime error logged by the chain.",
      "It runs in the async run chain (with Code nodes), so it only fires when an input's run button / targets trigger it — not on every keystroke like synchronous transforms.",
      "Markdown output only changes how the reply renders in the preview; the raw text is still what gets written to state.",
      "Model accepts free-form ids, so you can target any model the provider exposes, not just the curated list.",
    ],
    example:
      'A Textarea writes an article to state `article`. An AI node (provider Gemini, model gemini-2.5-flash) with prompt "Summarize in 3 bullets:\\n{{article}}" writes to `summary`, with Markdown output on so the bullets render in the preview.',
  },
  csv_to_md: {
    summary:
      'The "CSV → Markdown" node (type "csv_to_md", slug @csv_to_md, Logic group) reads a tabular array from its input state slot and converts it to a GitHub-Flavored Markdown table string written to the output slot. Mental model: a pure sync transform wired array-slot → GFM table → output-slot, re-runs live as the input changes, never writes to any slot other than the configured output.',
    whenToUse:
      "Use it when you need a Markdown-formatted table from CSV rows or a JSON array — e.g. to feed a Markdown node, an AI prompt, or the Clipboard. Pair with a CSV input node (upstream) and a Markdown display node or Code node (downstream).",
    config: [
      {
        name: "Description",
        description:
          "Optional author note (node.description). Shown as the node card subtitle in the builder canvas.",
      },
      {
        name: "Input state",
        description:
          "State slot holding the tabular array to convert (node.input, name-mode). Accepts: array of objects (keys → headers), array of arrays (first sub-array → headers, rest → rows), or array of primitives (single `value` column). A JSON string starting with `[` is also parsed. Empty or non-array input clears the output.",
      },
      {
        name: "Output state",
        description:
          "State slot the generated GFM Markdown table is written to (node.output, name-mode). Pipe characters inside cells are escaped; newlines within cells are collapsed to spaces.",
      },
    ],
    io: {
      reads:
        "The input state slot — expects an array (or JSON string of an array).",
      writes:
        "The output state slot — a multi-line GFM Markdown table string (header row | separator row | data rows).",
    },
    tips: [
      "Wire a CSV input node → csv_to_md → Markdown node to let users upload a CSV and see it rendered as a Markdown table immediately.",
      "Pipe into an AI node prompt via {{outputState}} to give the model tabular context in Markdown.",
      "Empty arrays and non-array values write an empty string — the downstream Markdown node shows nothing, which is a clean no-op.",
      "Runs synchronously in the live-change chain, so the Markdown table updates instantly as a CSV is uploaded.",
    ],
    example:
      "A CSV input node writes rows to `csvData`. A csv_to_md node reads `csvData` and writes `tableMarkdown`. A Markdown display node (bound to `tableMarkdown`, read-only) renders the GFM table live.",
  },
  counter: {
    summary:
      'The "Counter" node (type "counter", slug @counter, Inputs group) reads the value held in one state slot, tallies one or more chosen metrics, writes the results to another state slot as a `{ [metric]: number }` object, and renders every selected count live in the preview. Mental model: a sync transform plus a read-only stat grid, wired input-slot → metrics → output-slot; input and output may be the same slot (in-place).',
    whenToUse:
      "Reach for it when you want to show live counts derived from state — e.g. a words + characters + lines counter under a Textarea, the number of rows in a parsed CSV/JSON array, the number of keys in an object, or a sentence count. Pick several metrics at once; they render as preview stat cards and are written to a state slot for downstream nodes. For custom counting logic use Code.",
    config: [
      {
        name: "Field label",
        description:
          'Label shown above the count card in the preview (node.fieldLabel). Default: "Counter".',
      },
      {
        name: "Description",
        description:
          "Optional author note (node.description). Shown under the field label in the preview and as the node card subtitle in the builder canvas; does not affect execution.",
      },
      {
        name: "Input state",
        description:
          'State-slot dropdown (logic.input) selecting which slot to count. Name-mode binding (node.input = {mode:"name", value}). Default slot: state1. Text metrics coerce the value with String(...); array_items / object_keys parse it as an array / JSON object.',
      },
      {
        name: "Output state",
        description:
          "State-slot dropdown (logic.output) the count is written to as a stringified number. Name-mode binding (node.output). Default slot: state1 — so by default the node overwrites its own input in place.",
      },
      {
        name: "Count",
        description:
          'Toggle chips (counter.mode, label "Count") selecting which metrics to tally (node.modes — multiple allowed, kept in catalog order). Options: Words (whitespace-separated runs), Characters (Unicode code points), Characters (no spaces), Letters (Unicode letters only), Uppercase / Lowercase (\\p{Lu} / \\p{Ll}), Digits (\\p{Nd}), Punctuation (punctuation + symbol marks \\p{P}\\p{S}), Whitespace (\\s), Lines (split on CR/LF), Sentences (runs ending in . ! ?), Paragraphs (blocks separated by blank lines), Avg word length (non-space chars ÷ words, 1 dp), Avg sentence length (words ÷ sentences, 1 dp), Longest word / Shortest word (token length in code points), Unique words (distinct, case-insensitive, trimmed of surrounding punctuation), Array items (length of the parsed array), Object keys (own-key count of a parsed object). Default: Words + Characters. With none selected the node writes an empty object and the preview prompts to pick a metric.',
      },
    ],
    io: {
      reads:
        'State slot named by node.input. Text metrics read it coerced to a string (missing/undefined → "" → 0); array_items reads it as an array (via asArray); object_keys parses it as JSON and counts own keys only when it\'s a non-array object.',
      writes:
        "State slot named by node.output — a `{ [metric]: number }` object with one numeric entry per selected metric (keyed by mode id, e.g. { words: 4, characters: 19 }). If either binding resolves to an empty name, the node returns without writing. The preview reads this same output slot to display each live count.",
    },
    tips: [
      "Bindings are name-based; renaming/removing the referenced slot in the State node silently resolves to empty and the node no-ops.",
      "Output is an object, not a string — read individual counts downstream with a JSONPath node (e.g. words) or a Code node; a Table/JSON node can show the whole object.",
      "Default input and output are both state1 (in-place) — set distinct slots to keep the original value alongside its counts.",
      "Characters counts Unicode code points (so emoji and accented letters count as one); Characters (no spaces) strips all whitespace first.",
      "Lines counts 0 for an empty string and otherwise splits on \\r\\n / \\r / \\n; a trailing newline yields one extra (empty) line.",
      "array_items / object_keys accept a real array/object or a JSON string of one; anything else counts as 0.",
      "Runs synchronously in the live-change chain, so the counts update instantly in the preview as the bound input is typed or uploaded.",
      "The preview renders the counts from the output slot — set Output state to a distinct slot if you also want to keep the original input value intact.",
    ],
    example:
      'A Textarea writes prose to state slot "essay". A Counter node (Field label "Stats", Input state = essay, Output state = essayStats, Count = Words + Characters + Lines) renders three live stat cards in the preview for essay = "the quick brown fox" and writes essayStats = { words: 4, characters: 19, lines: 1 } for downstream nodes.',
  },
  download: {
    summary:
      'The "Download" node (type "download", slug @download, Inputs group) renders a download button in the live preview. When clicked it reads the bound state slot and exports its content as the configured format: .csv (array via PapaParse.unparse or string), .md/.svg (plain text file), or .png/.jpeg (data URL from state, or SVG string rendered to a canvas). Mental model: a one-way export trigger — reads state on click, triggers a browser file download, never writes back.',
    whenToUse:
      "Use it to give end users a way to save results — e.g. download a processed CSV after a Filter/Map chain, export a generated Markdown report, or save an uploaded image. Pair with any node that writes content to a state slot (CSV, Code, Template, AI, etc.).",
    config: [
      {
        name: "Field label",
        description:
          "Optional heading shown above the button (node.fieldLabel). Leave blank for a button-only row.",
      },
      {
        name: "Description",
        description:
          "Optional helper text shown below the label (node.description).",
      },
      {
        name: "Button text",
        description:
          'Label on the download button (node.buttonText, default "Download").',
      },
      {
        name: "State binding",
        description:
          "State slot whose value is exported on click (node.binding, name-mode). For CSV: an array is unparsed via PapaParse; a string is used as-is. For PNG/JPEG: expects a data: URL or an SVG string (rendered to canvas). For MD/SVG: any string.",
      },
      {
        name: "Format",
        description:
          "Target file extension and export strategy (node.format). Options: csv, md, svg, png, jpeg.",
      },
      {
        name: "File name",
        description:
          'Base name for the downloaded file without extension (node.fileName, default "export"). Extension is appended automatically.',
      },
    ],
    io: {
      reads:
        "The bound state slot — content is read on button click and never during the change/run chain.",
      writes: "Nothing — this node never modifies state.",
    },
    tips: [
      "For CSV export, bind the output of a Filter/Map/Sort node so the user downloads the processed rows.",
      "For Markdown export, bind a csv_to_md or Template node output to let users save generated reports.",
      "PNG/JPEG export works best when the bound state holds a data URL (from an Image upload node or a code node that creates a canvas data URL). SVG strings are also supported via canvas rendering.",
      "The file name can be a static string; if you need a dynamic name (e.g. date-stamped), write it from a Code/Template node into a separate state slot — the Download node does not interpolate state in the file name field.",
      "Multiple Download nodes can live in one tool, each bound to a different state slot and configured for a different format.",
    ],
    example:
      'A CSV input node writes rows to `csvData`. A Filter node outputs filtered rows to `filtered`. A Download node (format csv, fileName "filtered-export", binding filtered) lets the user download the filtered result with one click.',
  },
  vault: {
    summary:
      'The "Vault" node (type "vault", slug @vault, Data group) is an author-configured key/value store. You add { key, value } pairs in the node editor; the runtime assembles every pair with a non-empty key into a `{ [key]: value }` object and writes it to the bound state slot, and the preview renders the pairs as a read-only detail view (a property sheet). Mental model: a static config/secrets object surfaced as a state slot — one place to define fixed values the rest of the chain reads.',
    whenToUse:
      "Reach for it to hold fixed configuration or credentials that several nodes consume — API base URLs, headers, feature flags, tokens — instead of scattering literals across Template/HTTP/Code nodes. Turn on masking when the values are sensitive so the preview hides them behind dots. For values derived from other state use Template (string) or Code (object) instead; the Vault stores literals only.",
    config: [
      {
        name: "Field label",
        description:
          'Heading shown above the detail view in the preview (node.fieldLabel). Leave blank to omit. Default: "Vault".',
      },
      {
        name: "Description",
        description:
          "Optional author note (node.description). Shown under the field label in the preview and as the node card subtitle; does not affect execution.",
      },
      {
        name: "Key / value pairs",
        description:
          "The stored entries (node.entries — a list of { id, key, value }). Each row is a mono key input + a value input with add / remove controls. Only rows with a non-empty key are written; if two rows share a key the later one wins. Default: one empty pair keyed key1.",
      },
      {
        name: "Mask values",
        description:
          "Toggle (node.masked) that hides every value behind dots in the preview detail view, with a single Reveal/Hide button. Display-only — the stored object always holds the real values. Default: off.",
      },
      {
        name: "State binding",
        description:
          "State slot the assembled object is written to (node.binding, name-mode). Default slot: state1.",
      },
    ],
    io: {
      reads:
        "Nothing — the values come from the node's own entries, not from state.",
      writes:
        "State slot named by node.binding — a `{ [key]: value }` object (string values) with one property per entry that has a non-empty key. If the binding resolves to an empty name the node no-ops. Runs synchronously in the run and live-change chains.",
    },
    tips: [
      "Values are literal strings — they are not interpolated, so {{state}} tokens are stored verbatim; use a Template node if you need interpolation.",
      "Read individual values downstream with a JSONPath node (e.g. apiKey) or a Code node; an HTTP Request header value can pull from the object via an upstream JSONPath.",
      "Masking is preview-only and not real encryption — the values are stored in plain text in the tool definition; don't treat it as secure secret storage.",
      "Bindings are name-based; renaming/removing the referenced slot in the State node silently resolves to empty and the node no-ops.",
      "Entries with a blank key are ignored (in the editor and the detail view), so a half-typed row won't appear in the object.",
    ],
    example:
      'A Vault node (Field label "API config", entries { baseUrl: "https://api.example.com", apiKey: "sk-123" }, masked on, binding config) writes config = { baseUrl: "https://api.example.com", apiKey: "sk-123" }. An HTTP Request node interpolates {{baseUrl}} (via a JSONPath that pulls config.baseUrl into a slot) and sends the key as a header.',
  },
};

/**
 * Look up the in-depth documentation for a node type.
 *
 * @param type - Node kind to document.
 * @returns The {@link NodeDetail} for `type`.
 */
export function getNodeDetail(type: ToolNodeType): NodeDetail {
  return NODE_DETAILS[type];
}
