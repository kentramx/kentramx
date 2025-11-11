import { useFacebookPixel, FacebookPixelEvent } from './useFacebookPixel';
import { useGoogleAnalytics, GoogleAnalyticsEvent } from './useGoogleAnalytics';
import { useGTM, GTMEvent } from './useGTM';

interface TrackingParameters {
  content_name?: string;
  content_category?: string;
  event_label?: string;
  event_category?: string;
  value?: number;
  currency?: string;
  item_id?: string;
  item_name?: string;
  items?: any[];
  search_term?: string;
  promotion_id?: string;
  promotion_name?: string;
  [key: string]: any;
}

export const useTracking = () => {
  const { trackEvent: trackFBEvent } = useFacebookPixel();
  const { trackEvent: trackGAEvent, trackPageView, trackGA4Only } = useGoogleAnalytics();
  const { trackEvent: trackGTMEvent, trackPageView: trackGTMPageView } = useGTM();

  const trackEvent = async (
    eventName: FacebookPixelEvent,
    parameters?: TrackingParameters
  ) => {
    // Trackear mediante GTM (centralizado)
    trackGTMEvent(eventName as GTMEvent, parameters);
    
    // También trackear directamente por redundancia
    await Promise.all([
      trackFBEvent(eventName, parameters),
      trackGAEvent(eventName, parameters),
    ]);
  };

  // Trackear pageview mediante GTM
  const trackPageViewUnified = (page_path: string, page_title?: string) => {
    trackGTMPageView(page_path, page_title);
    trackPageView(page_path, page_title);
  };

  // Trackear solo en GA4 (eventos específicos de GA4)
  const trackGA4Event = (
    eventName: GoogleAnalyticsEvent,
    parameters?: TrackingParameters
  ) => {
    // Enviar a GTM primero
    trackGTMEvent(eventName as GTMEvent, parameters);
    // También trackear directamente
    trackGA4Only(eventName, parameters);
  };

  return {
    trackEvent,
    trackPageView: trackPageViewUnified,
    trackGA4Event,
  };
};
