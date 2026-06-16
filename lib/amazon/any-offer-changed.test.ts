import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAnyOfferChanged } from "./any-offer-changed";

const sample = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    notificationType: "ANY_OFFER_CHANGED",
    payload: {
      AnyOfferChangedNotification: {
        SellerId: "A2SELLER",
        OfferChangeTrigger: {
          MarketplaceId: "A1RKKUPIHCS9HS",
          ASIN: "B00ABCDEFG",
          ItemCondition: "new",
        },
      },
    },
    ...over,
  });

test("parsea un ANY_OFFER_CHANGED directo", () => {
  const r = parseAnyOfferChanged(sample());
  assert.deepEqual(r, {
    sellerId: "A2SELLER",
    marketplaceId: "A1RKKUPIHCS9HS",
    asin: "B00ABCDEFG",
  });
});

test("desenvuelve el envoltorio SNS", () => {
  const sns = JSON.stringify({ Type: "Notification", Message: sample() });
  const r = parseAnyOfferChanged(sns);
  assert.equal(r?.sellerId, "A2SELLER");
  assert.equal(r?.asin, "B00ABCDEFG");
});

test("ignora notificaciones de otro tipo", () => {
  const other = JSON.stringify({
    notificationType: "FEED_PROCESSING_FINISHED",
    payload: {},
  });
  assert.equal(parseAnyOfferChanged(other), null);
});

test("devuelve null con JSON malformado", () => {
  assert.equal(parseAnyOfferChanged("{not json"), null);
  assert.equal(parseAnyOfferChanged(""), null);
});

test("campos ausentes → null, no lanza", () => {
  const partial = JSON.stringify({
    notificationType: "ANY_OFFER_CHANGED",
    payload: { AnyOfferChangedNotification: { SellerId: "A2X" } },
  });
  const r = parseAnyOfferChanged(partial);
  assert.deepEqual(r, { sellerId: "A2X", marketplaceId: null, asin: null });
});

test("acepta claves PascalCase (NotificationType/Payload)", () => {
  const pascal = JSON.stringify({
    NotificationType: "ANY_OFFER_CHANGED",
    Payload: {
      AnyOfferChangedNotification: {
        SellerId: "A2P",
        OfferChangeTrigger: { MarketplaceId: "MX", ASIN: "B1" },
      },
    },
  });
  assert.deepEqual(parseAnyOfferChanged(pascal), {
    sellerId: "A2P",
    marketplaceId: "MX",
    asin: "B1",
  });
});
