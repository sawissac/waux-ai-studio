"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

import { ModelCombobox } from "@/components/ui/model-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProviderModels } from "@/hooks/useProviderModels";
import {
  callGemini,
  callOpenRouter,
  type ChatMessage,
} from "@/lib/ai-providers";
import type { AiProvider, CodeInputLanguage } from "@/types/tool-builder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CodeEditorLanguage = CodeInputLanguage;

export interface CodeEditorProps {
  /** Current source value. */
  value: string;
  /** Called on every keystroke / change. */
  onChange: (value: string) => void;
  /** Editor language — drives syntax highlighting, completions, snippets. */
  language?: CodeEditorLanguage;
  /** Visible height in CSS pixels or CSS string (default 280). */
  height?: number | string;
  /** Whether the editor is read-only. */
  readOnly?: boolean;
  /** Optional container class name. */
  className?: string;
  /** Show the Ask AI header button + panel (default true). */
  aiEnabled?: boolean;
  /** Focus the editor on mount (default true). */
  autoFocus?: boolean;
  /** Controlled AI provider for the Ask AI panel. */
  aiProvider?: AiProvider;
  /** Called when the user changes the AI provider. */
  onAiProviderChange?: (provider: AiProvider) => void;
  /** Controlled AI model for the Ask AI panel. */
  aiModel?: string;
  /** Called when the user changes the AI model. */
  onAiModelChange?: (model: string) => void;
}

// ---------------------------------------------------------------------------
// Snippet definitions
// ---------------------------------------------------------------------------

interface SnippetDef {
  label: string;
  insertText: string;
  detail: string;
  documentation?: string;
}

const JS_SNIPPETS: SnippetDef[] = [
  // ── Console ──
  {
    label: "clg",
    insertText: "console.log(${1:value});$0",
    detail: "console.log()",
    documentation: "Log output to the console.",
  },
  {
    label: "cle",
    insertText: "console.error(${1:error});$0",
    detail: "console.error()",
  },
  {
    label: "clw",
    insertText: "console.warn(${1:warning});$0",
    detail: "console.warn()",
  },
  {
    label: "clt",
    insertText: "console.table(${1:data});$0",
    detail: "console.table()",
  },
  {
    label: "cltime",
    insertText:
      "console.time('${1:label}');\n$0\nconsole.timeEnd('${1:label}');",
    detail: "console.time / timeEnd",
  },
  // ── Functions ──
  {
    label: "fn",
    insertText: "function ${1:name}(${2:params}) {\n\t$0\n}",
    detail: "function declaration",
  },
  {
    label: "afn",
    insertText: "const ${1:name} = (${2:params}) => {\n\t$0\n};",
    detail: "arrow function (block)",
  },
  {
    label: "afne",
    insertText: "const ${1:name} = (${2:params}) => $0;",
    detail: "arrow function (expression)",
  },
  {
    label: "iife",
    insertText: "(() => {\n\t$0\n})();",
    detail: "IIFE (immediately invoked)",
  },
  // ── Async ──
  {
    label: "asyncfn",
    insertText: "async function ${1:name}(${2:params}) {\n\t$0\n}",
    detail: "async function",
  },
  {
    label: "asyncafn",
    insertText: "const ${1:name} = async (${2:params}) => {\n\t$0\n};",
    detail: "async arrow function",
  },
  {
    label: "await",
    insertText: "const ${1:result} = await ${2:promise};$0",
    detail: "await expression",
  },
  // ── Control flow ──
  {
    label: "if",
    insertText: "if (${1:condition}) {\n\t$0\n}",
    detail: "if statement",
  },
  {
    label: "ife",
    insertText: "if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}",
    detail: "if / else",
  },
  {
    label: "ifel",
    insertText:
      "if (${1:condition}) {\n\t$2\n} else if (${3:condition}) {\n\t$4\n} else {\n\t$0\n}",
    detail: "if / else if / else",
  },
  {
    label: "ternary",
    insertText: "${1:condition} ? ${2:then} : ${3:else}$0",
    detail: "ternary expression",
  },
  {
    label: "switch",
    insertText:
      "switch (${1:key}) {\n\tcase ${2:value}:\n\t\t$3\n\t\tbreak;\n\tdefault:\n\t\t$0\n\t\tbreak;\n}",
    detail: "switch statement",
  },
  // ── Loops ──
  {
    label: "for",
    insertText:
      "for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t$0\n}",
    detail: "for loop",
  },
  {
    label: "forof",
    insertText: "for (const ${1:item} of ${2:iterable}) {\n\t$0\n}",
    detail: "for...of loop",
  },
  {
    label: "forin",
    insertText: "for (const ${1:key} in ${2:object}) {\n\t$0\n}",
    detail: "for...in loop",
  },
  {
    label: "while",
    insertText: "while (${1:condition}) {\n\t$0\n}",
    detail: "while loop",
  },
  {
    label: "dowhile",
    insertText: "do {\n\t$0\n} while (${1:condition});",
    detail: "do...while loop",
  },
  // ── Error handling ──
  {
    label: "trycatch",
    insertText: "try {\n\t$1\n} catch (${2:error}) {\n\t$0\n}",
    detail: "try / catch",
  },
  {
    label: "tryfinally",
    insertText:
      "try {\n\t$1\n} catch (${2:error}) {\n\t$3\n} finally {\n\t$0\n}",
    detail: "try / catch / finally",
  },
  {
    label: "throw",
    insertText: "throw new ${1:Error}('${2:message}');$0",
    detail: "throw error",
  },
  // ── Objects / Classes ──
  {
    label: "obj",
    insertText: "const ${1:name} = {\n\t${2:key}: ${3:value},$0\n};",
    detail: "object literal",
  },
  {
    label: "class",
    insertText:
      "class ${1:Name} {\n\tconstructor(${2:params}) {\n\t\t$0\n\t}\n}",
    detail: "class declaration",
  },
  {
    label: "classext",
    insertText:
      "class ${1:Name} extends ${2:Base} {\n\tconstructor(${3:params}) {\n\t\tsuper(${4:args});\n\t\t$0\n\t}\n}",
    detail: "class extends",
  },
  {
    label: "getter",
    insertText: "get ${1:name}() {\n\treturn this.${2:value};$0\n}",
    detail: "getter",
  },
  {
    label: "setter",
    insertText:
      "set ${1:name}(${2:value}) {\n\tthis.${3:field} = ${2:value};$0\n}",
    detail: "setter",
  },
  // ── Array methods ──
  {
    label: "map",
    insertText: "${1:array}.map((${2:item}) => $0)",
    detail: ".map()",
  },
  {
    label: "filter",
    insertText: "${1:array}.filter((${2:item}) => $0)",
    detail: ".filter()",
  },
  {
    label: "reduce",
    insertText:
      "${1:array}.reduce((${2:acc}, ${3:cur}) => {\n\t$0\n}, ${4:initial})",
    detail: ".reduce()",
  },
  {
    label: "find",
    insertText: "${1:array}.find((${2:item}) => $0)",
    detail: ".find()",
  },
  {
    label: "foreach",
    insertText: "${1:array}.forEach((${2:item}) => {\n\t$0\n});",
    detail: ".forEach()",
  },
  {
    label: "some",
    insertText: "${1:array}.some((${2:item}) => $0)",
    detail: ".some()",
  },
  {
    label: "every",
    insertText: "${1:array}.every((${2:item}) => $0)",
    detail: ".every()",
  },
  // ── Promises ──
  {
    label: "promise",
    insertText: "new Promise((resolve, reject) => {\n\t$0\n});",
    detail: "new Promise",
  },
  {
    label: "promiseall",
    insertText: "const ${1:results} = await Promise.all([\n\t$0\n]);",
    detail: "Promise.all",
  },
  {
    label: "thencatch",
    insertText:
      ".then((${1:result}) => {\n\t$2\n}).catch((${3:error}) => {\n\t$0\n});",
    detail: ".then().catch()",
  },
  // ── Destructuring ──
  {
    label: "deso",
    insertText: "const { ${1:prop} } = ${2:object};$0",
    detail: "object destructure",
  },
  {
    label: "desa",
    insertText: "const [${1:first}, ${2:second}] = ${3:array};$0",
    detail: "array destructure",
  },
  // ── Modules ──
  {
    label: "imp",
    insertText: "import ${1:name} from '${2:module}';$0",
    detail: "import default",
  },
  {
    label: "impn",
    insertText: "import { ${1:name} } from '${2:module}';$0",
    detail: "import named",
  },
  {
    label: "impall",
    insertText: "import * as ${1:name} from '${2:module}';$0",
    detail: "import all",
  },
  {
    label: "exp",
    insertText: "export default ${1:name};$0",
    detail: "export default",
  },
  {
    label: "expn",
    insertText: "export { ${1:name} };$0",
    detail: "export named",
  },
  {
    label: "expfn",
    insertText: "export function ${1:name}(${2:params}) {\n\t$0\n}",
    detail: "export function",
  },
  {
    label: "expconst",
    insertText: "export const ${1:name} = $0;",
    detail: "export const",
  },
  // ── Misc ──
  {
    label: "timeout",
    insertText: "setTimeout(() => {\n\t$0\n}, ${1:1000});",
    detail: "setTimeout",
  },
  {
    label: "interval",
    insertText: "const ${1:timer} = setInterval(() => {\n\t$0\n}, ${2:1000});",
    detail: "setInterval",
  },
  {
    label: "fetch",
    insertText:
      "const ${1:response} = await fetch('${2:url}');\nconst ${3:data} = await ${1:response}.json();$0",
    detail: "fetch + json",
  },
  {
    label: "jsonparse",
    insertText: "JSON.parse(${1:str})$0",
    detail: "JSON.parse()",
  },
  {
    label: "jsonstringify",
    insertText: "JSON.stringify(${1:obj}, null, 2)$0",
    detail: "JSON.stringify()",
  },
];

/** TypeScript-only snippets (on top of JS ones). */
const TS_ONLY_SNIPPETS: SnippetDef[] = [
  {
    label: "interface",
    insertText: "interface ${1:Name} {\n\t${2:key}: ${3:type};$0\n}",
    detail: "interface declaration",
  },
  {
    label: "type",
    insertText: "type ${1:Name} = $0;",
    detail: "type alias",
  },
  {
    label: "enum",
    insertText: "enum ${1:Name} {\n\t${2:Member} = ${3:value},$0\n}",
    detail: "enum declaration",
  },
  {
    label: "generic",
    insertText:
      "function ${1:name}<${2:T}>(${3:arg}: ${2:T}): ${4:ReturnType} {\n\t$0\n}",
    detail: "generic function",
  },
  {
    label: "readonly",
    insertText: "readonly ${1:key}: ${2:type};$0",
    detail: "readonly property",
  },
  {
    label: "keyof",
    insertText: "keyof ${1:Type}$0",
    detail: "keyof operator",
  },
  {
    label: "typeof",
    insertText: "typeof ${1:value}$0",
    detail: "typeof operator",
  },
  {
    label: "as",
    insertText: "${1:value} as ${2:Type}$0",
    detail: "type assertion",
  },
  {
    label: "record",
    insertText: "Record<${1:Keys}, ${2:Values}>$0",
    detail: "Record type",
  },
  {
    label: "partial",
    insertText: "Partial<${1:Type}>$0",
    detail: "Partial type",
  },
  {
    label: "required",
    insertText: "Required<${1:Type}>$0",
    detail: "Required type",
  },
  {
    label: "pick",
    insertText: "Pick<${1:Type}, ${2:Keys}>$0",
    detail: "Pick type",
  },
  {
    label: "omit",
    insertText: "Omit<${1:Type}, ${2:Keys}>$0",
    detail: "Omit type",
  },
  {
    label: "tsclass",
    insertText:
      "class ${1:Name} {\n\tprivate ${2:field}: ${3:type};\n\n\tconstructor(${4:params}) {\n\t\tthis.${2:field} = ${5:value};\n\t}\n\n\t$0\n}",
    detail: "typed class",
  },
  {
    label: "tsasync",
    insertText:
      "async function ${1:name}(${2:params}): Promise<${3:ReturnType}> {\n\t$0\n}",
    detail: "async function with return type",
  },
];

// ---------------------------------------------------------------------------
// Register snippets as completion items
// ---------------------------------------------------------------------------

function registerSnippets(
  monaco: Parameters<OnMount>[1],
  language: string,
  snippets: SnippetDef[],
) {
  monaco.languages.registerCompletionItemProvider(language, {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      return {
        suggestions: snippets.map((s) => ({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: s.insertText,
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: s.detail,
          documentation: s.documentation,
          range,
        })),
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Monaco-powered code editor with built-in JS & TS snippets.
 *
 * Loaded dynamically (no SSR) via `@monaco-editor/react`.
 */
const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: "gemini-2.5-flash",
  openrouter: "openrouter/auto",
};

const SYSTEM_PROMPT =
  "You assist inside a JS/HTML code editor. Reply with code only (no markdown fences, no prose) unless explicitly asked for explanation.";

/** Strip leading/trailing ```lang fences a model might still emit. */
function stripFences(text: string): string {
  const t = text.trim();
  const fence = t.match(/^```[\w-]*\n([\s\S]*?)\n```$/);
  return fence ? fence[1] : t;
}

export function CodeEditor({
  value,
  onChange,
  language = "javascript",
  height = 280,
  readOnly = false,
  className,
  aiEnabled = true,
  autoFocus = true,
  aiProvider,
  onAiProviderChange,
  aiModel,
  onAiModelChange,
}: CodeEditorProps) {
  const registered = useRef<Set<string>>(new Set());
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [provider, setProvider] = useState<AiProvider>(aiProvider ?? "gemini");
  const [model, setModel] = useState<string>(
    aiModel ?? DEFAULT_MODELS[aiProvider ?? "gemini"],
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const providerModels = useProviderModels(provider);

  const handleProviderChange = (v: AiProvider) => {
    setProvider(v);
    onAiProviderChange?.(v);
    const next = DEFAULT_MODELS[v];
    setModel(next);
    onAiModelChange?.(next);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  /**
   * Auto-format JSON shortly after the user stops typing — only when the
   * document parses, so half-typed JSON is never touched. Runs Monaco's
   * format action (keeps the cursor in place); the resulting model change
   * flows back through `onChange`.
   */
  const debouncedJsonFormat = useDebouncedCallback(() => {
    const editor = editorRef.current;
    if (language !== "json" || readOnly || !editor) {
      return;
    }
    try {
      JSON.parse(editor.getValue());
    } catch {
      return; // invalid JSON — leave the user's draft alone
    }
    void editor.getAction("editor.action.formatDocument")?.run();
  }, 600);

  // Format on set as well as on edit: external `value` writes (e.g. a code/AI
  // node writing into the bound state) update the prop without firing Monaco's
  // onChange, so watch the prop itself. The format action's own model change
  // re-enters here once and settles (already-formatted text parses + matches).
  useEffect(() => {
    debouncedJsonFormat();
  }, [value, debouncedJsonFormat]);

  /** Insert text at the current cursor in the editor. */
  const insertAtCursor = useCallback(
    (text: string) => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) {
        onChange((value ?? "") + (value?.endsWith("\n") ? "" : "\n") + text);
        return;
      }
      const selection = editor.getSelection();
      const pos = selection ?? editor.getPosition();
      if (!pos) {
        return;
      }
      const range = new monaco.Range(
        "startLineNumber" in pos ? pos.startLineNumber : pos.lineNumber,
        "startColumn" in pos ? pos.startColumn : pos.column,
        "endLineNumber" in pos ? pos.endLineNumber : pos.lineNumber,
        "endColumn" in pos ? pos.endColumn : pos.column,
      );
      editor.executeEdits("ai-insert", [
        { range, text, forceMoveMarkers: true },
      ]);
      editor.focus();
    },
    [onChange, value],
  );

  /** Replace entire editor contents. */
  const replaceAll = useCallback(
    (text: string) => {
      onChange(text);
      const editor = editorRef.current;
      if (editor) {
        editor.focus();
      }
    },
    [onChange],
  );

  const sendChat = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || sending) {
      return;
    }
    setErr(null);
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: prompt },
    ];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const contextNote = value
        ? `Current editor content (language: ${language}):\n\`\`\`${language}\n${value}\n\`\`\``
        : `(editor is empty; language: ${language})`;
      const selection = selectedText.trim();
      const selectionNote = selection
        ? `\n\nThe user has selected this snippet — focus your answer on it:\n\`\`\`${language}\n${selection}\n\`\`\``
        : "";
      const apiMessages: ChatMessage[] = [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\n${contextNote}${selectionNote}`,
        },
        ...nextMessages,
      ];
      const opts = { messages: apiMessages, model: model || undefined };
      const reply =
        provider === "openrouter"
          ? await callOpenRouter(opts)
          : await callGemini(opts);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply || "(empty reply)" },
      ]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }, [
    input,
    sending,
    messages,
    value,
    language,
    provider,
    model,
    selectedText,
  ]);

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Track the current selection so the AI panel can scope answers to it.
      editor.onDidChangeCursorSelection(() => {
        const sel = editor.getSelection();
        const text = sel ? (editor.getModel()?.getValueInRange(sel) ?? "") : "";
        setSelectedText(text);
      });

      // Register JS snippets for both JS and TS (TS inherits JS)
      if (!registered.current.has("javascript")) {
        registerSnippets(monaco, "javascript", JS_SNIPPETS);
        registered.current.add("javascript");
      }
      if (!registered.current.has("typescript")) {
        registerSnippets(monaco, "typescript", [
          ...JS_SNIPPETS,
          ...TS_ONLY_SNIPPETS,
        ]);
        registered.current.add("typescript");
      }
      if (!registered.current.has("html")) {
        // HTML gets JS snippets for inline <script> convenience
        registerSnippets(monaco, "html", JS_SNIPPETS);
        registered.current.add("html");
      }

      // Configure JS/TS compiler defaults
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        allowJs: true,
        checkJs: false,
        strict: false,
        noEmit: true,
        esModuleInterop: true,
        moduleResolution:
          monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        allowNonTsExtensions: true,
      });
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        moduleResolution:
          monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        allowNonTsExtensions: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
      });

      // Focus & set cursor at end
      if (autoFocus) {
        editor.focus();
      }

      // Pretty-print an already-valid document on open (e.g. pasted minified JSON
      // persisted earlier).
      debouncedJsonFormat();
    },
    [autoFocus, debouncedJsonFormat],
  );

  return (
    <div
      className={
        "relative flex flex-col overflow-hidden rounded-lg border" +
        (className ? ` ${className}` : "")
      }
    >
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-2 py-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {language}
        </span>
        {aiEnabled && (
          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors hover:bg-accent active:scale-[0.98]"
            aria-pressed={chatOpen}
          >
            <Sparkles size={12} className="text-pink-500" />
            {chatOpen ? "Close AI" : "Ask AI"}
          </button>
        )}
      </div>
      <div className="relative flex-1">
        <Editor
          height={height}
          language={language}
          value={value}
          onChange={(v) => {
            onChange(v ?? "");
            debouncedJsonFormat();
          }}
          onMount={handleMount}
          theme="vs-dark"
          loading={
            <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-xs text-neutral-500">
              Loading editor…
            </div>
          }
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            lineHeight: 20,
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', monospace",
            fontLigatures: true,
            tabSize: 2,
            wordWrap: "off",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            lineNumbers: "on",
            glyphMargin: false,
            folding: true,
            bracketPairColorization: { enabled: true },
            suggest: {
              showSnippets: true,
              snippetsPreventQuickSuggestions: false,
              showWords: true,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
            acceptSuggestionOnCommitCharacter: true,
            suggestOnTriggerCharacters: true,
            parameterHints: { enabled: true },
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoIndent: "full",
            formatOnPaste: true,
            formatOnType: true,
            renderWhitespace: "none",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "line",
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              verticalSliderSize: 8,
            },
          }}
        />
        {chatOpen && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex w-[340px] max-w-[80%] flex-col border-l bg-background shadow-xl">
            <div className="flex items-center gap-2 border-b px-2.5 py-2">
              <Sparkles size={13} className="text-pink-500" />
              <span className="text-xs font-semibold">AI assistant</span>
              <Select
                value={provider}
                onValueChange={(v) => handleProviderChange(v as AiProvider)}
              >
                <SelectTrigger
                  size="sm"
                  className="ml-auto h-6 w-auto gap-1 px-1.5 text-[11px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent"
                aria-label="Close AI panel"
              >
                <X size={13} />
              </button>
            </div>
            <div className="border-b px-2.5 py-1.5">
              <ModelCombobox
                value={model}
                onChange={(v) => {
                  setModel(v);
                  onAiModelChange?.(v);
                }}
                options={providerModels}
                placeholder={DEFAULT_MODELS[provider]}
                size="sm"
              />
            </div>
            <div
              ref={scrollRef}
              className="flex-1 space-y-2 overflow-y-auto p-2.5"
            >
              {messages.length === 0 && !sending && (
                <p className="text-[11px] text-muted-foreground">
                  Ask anything. Select code in the editor to scope the answer to
                  it. Reply can be inserted at cursor or replace all.
                </p>
              )}
              {messages.map((m, i) => {
                const isUser = m.role === "user";
                const stripped = isUser ? m.content : stripFences(m.content);
                return (
                  <div
                    key={i}
                    className={
                      "rounded-md border p-2 text-[12px] " +
                      (isUser
                        ? "border-border bg-muted/40"
                        : "border-pink-200 bg-pink-50 dark:border-pink-500/20 dark:bg-pink-500/5")
                    }
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {isUser ? "You" : "AI"}
                      </span>
                      {!isUser && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => insertAtCursor(stripped)}
                            className="rounded-md border px-1.5 py-0.5 text-[10px] font-medium hover:bg-accent"
                          >
                            Insert
                          </button>
                          <button
                            type="button"
                            onClick={() => replaceAll(stripped)}
                            className="rounded-md border px-1.5 py-0.5 text-[10px] font-medium hover:bg-accent"
                          >
                            Replace all
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              navigator.clipboard
                                ?.writeText(stripped)
                                .catch(() => {})
                            }
                            className="rounded-md border px-1.5 py-0.5 text-[10px] font-medium hover:bg-accent"
                          >
                            Copy
                          </button>
                        </div>
                      )}
                    </div>
                    <pre className="whitespace-pre-wrap wrap-break-word font-mono text-[11px] leading-snug">
                      {stripped}
                    </pre>
                  </div>
                );
              })}
              {sending && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" />
                  thinking…
                </div>
              )}
              {err && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
                  {err}
                </div>
              )}
            </div>
            {selectedText.trim() && (
              <div className="flex items-center gap-1.5 border-t bg-pink-50 px-2 py-1 dark:bg-pink-500/5">
                <Sparkles size={11} className="shrink-0 text-pink-500" />
                <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground">
                  Selection attached ({selectedText.trim().split("\n").length}{" "}
                  {selectedText.trim().split("\n").length === 1
                    ? "line"
                    : "lines"}
                  )
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedText("")}
                  className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-accent"
                  aria-label="Clear selection"
                >
                  <X size={11} />
                </button>
              </div>
            )}
            <div className="flex items-end gap-1.5 border-t p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendChat();
                  }
                }}
                placeholder="Ask AI… (Enter to send, Shift+Enter for newline)"
                rows={2}
                className="flex-1 resize-none rounded-md border bg-background px-2 py-1.5 text-[12px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <button
                type="button"
                onClick={() => void sendChat()}
                disabled={sending || !input.trim()}
                className="grid size-8 shrink-0 place-items-center rounded-md border bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
                aria-label="Send"
              >
                {sending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
