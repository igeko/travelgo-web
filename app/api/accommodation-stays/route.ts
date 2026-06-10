import { revalidatePath } from "next/cache";
import { route, readJson, ok } from "@/lib/api";
import { requireTripEditor } from "@/lib/api/guards";
import { badRequest } from "@/lib/api/errors";
import { serverServices } from "@/lib/services";
import type { CreateLodgingInput } from "@/lib/services/AccommodationService";

/**
 * POST /api/accommodation-stays
 *
 * Crea una nuova stay (1 notte default) + la sua Property activity in un
 * colpo solo. Usato dal pannello lodging della daybyday quando l'utente
 * configura un pernottamento da zero (nessuna stay esistente sul giorno).
 *
 * Body = `CreateLodgingInput`:
 *   { tripId, dayId, name, type?, address?, url?, placeId?, lat?, lng?,
 *     nights?, totalCostAmount?, totalCostCurrency?, paid?, instanceNote? }
 *
 * Per alzare le notti dopo, il client usa l'endpoint `extend` esistente.
 * Per editare la Property o i campi stay (cost, booking) si usa il PATCH
 * sulla stay creata.
 */
export const POST = route(async ({ req }) => {
  const body = await readJson<CreateLodgingInput>(req);
  if (!body?.tripId) throw badRequest("tripId is required");
  if (!body?.dayId) throw badRequest("dayId is required");
  if (!body?.name) throw badRequest("name is required");

  // Authz: il chiamante dev'essere editor del trip a cui finisce la stay.
  await requireTripEditor(body.tripId);

  const services = await serverServices();
  const stay = await services.accommodations.createWithProperty(body);

  // Invalidiamo entrambi gli ingressi del trip: daybyday legge dalla
  // mappa accommodations, explore-next ricarica i nights via SSR.
  revalidatePath(`/trips/${body.tripId}/explore-next`);
  revalidatePath(`/trips/${body.tripId}/explore`);
  revalidatePath(`/trips/${body.tripId}`);

  return ok(stay);
});
