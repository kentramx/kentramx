import { useFacebookPixel, FacebookPixelEvent } from './useFacebookPixel';
import { useGoogleAnalytics, GoogleAnalyticsEvent } from './useGoogleAnalytics';

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

  const trackEvent = async (
    eventName: FacebookPixelEvent,
    parameters?: TrackingParameters
  ) => {
    // Trackear en ambas plataformas
    await Promise.all([
      trackFBEvent(eventName, parameters),
      trackGAEvent(eventName, parameters),
    ]);
  };

  // Trackear solo en GA4 (eventos específicos de GA4)
  const trackGA4Event = (
    eventName: GoogleAnalyticsEvent,
    parameters?: TrackingParameters
  ) => {
    trackGA4Only(eventName, parameters);
  };

  return {
    trackEvent,
    trackPageView,
    trackGA4Event,
  };
};
