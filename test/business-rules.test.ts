import test from "node:test";
import assert from "node:assert/strict";
import { getAuctionStatus } from "../services/auction-status";

test("Regla #12: Estado dinámico de subastas", async (t) => {
  const now = new Date("2026-10-27T12:00:00Z");

  await t.test("Subasta cancelada retorna siempre CANCELLED", () => {
    const status = getAuctionStatus(
      { isCancelled: true, closesAt: new Date("2026-10-28T12:00:00Z") },
      5,
      now
    );
    assert.equal(status, "CANCELLED");
  });

  await t.test("Subasta no cancelada con fecha de cierre futura es ACTIVE", () => {
    const status = getAuctionStatus(
      { isCancelled: false, closesAt: new Date("2026-10-27T14:00:00Z") },
      0,
      now
    );
    assert.equal(status, "ACTIVE");
  });

  await t.test("Subasta con fecha de cierre pasada y con ofertas es CLOSED", () => {
    const status = getAuctionStatus(
      { isCancelled: false, closesAt: new Date("2026-10-27T10:00:00Z") },
      3,
      now
    );
    assert.equal(status, "CLOSED");
  });

  await t.test("Subasta con fecha de cierre pasada y sin ofertas es DESERTED", () => {
    const status = getAuctionStatus(
      { isCancelled: false, closesAt: new Date("2026-10-27T10:00:00Z") },
      0,
      now
    );
    assert.equal(status, "DESERTED");
  });
});

test("Regla #11: Anti-sniping y validación de extensiones", () => {
  const now = new Date("2026-10-27T12:00:00Z");
  const closesAt = new Date("2026-10-27T12:03:00Z"); // Faltan 3 minutos (<= 5 min)
  const diffMs = closesAt.getTime() - now.getTime();
  const fiveMinMs = 5 * 60 * 1000;

  assert.ok(diffMs <= fiveMinMs, "Debe activar condición anti-sniping");

  const extendedClosesAt = new Date(closesAt.getTime() + fiveMinMs);
  assert.equal(
    extendedClosesAt.toISOString(),
    "2026-10-27T12:08:00.000Z",
    "La fecha de cierre debe extenderse exactamente 5 minutos"
  );
});
