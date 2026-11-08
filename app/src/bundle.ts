import raw from './data/bundle.json';
import type { Bundle } from './safety';
import type { Usage } from './usages';
import type { Infusion } from './infusion';

export type Group = { id: string; fr: string; note: string; plants: string[] };
export type AppBundle = Bundle & { usages: Usage[]; infusions: Infusion[]; groups: Group[] };
/** Bundle compilé par tools/build_bundle.py (refusé s'il est incohérent). */
export const bundle = raw as unknown as AppBundle;
export const plants = bundle.plants;
