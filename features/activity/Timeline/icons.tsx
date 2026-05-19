import {
  IconMapPin, IconSoup, IconTree, IconKey, IconTrain,
  IconWalk, IconBus, IconCar, IconBike,
} from "@/components/ui/icons";

/* ─── type → icon ─────────────────────────────────────────────── */
export const TYPE_ICON: Record<string, React.ReactElement> = {
  place:  <IconMapPin size={12} />,
  meal:   <IconSoup   size={12} />,
  pause:  <IconTree   size={12} />,
  action: <IconKey    size={12} />,
  move:   <IconTrain  size={12} />,
};

/* ─── transport → icon ────────────────────────────────────────── */
export const TRANSPORT_ICON: Record<string, React.ReactElement> = {
  walk:  <IconWalk  size={12} />,
  metro: <IconTrain size={12} />,
  bus:   <IconBus   size={12} />,
  taxi:  <IconCar   size={12} />,
  car:   <IconCar   size={12} />,
  bike:  <IconBike  size={12} />,
  train: <IconTrain size={12} />,
};
