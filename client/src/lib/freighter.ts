/**
 * Freighter wallet helpers.
 * Freighter injects `window.freighterApi` (modern API). We wrap it so the
 * rest of the app depends on a small, typed surface instead of the global.
 */

export interface FreighterNetwork {
  network: string;
  networkPassphrase: string;
  sorobanRpcUrl?: string;
}

interface FreighterApiLike {
  isConnected(): Promise<boolean>;
  getPublicKey(): Promise<string>;
  signTransaction(
    xdr: string,
    opts?: { networkPassphrase?: string; network?: string }
  ): Promise<string>;
  getNetwork(): Promise<FreighterNetwork>;
}

declare global {
  interface Window {
    freighterApi?: FreighterApiLike;
    freighter?: {
      requestAccess?: () => Promise<boolean>;
      getPublicKey?: () => Promise<string>;
      signTransaction?: FreighterApiLike['signTransaction'];
      getNetwork?: () => Promise<FreighterNetwork>;
    };
  }
}

export const isFreighterAvailable = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.freighterApi || window.freighter);
};

const getApi = (): FreighterApiLike => {
  if (window.freighterApi) return window.freighterApi;

  // Legacy API shim
  const legacy = window.freighter;
  if (legacy) {
    return {
      isConnected: async () => {
        try {
          if (legacy.getPublicKey) {
            await legacy.getPublicKey();
            return true;
          }
          if (legacy.requestAccess) return legacy.requestAccess();
        } catch {
          return false;
        }
        return false;
      },
      getPublicKey: async () => {
        if (!legacy.getPublicKey) throw new Error('Freighter not available');
        return legacy.getPublicKey();
      },
      signTransaction: async (xdr, opts) => {
        if (!legacy.signTransaction) throw new Error('Freighter not available');
        return legacy.signTransaction(xdr, opts);
      },
      getNetwork: async () => {
        if (!legacy.getNetwork) {
          return { network: 'TESTNET', networkPassphrase: 'Test SDF Network ; September 2015' };
        }
        return legacy.getNetwork();
      },
    };
  }

  throw new Error('Freighter not available');
};

export const connectFreighter = async (): Promise<string> => {
  if (!isFreighterAvailable()) {
    throw new Error('Freighter is not installed. Install the Freighter wallet extension to continue.');
  }
  const api = getApi();
  if (!(await api.isConnected())) {
    // Request access triggers the approval prompt.
    const publicKey = await api.getPublicKey();
    return publicKey;
  }
  return api.getPublicKey();
};

export const getFreighterNetwork = async (): Promise<FreighterNetwork> => {
  if (!isFreighterAvailable()) {
    return { network: 'TESTNET', networkPassphrase: 'Test SDF Network ; September 2015' };
  }
  return getApi().getNetwork();
};

export const signFreighterTransaction = async (
  xdr: string,
  networkPassphrase: string
): Promise<string> => {
  if (!isFreighterAvailable()) {
    throw new Error('Freighter is not installed');
  }
  return getApi().signTransaction(xdr, { networkPassphrase });
};
