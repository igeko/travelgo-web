/**
 * YumejiCatalog · the widget dispatcher.
 *
 * Renders the resolved manifest in order, mapping each widget `type` to its
 * component. Widgets receive their already-derived data slice — they never
 * fetch. Adding a widget = a new case here + a selector in lib/yumeji/select.
 */

import type { ResolvedWidget, YumejiCatalog as Catalog } from "@/lib/yumeji/types";
import { RecentWidget } from "./widgets/RecentWidget";
import { CategoryWidget } from "./widgets/CategoryWidget";

function Widget({ widget }: { widget: ResolvedWidget }) {
  switch (widget.type) {
    case "recent":
      return <RecentWidget props={widget.props} data={widget.data} />;
    case "byCategory":
      return <CategoryWidget props={widget.props} data={widget.data} />;
  }
}

export function YumejiCatalog({ catalog }: { catalog: Catalog }) {
  return (
    <div>
      {catalog.widgets.map((widget) => (
        <Widget key={widget.id} widget={widget} />
      ))}
    </div>
  );
}
