/**
 * Widget index — registra tutti i widget nel registry.
 *
 * Per aggiungere un nuovo widget:
 *   1. Crea `features/go/widgets/mio-widget.widget.tsx`
 *   2. Esporta `mioWidgetDef: WidgetDefinition<MyPayload>`
 *   3. Importa e registra qui sotto — nient'altro da toccare.
 */

import { widgetRegistry } from "../widget-registry";
import { suggestionsWidgetDef } from "./suggestions.widget";
import { confirmWidgetDef } from "./confirm.widget";
import { carouselWidgetDef } from "./carousel.widget";
import { quickReplyWidgetDef } from "./quick-reply.widget";

widgetRegistry.register(suggestionsWidgetDef);
widgetRegistry.register(confirmWidgetDef);
widgetRegistry.register(carouselWidgetDef);
widgetRegistry.register(quickReplyWidgetDef);

// Re-export per chi vuole i tipi senza importare dal registry
export type { SuggestionsPayload, SuggestionItem } from "./suggestions.widget";
export type { ConfirmPayload } from "./confirm.widget";
export type { CarouselPayload, CarouselItem } from "./carousel.widget";
export type { QuickReplyPayload, QuickReplyOption } from "./quick-reply.widget";
