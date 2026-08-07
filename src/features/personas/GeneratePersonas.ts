export type Persona = {
  demographics: {
    age_range: string;
    income_band: string;
    location: string;
  };
  psychographics: {
    values: {
      sustainability_focus: number;
      status_signaling: number;
      price_sensitivity: number;
    };
    buying_triggers: string[];
    content_preferences: string[];
  };
  behavioral: {
    platform_habits: {
      tiktok_hours_week: number;
      instagram_hours_week: number;
      google_search_weekly: number;
    };
    purchase_patterns: string[];
    price_anchor: number;
  };
};

const DEFAULT_PERSONA_COUNT = 500;

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64'];
const INCOME_BANDS = ['low', 'mid', 'high'];
const LOCATIONS = ['IE', 'UK', 'EU', 'US', 'CA'];
const BUYING_TRIGGERS = ['social_proof', 'scarcity', 'authority', 'reciprocity', 'urgency'];
const CONTENT_PREFERENCES = ['short_video', 'carousel', 'ugc', 'static_image', 'long_form'];
const PURCHASE_PATTERNS = ['impulse_buyer', 'reviews_dependent', 'deal_seeker', 'brand_loyal'];

// Not random -- this is the "500 hardcoded personas" the MVP scope calls
// for, deterministically cycling through fixed value pools so the same
// panel comes out every time. Persona generation UI (real variety, real
// calibration against conversion data) is v2.
function pickTwo<T>(pool: T[], index: number): T[] {
  const first = pool[index % pool.length]!;
  const second = pool[(index + 1) % pool.length]!;
  return first === second ? [first] : [first, second];
}

export function generatePersonas(count: number = DEFAULT_PERSONA_COUNT): Persona[] {
  return Array.from({ length: count }, (_, i) => ({
    demographics: {
      age_range: AGE_RANGES[i % AGE_RANGES.length]!,
      income_band: INCOME_BANDS[i % INCOME_BANDS.length]!,
      location: LOCATIONS[i % LOCATIONS.length]!,
    },
    psychographics: {
      values: {
        sustainability_focus: ((i * 7) % 100) / 100,
        status_signaling: ((i * 13) % 100) / 100,
        price_sensitivity: ((i * 19) % 100) / 100,
      },
      buying_triggers: pickTwo(BUYING_TRIGGERS, i),
      content_preferences: pickTwo(CONTENT_PREFERENCES, i + 1),
    },
    behavioral: {
      platform_habits: {
        tiktok_hours_week: i % 10,
        instagram_hours_week: (i * 2) % 15,
        google_search_weekly: (i * 3) % 20,
      },
      purchase_patterns: pickTwo(PURCHASE_PATTERNS, i),
      price_anchor: 10 + (i % 50),
    },
  }));
}
