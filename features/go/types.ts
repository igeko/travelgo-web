/**
 * Go · Widget System — tipi centrali.
 *
 * Il sistema è aperto: ogni widget è definito nel proprio file e si
 * registra nel registry. Questo file contiene solo i contratti condivisi
 * tra core, API route e widget individuali.
 */

/* ─────────────────────────────────────────────────────────────────
   Contesto passato all'API Go
   Descrive dove si trova l'utente e cosa ha scatenato la richiesta.
───────────────────────────────────────────────────────────────── */

export type GoTriggerSource =
  | "go_banner"         // l'utente ha cliccato il banner Go principale
  | "activity_row"      // clic su un'attività specifica
  | "wishlist_item"     // clic su un elemento della wishlist
  | "day_header"        // clic nell'header di un giorno
  | "custom";           // trigger programmatico con intent esplicito

export type GoContext = {
  /** Pagina corrente dell'app */
  page: "trip" | "day" | "activity" | "wishlist";
  /** ID del viaggio corrente */
  tripId: string;
  /** Cosa ha scatenato la richiesta */
  trigger: {
    source: GoTriggerSource;
    /** ID elemento specifico (activityId, wishlistItemId…) */
    elementId?: string;
    /** Testo libero opzionale dall'utente */
    userIntent?: string;
  };
  /** Riassunto del viaggio — sempre incluso */
  trip: {
    destination: string;
    dates: { start: string | null; end: string | null };
    themes: string[];
  };
  /** Contesto del giorno corrente (se rilevante) */
  day?: {
    number: number;
    title?: string;
    activitiesCount: number;
  };
};

/* ─────────────────────────────────────────────────────────────────
   Risposta dell'API — payload generico discriminato per tipo widget
───────────────────────────────────────────────────────────────── */

export type GoResponse = {
  /** Chiave nel widget registry */
  widget: string;
  /** Payload specifico del widget — validato a runtime dallo schema del widget */
  payload: unknown;
};

/* ─────────────────────────────────────────────────────────────────
   Azioni che un widget può emettere verso il layer app
   Il GoPanel le intercetta e le traduce in side-effect concreti.
───────────────────────────────────────────────────────────────── */

export type GoAction =
  | { kind: "add_to_wishlist"; itemId: string; label: string }
  | { kind: "add_to_day"; itemId: string; dayNumber: number; label: string }
  | { kind: "confirm"; value: boolean; field?: string }
  | { kind: "select"; itemId: string; label: string }
  | { kind: "dismiss" };

/* ─────────────────────────────────────────────────────────────────
   Callback iniettate dal GoPanel in ogni widget
   I widget non fanno side-effect diretti — chiamano questi handler.
───────────────────────────────────────────────────────────────── */

export type GoActionHandlers = {
  onAction: (action: GoAction) => void;
  onDismiss: () => void;
};

/* ─────────────────────────────────────────────────────────────────
   Stato della sessione Go (state machine)
───────────────────────────────────────────────────────────────── */

export type GoSessionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "responding"; response: GoResponse }
  | { status: "error"; message: string };
