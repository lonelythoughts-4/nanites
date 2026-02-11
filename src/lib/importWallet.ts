export type ImportedWallet = {
  evm?: {
    address: string;
    wallet: any;
  };
  sol?: {
    address: string;
    keypair: any;
  };
};

export type ImportedBalances = {
  eth: { native: number; usdt: number; usdc: number };
  bsc: { native: number; usdt: number; usdc: number };
  sol: { native: number; usdt: number; usdc: number };
};

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address,uint256) returns (bool)'
];

const DEFAULT_EVM = {
  eth: {
    usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606e48'
  },
  bsc: {
    usdt: '0x55d398326f99059ff775485246999027b3197955',
    usdc: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'
  }
};

const DEFAULT_SOL = {
  usdt: 'Es9vMFrzaCERxjEQ2e8gQx3G5n8N7xP4xLQow9i5ewwB',
  usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
};

const ETH_RPCS = [
  'https://eth.publicnode.com',
  'https://eth-mainnet.public.blastapi.io',
  'https://1rpc.io/eth'
];

const BSC_RPCS = [
  'https://bsc.publicnode.com',
  'https://bsc-mainnet.public.blastapi.io',
  'https://1rpc.io/bsc'
];

const SOL_RPCS = [
  'https://api.mainnet-beta.solana.com',
  'https://lb.drpc.live/solana/AsI-wCxldUISpGcRLIzZ1ZTm73-y0MsR8K7dOmy9-kY5'
];

const RPC_TIMEOUT_MS = 7000;
const PROVIDER_TTL_MS = 30000;

const providerCache = new Map<string, { ts: number; provider: any }>();

async function withTimeout<T>(promise: Promise<T>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('RPC timeout')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function firstSuccess<T>(promises: Promise<T>[]) {
  let rejected = 0;
  let lastError: any = null;
  return await new Promise<T>((resolve, reject) => {
    promises.forEach((promise) => {
      promise
        .then(resolve)
        .catch((err) => {
          rejected += 1;
          lastError = err;
          if (rejected >= promises.length) {
            reject(lastError || new Error('All RPCs failed'));
          }
        });
    });
  });
}

async function getEthers() {
  return await import('ethers');
}

async function getSolana() {
  return await import('@solana/web3.js');
}

async function getSplToken() {
  return await import('@solana/spl-token');
}

async function deriveSolanaFromSeed(seedPhrase: string) {
  const bip39 = await import('bip39');
  const { derivePath } = await import('ed25519-hd-key');
  const { Keypair } = await getSolana();
  const seed = await bip39.mnemonicToSeed(seedPhrase);
  const derived = derivePath("m/44'/501'/0'/0'", seed.toString('hex'));
  return Keypair.fromSeed(derived.key);
}

async function deriveSolanaFromPrivate(privateKey: string) {
  const { Keypair } = await getSolana();
  const cleaned = privateKey.trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return Keypair.fromSecretKey(Uint8Array.from(parsed));
    }
  } catch {
    // ignore
  }
  const bs58 = await import('bs58');
  const decoded = bs58.default.decode(cleaned);
  return Keypair.fromSecretKey(decoded);
}

function isHexPrivateKey(value: string) {
  return /^0x?[0-9a-fA-F]{64}$/.test(value.trim());
}

export async function deriveImportedWallet(mode: 'seed' | 'private', value: string): Promise<ImportedWallet> {
  const cleaned = value.trim();
  if (!cleaned) throw new Error('Missing key');

  const result: ImportedWallet = {};
  const { HDNodeWallet, Wallet } = await getEthers();

  if (mode === 'seed') {
    result.evm = {
      wallet: HDNodeWallet.fromPhrase(cleaned, undefined, "m/44'/60'/0'/0/0"),
      address: ''
    };
    result.evm.address = result.evm.wallet.address;

    const solKeypair = await deriveSolanaFromSeed(cleaned);
    result.sol = { keypair: solKeypair, address: solKeypair.publicKey.toBase58() };
    return result;
  }

  if (isHexPrivateKey(cleaned)) {
    const normalized = cleaned.startsWith('0x') ? cleaned : `0x${cleaned}`;
    const evmWallet = new Wallet(normalized);
    result.evm = { wallet: evmWallet, address: evmWallet.address };
    return result;
  }

  const solKeypair = await deriveSolanaFromPrivate(cleaned);
  result.sol = { keypair: solKeypair, address: solKeypair.publicKey.toBase58() };
  return result;
}

async function getEvmProvider(chain: 'eth' | 'bsc') {
  const { JsonRpcProvider } = await getEthers();
  const cacheKey = `evm:${chain}`;
  const cached = providerCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < PROVIDER_TTL_MS) {
    return cached.provider;
  }

  const rpcs = chain === 'eth' ? ETH_RPCS : BSC_RPCS;
  const attempts = rpcs.map(async (rpc) => {
    const provider = new JsonRpcProvider(rpc);
    await withTimeout(provider.getBlockNumber(), RPC_TIMEOUT_MS);
    return provider;
  });

  try {
    const provider = await firstSuccess(attempts);
    providerCache.set(cacheKey, { ts: Date.now(), provider });
    return provider;
  } catch {
    const fallback = new JsonRpcProvider(rpcs[0]);
    providerCache.set(cacheKey, { ts: Date.now(), provider: fallback });
    return fallback;
  }
}

async function getEvmTokenContracts(chain: 'eth' | 'bsc', walletAddress: string) {
  const { Contract, getAddress } = await getEthers();
  const provider = await getEvmProvider(chain);
  const usdt = chain === 'eth' ? DEFAULT_EVM.eth.usdt : DEFAULT_EVM.bsc.usdt;
  const usdc = chain === 'eth' ? DEFAULT_EVM.eth.usdc : DEFAULT_EVM.bsc.usdc;
  const normalizedAddress = getAddress(walletAddress);
  const normalizedUsdt = getAddress(usdt);
  const normalizedUsdc = getAddress(usdc);
  return {
    provider,
    usdt: new Contract(normalizedUsdt, ERC20_ABI, provider),
    usdc: new Contract(normalizedUsdc, ERC20_ABI, provider),
    address: normalizedAddress
  };
}

async function getSolConnection() {
  const { Connection } = await getSolana();
  const cacheKey = 'sol';
  const cached = providerCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < PROVIDER_TTL_MS) {
    return cached.provider;
  }

  const attempts = SOL_RPCS.map(async (rpc) => {
    const conn = new Connection(rpc, 'confirmed');
    await withTimeout(conn.getLatestBlockhash(), RPC_TIMEOUT_MS);
    return conn;
  });

  try {
    const connection = await firstSuccess(attempts);
    providerCache.set(cacheKey, { ts: Date.now(), provider: connection });
    return connection;
  } catch {
    const fallback = new Connection(SOL_RPCS[0], 'confirmed');
    providerCache.set(cacheKey, { ts: Date.now(), provider: fallback });
    return fallback;
  }
}

export async function getImportedBalances(wallet: ImportedWallet): Promise<ImportedBalances> {
  const balances: ImportedBalances = {
    eth: { native: 0, usdt: 0, usdc: 0 },
    bsc: { native: 0, usdt: 0, usdc: 0 },
    sol: { native: 0, usdt: 0, usdc: 0 }
  };

  const tasks: Promise<void>[] = [];

  if (wallet.evm) {
    tasks.push((async () => {
      const { formatEther, formatUnits, getAddress } = await getEthers();
      let walletAddress = wallet.evm.address;
      try {
        walletAddress = getAddress(wallet.evm.address);
      } catch {
        return;
      }

      const [ethProvider, bscProvider] = await Promise.all([
        getEvmProvider('eth'),
        getEvmProvider('bsc')
      ]);

      try {
        const ethBalanceRaw = await ethProvider.getBalance(walletAddress);
        balances.eth.native = Number(formatEther(ethBalanceRaw));
      } catch {
        balances.eth.native = 0;
      }

      try {
        const bscBalanceRaw = await bscProvider.getBalance(walletAddress);
        balances.bsc.native = Number(formatEther(bscBalanceRaw));
      } catch {
        balances.bsc.native = 0;
      }

      try {
        const ethTokens = await getEvmTokenContracts('eth', walletAddress);
        const [ethUsdtRaw, ethUsdtDec, ethUsdcRaw, ethUsdcDec] = await Promise.all([
          ethTokens.usdt.balanceOf(walletAddress),
          ethTokens.usdt.decimals(),
          ethTokens.usdc.balanceOf(walletAddress),
          ethTokens.usdc.decimals()
        ]);
        balances.eth.usdt = Number(formatUnits(ethUsdtRaw, ethUsdtDec));
        balances.eth.usdc = Number(formatUnits(ethUsdcRaw, ethUsdcDec));
      } catch {
        balances.eth.usdt = 0;
        balances.eth.usdc = 0;
      }

      try {
        const bscTokens = await getEvmTokenContracts('bsc', walletAddress);
        const [bscUsdtRaw, bscUsdtDec, bscUsdcRaw, bscUsdcDec] = await Promise.all([
          bscTokens.usdt.balanceOf(walletAddress),
          bscTokens.usdt.decimals(),
          bscTokens.usdc.balanceOf(walletAddress),
          bscTokens.usdc.decimals()
        ]);
        balances.bsc.usdt = Number(formatUnits(bscUsdtRaw, bscUsdtDec));
        balances.bsc.usdc = Number(formatUnits(bscUsdcRaw, bscUsdcDec));
      } catch {
        balances.bsc.usdt = 0;
        balances.bsc.usdc = 0;
      }
    })());
  }

  if (wallet.sol) {
    tasks.push((async () => {
    const { LAMPORTS_PER_SOL, PublicKey } = await getSolana();
    const connection = await getSolConnection();
    const solBalance = await connection.getBalance(new PublicKey(wallet.sol.address));
    balances.sol.native = Number((solBalance / LAMPORTS_PER_SOL).toFixed(6));

    const usdtMint = DEFAULT_SOL.usdt;
    const usdcMint = DEFAULT_SOL.usdc;
    const { getAssociatedTokenAddress, getAccount } = await getSplToken();

    const owner = new PublicKey(wallet.sol.address);
    const usdtAta = await getAssociatedTokenAddress(new PublicKey(usdtMint), owner);
    const usdcAta = await getAssociatedTokenAddress(new PublicKey(usdcMint), owner);

    try {
      const usdtAccount = await getAccount(connection, usdtAta);
      balances.sol.usdt = Number(usdtAccount.amount) / 1_000_000;
    } catch {
      balances.sol.usdt = 0;
    }

    try {
      const usdcAccount = await getAccount(connection, usdcAta);
      balances.sol.usdc = Number(usdcAccount.amount) / 1_000_000;
    } catch {
      balances.sol.usdc = 0;
    }
    })());
  }

  if (tasks.length) {
    await Promise.all(tasks);
  }

  return balances;
}

export async function sendImportedTransaction(params: {
  wallet: ImportedWallet;
  chain: 'eth' | 'bsc' | 'sol';
  asset: 'ETH' | 'BNB' | 'SOL' | 'USDT' | 'USDC';
  to: string;
  amount: number;
}) {
  const { wallet, chain, asset, to, amount } = params;
  if (amount <= 0) throw new Error('Invalid amount');

  if ((chain === 'eth' || chain === 'bsc') && wallet.evm) {
    const { parseEther, parseUnits, Contract, getAddress } = await getEthers();
    const provider = await getEvmProvider(chain);
    const evmWallet = wallet.evm.wallet.connect(provider);

    if (asset === 'ETH' || asset === 'BNB') {
      const toAddress = getAddress(to);
      const tx = await evmWallet.sendTransaction({ to: toAddress, value: parseEther(String(amount)) });
      return { txid: tx.hash };
    }

    const tokenAddress =
      asset === 'USDT'
        ? chain === 'eth'
          ? DEFAULT_EVM.eth.usdt
          : DEFAULT_EVM.bsc.usdt
        : chain === 'eth'
          ? DEFAULT_EVM.eth.usdc
          : DEFAULT_EVM.bsc.usdc;

    const toAddress = getAddress(to);
    const contract = new Contract(getAddress(tokenAddress), ERC20_ABI, evmWallet);
    const decimals = await contract.decimals();
    const tx = await contract.transfer(toAddress, parseUnits(String(amount), decimals));
    return { txid: tx.hash };
  }

  if (chain === 'sol' && wallet.sol) {
    const { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await getSolana();
    const connection = await getSolConnection();
    const sender = wallet.sol.keypair;
    const recipient = new PublicKey(to);

    if (asset === 'SOL') {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: sender.publicKey,
          toPubkey: recipient,
          lamports: Math.round(amount * LAMPORTS_PER_SOL)
        })
      );
      const sig = await connection.sendTransaction(tx, [sender]);
      return { txid: sig };
    }

    const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } = await getSplToken();
    const mint = new PublicKey(asset === 'USDT' ? DEFAULT_SOL.usdt : DEFAULT_SOL.usdc);
    const senderAta = await getAssociatedTokenAddress(mint, sender.publicKey);
    const recipientAta = await getAssociatedTokenAddress(mint, recipient);

    const instructions: any[] = [];
    const recipientInfo = await connection.getAccountInfo(recipientAta);
    if (!recipientInfo) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          sender.publicKey,
          recipientAta,
          recipient,
          mint
        )
      );
    }

    const decimals = 6;
    instructions.push(
      createTransferInstruction(
        senderAta,
        recipientAta,
        sender.publicKey,
        Math.round(amount * Math.pow(10, decimals))
      )
    );

    const tx = new Transaction().add(...instructions);
    const sig = await connection.sendTransaction(tx, [sender]);
    return { txid: sig };
  }

  throw new Error('Wallet not available for this chain');
}
