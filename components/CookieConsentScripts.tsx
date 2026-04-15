"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { COOKIE_CONSENT_EVENT, type CookieConsent } from "@/lib/cookie-consent";

type CookieConsentScriptsProps = {
  initialConsent: CookieConsent | null;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function CookieConsentScripts({ initialConsent }: CookieConsentScriptsProps) {
  const [consent, setConsent] = useState<CookieConsent | null>(initialConsent);

  useEffect(() => {
    const onConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent<CookieConsent>;
      if (customEvent.detail) setConsent(customEvent.detail);
    };

    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChange as EventListener);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!window.gtag) return;
    window.gtag("consent", "update", {
      analytics_storage: consent?.analytics ? "granted" : "denied",
      ad_storage: consent?.advertising ? "granted" : "denied",
    });
  }, [consent]);

  useEffect(() => {
    if (!window.fbq) return;
    window.fbq("consent", consent?.advertising ? "grant" : "revoke");
  }, [consent]);

  const analyticsEnabled = consent?.analytics === true;
  const advertisingEnabled = consent?.advertising === true;

  return (
    <>
      {analyticsEnabled && gaMeasurementId ? (
        <>
          <Script
            id="ga-lib"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('consent', 'default', {
                analytics_storage: 'granted',
                ad_storage: '${advertisingEnabled ? "granted" : "denied"}'
              });
              gtag('config', '${gaMeasurementId}', { anonymize_ip: true });
            `}
          </Script>
        </>
      ) : null}

      {advertisingEnabled && metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
            fbq('consent', 'grant');
            fbq('track', 'PageView');
          `}
        </Script>
      ) : null}
    </>
  );
}
