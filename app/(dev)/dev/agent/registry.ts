/**
 * GoAgent sandbox registry.
 * The order is the one shown in the agent sidebar. Each entry is a page
 * under /dev/agent/<slug> (the empty slug is the agent landing).
 */
export type AgentEntry = {
  slug: string;
  title: string;
  description: string;
};

export const agentRegistry: AgentEntry[] = [
  {
    slug: "flows",
    title: "Flussi",
    description:
      "Scenari ripetibili end-to-end · crea un trip draft pulito e invia una sequenza scriptata di messaggi all'agent. Auto-conferma le proposte, mostra trip risultante + token/iterazioni.",
  },
  {
    slug: "chat",
    title: "Chat playground",
    description:
      "GoAgentChat live agganciato a /api/go/agent · trip draft usa-e-getta, giorno selezionato, debug per turno.",
  },
  {
    slug: "compare",
    title: "Confronto modelli",
    description:
      "Stesso messaggio, due modelli affiancati (es. gemini-2.5-flash vs gemini-3.5-flash) · chiamata effimera, nessuna persistenza, tool non eseguiti.",
  },
  {
    slug: "loop",
    title: "Loop / debug",
    description:
      "Singolo turno in profondità · traccia iterazione-per-iterazione (tool calls, kind, usage) e split dei token del payload.",
  },
  {
    slug: "tools",
    title: "Tools",
    description:
      "Catalogo write-tools dell'agent (GO_TOOLS) · schema JSON dei parametri, descrizioni, flag requiresConfirm.",
  },
  {
    slug: "prompt",
    title: "System prompt",
    description:
      "Il system prompt esatto che il loop invia all'agent + il contesto trip iniettato per turno.",
  },
];
