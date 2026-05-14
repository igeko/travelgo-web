// Questo layout wrappa sia /trips (lista) che /trips/[id].
// L'header viene gestito dai layout figli per poter passare il tripName.
export default function TripsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
