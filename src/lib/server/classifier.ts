import { TYPESAFE_API_KEY, TYPESAFE_BASE_URL, TYPESAFE_MODEL } from '$app/env/private';
import { FallbackClassifier, type Classifier } from './classify.js';
import { JevClassifier } from './jev.js';

/** The app-wide classifier: Jev when a key is configured, otherwise the fallback. */
export const classifier: Classifier = TYPESAFE_API_KEY
	? new JevClassifier({
			apiKey: TYPESAFE_API_KEY,
			baseUrl: TYPESAFE_BASE_URL,
			model: TYPESAFE_MODEL
		})
	: new FallbackClassifier();

if (!TYPESAFE_API_KEY) {
	console.warn('[tarot] TYPESAFE_API_KEY is not set; readings will use fallback classification');
}
