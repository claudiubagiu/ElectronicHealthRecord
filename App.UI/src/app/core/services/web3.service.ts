import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { Web3State } from '../models/web3-state.model';
import { AppError } from '../errors/app.error';

@Injectable({
  providedIn: 'root',
})
export class Web3Service implements OnDestroy {
  private provider?: BrowserProvider;
  private signer?: JsonRpcSigner;

  private accountsChangedHandler?: (accounts: string[]) => void;
  private chainChangedHandler?: (chainId: string) => void;

  private initPromise: Promise<void>;

  private stateSubject = new BehaviorSubject<Web3State>({
    address: null,
    isConnected: false,
    isInitialized: false,
    chainId: null,
  });

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

  private setupEventListeners(): void {
    if (!window.ethereum) return;

    this.accountsChangedHandler = (accounts: string[]) => {
      if (accounts.length > 0) {
        this.updateState({ address: accounts[0], isConnected: true });
        this.refreshSigner();
      } else {
        this.updateState({ address: null, isConnected: false });
        this.signer = undefined;
      }
    };

    this.chainChangedHandler = (chainId: string) => {
      console.log('Chain changed to:', chainId);
      this.updateState({ chainId });
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

  async connectWallet(): Promise<string> {
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

      const network = await this.provider!.getNetwork();

      this.updateState({
        address,
        isConnected: true,
        chainId: network.chainId.toString(),
      });

      return address;
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);

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

  disconnectWallet(): void {
    this.updateState({ address: null, isConnected: false });
    this.signer = undefined;
  }

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

  waitForInit(): Promise<void> {
    return this.initPromise;
  }

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

  getAddressOrNull(): string | null {
    return this.stateSubject.value.address;
  }

  getShortAddress(address?: string): string {
    const addr = address || this.getAddressOrNull();
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }

  getChainId(): string | null {
    return this.stateSubject.value.chainId;
  }

  isConnected(): boolean {
    return this.stateSubject.value.isConnected;
  }

  isMetaMaskInstalled(): boolean {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask === true;
  }

  getState(): Web3State {
    return { ...this.stateSubject.value };
  }

  getProvider(): BrowserProvider | undefined {
    return this.provider;
  }

  getSigner(): JsonRpcSigner | undefined {
    return this.signer;
  }

  private updateState(partial: Partial<Web3State>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partial,
    });
  }
}
