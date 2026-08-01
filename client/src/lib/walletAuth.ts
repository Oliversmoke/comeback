import toast from 'react-hot-toast';
import { authAPI } from './api';
import { useAuthStore } from '@/store/authStore';
import {
  connectFreighter,
  signFreighterTransaction,
  getFreighterNetwork,
  isFreighterAvailable,
} from './freighter';

interface LoginWithWalletOptions {
  /** Shown on success. Defaults to 'Wallet connected!'. */
  successMessage?: string;
  /** Shown on failure. Defaults to 'Wallet login failed'. */
  errorMessage?: string;
}

/**
 * Full Freighter SEP-10 login flow, shared by the login and register pages:
 * connect → fetch challenge → network-mismatch check → sign → verify → setAuth.
 * Returns `{ ok: true }` on success (caller navigates) or `{ ok: false }` after
 * showing the relevant toast.
 */
export async function loginWithWallet(
  options: LoginWithWalletOptions = {}
): Promise<{ ok: boolean }> {
  if (!isFreighterAvailable()) {
    toast.error('Freighter is not installed. Install the Freighter wallet extension to continue.');
    return { ok: false };
  }

  try {
    const publicKey = await connectFreighter();
    const { data: challengeRes } = await authAPI.stellarChallenge(publicKey);
    const { challengeXdr, networkPassphrase } = challengeRes.data;

    // Warn if the wallet is on a different network than the server's challenge.
    const walletNetwork = await getFreighterNetwork();
    if (walletNetwork.networkPassphrase && walletNetwork.networkPassphrase !== networkPassphrase) {
      toast.error(
        `Network mismatch: wallet is on ${walletNetwork.network}, but the server issued a ${challengeRes.data.homeDomain} challenge.`
      );
      return { ok: false };
    }

    const signedXdr = await signFreighterTransaction(challengeXdr, networkPassphrase);
    const { data: verifyRes } = await authAPI.stellarVerify(publicKey, signedXdr);

    useAuthStore.getState().setAuth(
      verifyRes.data.user,
      verifyRes.data.accessToken,
      verifyRes.data.refreshToken
    );

    toast.success(options.successMessage || 'Wallet connected!');
    return { ok: true };
  } catch (err: any) {
    toast.error(err.response?.data?.message || options.errorMessage || err.message || 'Wallet login failed');
    return { ok: false };
  }
}
