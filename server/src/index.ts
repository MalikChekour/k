// Point d'entrée Cloudflare Worker. Les données (plantes, politique de vente) sont embarquées au build.
import plants from '../../app/src/data/bundle.json';
import policy from '../../data/sale_policy.json';
import { handle } from './worker.ts';
import type { Env } from './worker.ts';

export default {
  fetch: (req: Request, env: Env) =>
    handle(req, {
      env,
      plants: (plants as { plants: { id: string; fr: string; latin: string; part: string }[] }).plants,
      policy,
    }),
};
