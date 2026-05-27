"use client";

/**
 * Lazy-load de los overlays del centro de control.
 *
 * page.tsx solía importar 9 overlays grandes (Analytics, Catalog, Profit,
 * RealData, Toolbox, Help, Audit, AccountSettings, Tour) — todos client
 * components que entraban al bundle inicial aunque el usuario no abriera
 * ninguno. Aquí los pasamos por `next/dynamic` con `ssr:false` para que
 * el HTML inicial no los renderice y su JS se difiera.
 *
 * Cada overlay mantiene su propio estado interno (listener de evento
 * "orvexia:open-*"); aquí solo los registramos como módulos diferidos.
 */

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { OvEvent, OvProduct } from "./AnalyticsOverlay";
import type { AccountSettingsData } from "./AccountSettings";
import type { NetNode } from "./ProductNetwork";

// Default-export dinámico — el módulo entero se carga al hidratar.
const AnalyticsOverlay = dynamic(() => import("./AnalyticsOverlay"), {
  ssr: false,
});
const AccountSettings = dynamic(() => import("./AccountSettings"), {
  ssr: false,
});
const CatalogOverlay = dynamic(() => import("./CatalogOverlay"), {
  ssr: false,
});
const ProfitOverlay = dynamic(() => import("./ProfitOverlay"), {
  ssr: false,
});
const HelpOverlay = dynamic(() => import("./HelpOverlay"), { ssr: false });
const AuditOverlay = dynamic(() => import("./AuditOverlay"), { ssr: false });
const RealDataPanel = dynamic(() => import("./RealDataPanel"), {
  ssr: false,
});
const ToolboxPanel = dynamic(() => import("./ToolboxPanel"), { ssr: false });
const Tour = dynamic(() => import("./Tour"), { ssr: false });

interface LazyOverlaysProps {
  analytics: ComponentProps<typeof AnalyticsOverlay>;
  accountSettings: AccountSettingsData;
  items: NetNode[];
  toolboxInitial: ComponentProps<typeof ToolboxPanel>["initialVacation"];
}

export default function LazyOverlays({
  analytics,
  accountSettings,
  items,
  toolboxInitial,
}: LazyOverlaysProps) {
  return (
    <>
      <AnalyticsOverlay {...analytics} />
      <AccountSettings initial={accountSettings} />
      <CatalogOverlay items={items} />
      <ProfitOverlay items={items} />
      <HelpOverlay />
      <AuditOverlay />
      <RealDataPanel />
      <ToolboxPanel initialVacation={toolboxInitial} />
      <Tour />
    </>
  );
}

// Re-export de tipos por conveniencia para los importadores.
export type { OvEvent, OvProduct };
