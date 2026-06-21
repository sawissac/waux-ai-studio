# Node Suggestions

Candidate node types to add to the catalog, grouped by role. Existing catalog already
covers display/transform (Table, Markdown, JSON, CSV, View Port, Themed, HTML Sanitize,
TS Type Converter, AI). These fill the gaps.

## Input nodes (collect data)

| Node               | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| Number / Slider    | Numeric value with min/max/step.                           |
| Select / Dropdown  | Pick from an options list; bind options to a state slot.   |
| Toggle / Checkbox  | Boolean flag.                                              |
| Date / Time picker | Temporal input.                                            |
| File upload        | Generic file (not just CSV); output bytes / base64 / text. |
| Image upload       | Preview + write data URL; feeds AI vision.                 |
| Key-Value pairs    | Shipped as Vault: key/value store -> object on state.      |
| Secret             | Vault masking; display-only, not encrypted.                |
| Color picker       | Pairs with the Themed node.                                |
| Counter            | Live count of words / chars / lines / array items.         |

## Logic nodes (process data)

| Node              | Purpose                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| HTTP Request      | Fetch a URL; method/headers/body bound from state. Chains real APIs.   |
| Filter            | Keep array rows matching a condition.                                  |
| Map / Transform   | Reshape array fields; pairs with Table / CSV.                          |
| Sort              | Order an array by key.                                                 |
| Merge / Join      | Combine two state arrays on a key.                                     |
| Template / String | Interpolate `{{name}}` into text (extract from AI node as standalone). |
| Regex             | Match / extract / replace.                                             |
| JSONPath / Query  | Pull a nested value out of JSON.                                       |
| Math / Expression | Evaluate a formula over state.                                         |
| Schema Validate   | Check JSON shape; gate the chain.                                      |
| Encode / Decode   | base64, URL, hash.                                                     |

## Top picks (highest value first)

1. HTTP Request
2. Select / Dropdown
3. Filter
4. Map / Transform
5. Number / Slider

These unlock most real workflows.
