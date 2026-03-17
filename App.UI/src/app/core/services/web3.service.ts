import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { Web3State } from '../models/web3-state.model';
import { AppError } from '../errors/app.error';
import { createWalletClient, custom, getAddress } from 'viem';
import { sepolia } from 'viem/chains';

@Injectable({
  providedIn: 'root',
})
export class Web3Service implements OnDestroy {
  private provider?: BrowserProvider;
  private signer?: JsonRpcSigner;

  // Event handlers references for cleanup
  private accountsChangedHandler?: (accounts: string[]) => void;
  private chainChangedHandler?: (chainId: string) => void;

  // Initialization promise to avoid race conditions
  private initPromise: Promise<void>;

  // State management
  private stateSubject = new BehaviorSubject<Web3State>({
    address: null,
    isConnected: false,
    isInitialized: false,
    chainId: null,
  });

  // Public observables
  public state$: Observable<Web3State> = this.stateSubject.asObservable();
  public walletAddress$: Observable<string | null> = new Observable((observer) => {
    const subscription = this.state$.subscribe((state) => observer.next(state.address));
    return () => subscription.unsubscribe();
  });
  public isConnected$: Observable<boolean> = new Observable((observer) => {
    const subscription = this.state$.subscribe((state) => observer.next(state.isConnected));
    return () => subscription.unsubscribe();
  });

  constructor() {
    this.initPromise = this.initialize();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // ==================== Initialization ====================

  private async initialize(): Promise<void> {
    if (!this.isMetaMaskInstalled()) {
      this.updateState({ isInitialized: true });
      return;
    }

    try {
      this.provider = new BrowserProvider(window.ethereum!);
      await this.loadConnectedAccount();
      await this.loadChainId();
      this.setupEventListeners();
      this.updateState({ isInitialized: true });
    } catch (error) {
      console.error('Web3 initialization failed:', error);
      this.updateState({ isInitialized: true });
      throw new AppError({
        message: 'Failed to initialize Web3 service',
        status: 500,
        title: 'Initialization Failed',
        type: 'WEB3_INITIALIZATION_FAILED',
      });
    }
  }

  private async loadConnectedAccount(): Promise<void> {
    if (!this.provider) return;

    try {
      const accounts = await this.provider.listAccounts();
      if (accounts.length > 0) {
        this.signer = await this.provider.getSigner();
        const address = await this.signer.getAddress();
        this.updateState({ address, isConnected: true });
      }
    } catch (error) {
      console.error('Failed to load connected account:', error);
    }
  }

  private async loadChainId(): Promise<void> {
    if (!this.provider) return;

    try {
      const network = await this.provider.getNetwork();
      this.updateState({ chainId: network.chainId.toString() });
    } catch (error) {
      console.error('Failed to load chain ID:', error);
    }
  }

  // ==================== Event Listeners ====================

  private setupEventListeners(): void {
    if (!window.ethereum) return;

    // Handle account changes
    this.accountsChangedHandler = (accounts: string[]) => {
      if (accounts.length > 0) {
        this.updateState({ address: accounts[0], isConnected: true });
        // Re-get signer for new account
        this.refreshSigner();
      } else {
        this.updateState({ address: null, isConnected: false });
        this.signer = undefined;
      }
    };

    // Handle chain changes
    this.chainChangedHandler = (chainId: string) => {
      console.log('Chain changed to:', chainId);
      this.updateState({ chainId });
      // Reload to avoid state inconsistencies
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', this.accountsChangedHandler);
    window.ethereum.on('chainChanged', this.chainChangedHandler);
  }

  private async refreshSigner(): Promise<void> {
    if (!this.provider) return;

    try {
      this.signer = await this.provider.getSigner();
    } catch (error) {
      console.error('Failed to refresh signer:', error);
      this.signer = undefined;
    }
  }

  private cleanup(): void {
    if (window.ethereum) {
      if (this.accountsChangedHandler) {
        window.ethereum.removeListener('accountsChanged', this.accountsChangedHandler);
      }
      if (this.chainChangedHandler) {
        window.ethereum.removeListener('chainChanged', this.chainChangedHandler);
      }
    }
    this.stateSubject.complete();
  }

  // ==================== Public Methods ====================

  /**
   * Connect to MetaMask wallet
   * @throws {Web3Error} If MetaMask is not installed or user rejects connection
   */
  async connectWallet(): Promise<string> {
    // Wait for initialization
    await this.initPromise;

    if (!this.isMetaMaskInstalled()) {
      throw new AppError({
        message:
          'MetaMask is not installed. Please install the MetaMask browser extension to continue.',
        status: 400,
        title: 'MetaMask Not Installed',
        type: 'METAMASK_NOT_INSTALLED',
      });
    }

    try {
      await this.provider!.send('eth_requestAccounts', []);
      this.signer = await this.provider!.getSigner();
      const address = await this.signer.getAddress();

      // Get chain ID
      const network = await this.provider!.getNetwork();

      this.updateState({
        address,
        isConnected: true,
        chainId: network.chainId.toString(),
      });

      return address;
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);

      // Handle user rejection
      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        throw new AppError({
          message: 'The connection request was rejected by the user.',
          status: 403,
          title: 'User Rejected',
          type: 'USER_REJECTED',
        });
      }

      throw new AppError({
        message: 'An error occurred while connecting to the wallet. Please try again.',
        status: 500,
        title: 'Connection Error',
        type: 'WALLET_CONNECTION_FAILED',
      });
    }
  }

  /**
   * Disconnect wallet (clears local state only)
   * Note: MetaMask doesn't have a true "disconnect" API
   */
  disconnectWallet(): void {
    this.updateState({ address: null, isConnected: false });
    this.signer = undefined;
  }

  /**
   * Sign a message with the connected wallet
   * @param message Message to sign
   * @returns Signature string
   * @throws {Web3Error} If wallet is not connected
   */
  async signMessage(message: string): Promise<string> {
    if (!this.signer) {
      throw new AppError({
        message: 'No wallet is currently connected.',
        status: 401,
        title: 'Wallet Not Connected',
        type: 'WALLET_NOT_CONNECTED',
      });
    }

    try {
      return await this.signer.signMessage(message);
    } catch (error: any) {
      console.error('Failed to sign message:', error);

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        throw new AppError({
          message: 'The signing request was rejected by the user.',
          status: 403,
          title: 'User Rejected',
          type: 'USER_REJECTED',
        });
      }

      throw new AppError({
        message: 'An error occurred while signing the message. Please try again.',
        status: 500,
        title: 'Signing Error',
        type: 'MESSAGE_SIGNING_FAILED',
      });
    }
  }

  /**
   * Switch to a specific network
   * @param chainId Chain ID in hex format (e.g., '0x1' for mainnet)
   */
  async switchNetwork(chainId: string): Promise<void> {
    if (!window.ethereum) {
      throw new AppError({
        message:
          'MetaMask is not installed. Please install the MetaMask browser extension to continue.',
        status: 400,
        title: 'MetaMask Not Installed',
        type: 'METAMASK_NOT_INSTALLED',
      });
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    } catch (error: any) {
      console.error('Failed to switch network:', error);

      // Chain not added to MetaMask
      if (error.code === 4902) {
        throw new AppError({
          message: 'The selected network is not added to MetaMask.',
          status: 400,
          title: 'Network Not Found',
          type: 'NETWORK_NOT_ADDED',
        });
      }

      throw new AppError({
        message: 'An error occurred while switching the network. Please try again.',
        status: 500,
        title: 'Network Switch Error',
        type: 'NETWORK_SWITCH_FAILED',
      });
    }
  }

  /**
   * Add a custom network to MetaMask
   */
  async addNetwork(params: {
    chainId: string;
    chainName: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    rpcUrls: string[];
    blockExplorerUrls?: string[];
  }): Promise<void> {
    if (!window.ethereum) {
      throw new AppError({
        message: 'MetaMask is not installed',
        status: 400,
        title: 'MetaMask Not Installed',
        type: 'METAMASK_NOT_INSTALLED',
      });
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [params],
      });
    } catch (error) {
      console.error('Failed to add network:', error);
      throw new AppError({
        message: 'An error occurred while adding the network to MetaMask. Please try again.',
        status: 500,
        title: 'Add Network Error',
        type: 'NETWORK_ADD_FAILED',
      });
    }
  }

  // ==================== Getters ====================

  /**
   * Get a viem WalletClient for the connected wallet
   * Required for Lit Protocol EOA auth context
   * @returns WalletClient instance or undefined if wallet not connected
   */
  getViemWalletClient() {
    const address = this.getAddressOrNull();
    if (!address || !window.ethereum) return undefined;

    return createWalletClient({
      account: getAddress(address),
      chain: sepolia,
      transport: custom(window.ethereum),
    });
  }

  /**
   * Get current wallet address
   * @throws {Web3Error} If wallet is not connected
   */
  getAddress(): string {
    const { address } = this.stateSubject.value;
    if (!address) {
      throw new AppError({
        message: 'No wallet is currently connected.',
        status: 401,
        title: 'Wallet Not Connected',
        type: 'WALLET_NOT_CONNECTED',
      });
    }
    return address;
  }

  /**
   * Get current wallet address or null if not connected
   */
  getAddressOrNull(): string | null {
    return this.stateSubject.value.address;
  }

  /**
   * Get shortened address format (0x1234...5678)
   */
  getShortAddress(address?: string): string {
    const addr = address || this.getAddressOrNull();
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }

  /**
   * Get current chain ID
   */
  getChainId(): string | null {
    return this.stateSubject.value.chainId;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.stateSubject.value.isConnected;
  }

  /**
   * Check if MetaMask is installed
   */
  isMetaMaskInstalled(): boolean {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask === true;
  }

  /**
   * Get current state snapshot
   */
  getState(): Web3State {
    return { ...this.stateSubject.value };
  }

  /**
   * Get provider instance (use with caution)
   */
  getProvider(): BrowserProvider | undefined {
    return this.provider;
  }

  /**
   * Get signer instance (use with caution)
   */
  getSigner(): JsonRpcSigner | undefined {
    return this.signer;
  }

  // ==================== Private Helpers ====================

  private updateState(partial: Partial<Web3State>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partial,
    });
  }
}
