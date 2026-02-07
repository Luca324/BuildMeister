// @ts-ignore - EverShop resolves these modules at runtime
import { getConfig } from '@evershop/evershop/lib/util/getConfig';

export default {
  Query: {
    carriers: () => {
      const carriers = getConfig('oms.carriers', {});
      return Object.keys(carriers).map((key) => ({
        ...carriers[key],
        code: key
      }));
    }
  }
};

