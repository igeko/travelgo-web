import { redirect } from "next/navigation";
import { serverDal } from "@/lib/dal";
import { serverServices } from "@/lib/services";
import { AppHeaderServer } from "@/features/app/AppHeaderServer";
import { YumejiCatalog } from "@/features/yumeji/YumejiCatalog";
import { YUMEJI_MANIFEST } from "@/lib/yumeji/manifest";
import { cn } from "@/lib/cn";
import { PAGE_PX } from "@/lib/layout";

export const dynamic = "force-dynamic";

/**
 * /yumeji · la collezione come catalogo editoriale.
 *
 * La pagina è una sequenza di widget letta da un manifest (lib/yumeji/manifest).
 * Il data layer fa UN solo caricamento bounded della collezione (buildCatalog);
 * ogni widget ne ricava in memoria la propria fetta — nessuna query per-widget.
 */
export default async function YumejiPage() {
  const dal = await serverDal();
  const { data: authUser } = await dal.users.getCurrentUser();
  if (!authUser) redirect("/login");

  const services = await serverServices();
  const catalog = await services.yumes.buildCatalog(YUMEJI_MANIFEST);

  return (
    <>
      <AppHeaderServer activeNav="yumeji" />

      <main className={cn("flex-1 max-w-[1280px] w-full mx-auto py-8", PAGE_PX)}>
        <div className="text-orange text-tiny font-medium tracking-eyebrow-wide uppercase mb-1">
          Yumeji · 夢路
        </div>
        <h1 className="text-[24px] font-medium text-ink leading-tight">Il sentiero dei sogni</h1>
        <p className="text-meta text-ink-soft mt-2 max-w-[560px] leading-relaxed">
          La tua collezione di luoghi, esperienze e idee per i prossimi viaggi.
        </p>

        {catalog.isEmpty ? (
          <div className="mt-12 flex flex-col items-center justify-center text-center px-6 py-12">
            <p className="text-meta font-medium text-ink mb-1">Non hai ancora salvato niente</p>
            <p className="text-mini text-ink-faint max-w-[280px] leading-snug">
              Esplora e salva i luoghi che ti incuriosiscono: li ritroverai qui, raccolti come un
              catalogo.
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <YumejiCatalog catalog={catalog} />
          </div>
        )}
      </main>
    </>
  );
}
