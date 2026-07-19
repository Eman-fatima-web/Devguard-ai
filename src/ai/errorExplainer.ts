import { askAI, isAIEnabled } from './aiProvider';

/**
 * Common JS/TS/React runtime errors, explained offline (fast, free, no
 * network call). AI is only used as a fallback for errors this table
 * doesn't recognize, or when the user explicitly wants a deeper "why".
 */
const KNOWN_ERROR_PATTERNS: { test: RegExp; explanation: string }[] = [
  {
    test: /Cannot read propert(?:y|ies) '?(\w+)'? of undefined/,
    explanation: "You're trying to access a property on something that is 'undefined' — usually because a variable wasn't set yet, an API call hasn't resolved, or an object doesn't have the shape you expect. Add a check like `if (obj) { ... }` or use optional chaining: `obj?.property`."
  },
  {
    test: /Cannot read propert(?:y|ies) '?(\w+)'? of null/,
    explanation: "You're accessing a property on 'null'. This commonly happens with `document.getElementById(...)` returning null, or a React ref that hasn't attached yet. Guard with a null check or optional chaining."
  },
  {
    test: /is not a function/,
    explanation: "You're calling something as a function that isn't one — often a typo in a method name, an import that resolved to 'undefined', or calling a value before it's been assigned a function."
  },
  {
    test: /Maximum update depth exceeded/,
    explanation: "A React component is stuck in an infinite re-render loop — usually a `setState` call inside the render body (not inside an effect/handler), or a `useEffect` with a dependency that changes every render (like a new object/array literal)."
  },
  {
    test: /Hydration failed|Text content does not match server-rendered HTML/,
    explanation: "The HTML rendered on the server doesn't match what the client rendered on first paint — common in Next.js when using `Date.now()`, `Math.random()`, or browser-only APIs during the initial render. Move that logic into `useEffect` so it only runs client-side."
  },
  {
    test: /Module not found: Error: Can't resolve/,
    explanation: "The bundler can't find a file you imported — check the path for typos, confirm the file exists, and check the file extension/case (this is a common cross-platform issue with case-sensitive file systems)."
  },
  {
    test: /CORS policy/,
    explanation: "The browser blocked a request because the server didn't send the right Access-Control-Allow-Origin header. This needs to be fixed on the backend/API side, not the frontend."
  }
];

export interface ErrorExplanation {
  explanation: string;
  source: 'offline' | 'ai';
}

export async function explainError(errorText: string, wantsAIDeepDive = false): Promise<ErrorExplanation> {
  const match = KNOWN_ERROR_PATTERNS.find((p) => p.test.test(errorText));

  if (match && !wantsAIDeepDive) {
    return { explanation: match.explanation, source: 'offline' };
  }

  if (isAIEnabled()) {
    const prompt = `Explain this JavaScript/TypeScript/React error in simple, plain English for a developer. Be concise (3-5 sentences), explain the likely root cause, and suggest a concrete fix.\n\nError:\n${errorText}`;
    const aiResponse = await askAI(prompt);
    return { explanation: aiResponse, source: 'ai' };
  }

  return {
    explanation: match?.explanation ??
      "This error isn't in DevGuard AI's offline pattern list. Enable AI features in Settings (devguard.ai.enabled) for a plain-English explanation of unrecognized errors.",
    source: 'offline'
  };
}
