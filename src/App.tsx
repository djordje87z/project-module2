
// importfunctionalities
import React from 'react';
import logo from './logo.svg';
import './App.css';
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {useEffect , useState } from "react";

import * as buffer from "buffer";
window.Buffer = buffer.Buffer;

const TRANSACTION_FEE = 5000;

// create types
type DisplayEncoding = "utf8" | "hex";

type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

// create a provider interface (hint: think of this as an object) to store the Phantom Provider
interface PhantomProvider {
  publicKey: PublicKey;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

/**
 * @description gets Phantom provider, if it exists
 */
 const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};

function App() {
  // create state variable for the secretKey
  const [secretKey, setKeypair] = useState<Uint8Array>(PublicKey.default.toBytes());
  const [solanaAcc, setAccount] = useState<boolean | undefined>(undefined);
  // create state variable for the provider
  const [provider, setProvider] = useState<PhantomProvider | undefined>(
    undefined
  );

	// create state variable for the wallet key
  const [walletKey, setWalletKey] = useState<PhantomProvider | undefined>(
  undefined
);

  // this is the function that runs whenever the component updates (e.g. render, refresh)
  useEffect(() => {
	  const provider = getProvider();

		// if the phantom provider exists, set this as the provider
	  if (provider) setProvider(provider);
	  else setProvider(undefined);
  }, []);

  /**
   * @description prompts user to connect wallet if it exists.
	 * This function is called when the connect wallet button is clicked
   */
  const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

		// checks if phantom wallet exists
    if (solana) {
      try {
				// connects wallet and returns response which includes the wallet public key
        const response = await solana.connect();
        console.log('wallet account ', response.publicKey.toString());
				// update walletKey to be the public key
        setWalletKey(response.publicKey.toString());
      } catch (err) {
      // { code: 4001, message: 'User rejected the request.' }
      }
    }
  };

  const createSolanaAccount = async () => {
    try {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const newPair = Keypair.generate();
      // Airdrops 2 SOL to the newly created Keypair
      const airDropSignature = await connection.requestAirdrop(
        newPair.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      // Latest blockhash (unique identifer of the block) of the cluster
      let latestBlockHash = await connection.getLatestBlockhash();
      // Confirm transaction using the last valid block height (refers to its time)
      // to check for transaction expiration
      await connection.confirmTransaction({
          blockhash: latestBlockHash.blockhash,
          lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
          signature: airDropSignature
      });
      setKeypair(newPair.secretKey);
      setAccount(true);
      const balance = await connection.getBalance(newPair.publicKey);
      console.log("newly created Keypair with pubkey ", newPair.publicKey.toString());
      console.log("balance is ", balance / LAMPORTS_PER_SOL, " SOL");
    } catch (err) {
      // { code: 4001, message: 'User rejected the request.' }
    }
  };

  const transferToWallet = async () => {
    try {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const from = Keypair.fromSecretKey(secretKey);
      if(provider?.publicKey === undefined) throw new Error('Phantom wallet undefined!');
      const TransactionInstruction = SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: provider.publicKey,
        lamports: (2 * LAMPORTS_PER_SOL - TRANSACTION_FEE)
      });
      // Send money from "from" wallet and into "to" wallet
      var transaction = new Transaction().add(TransactionInstruction);
      // Sign transaction
      var signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [from]
      );
      setAccount(false);
      setWalletKey(undefined);
    } catch (err) {
      // { code: 4001, message: 'User rejected the request.' }
      console.error(err);
    }
  };

	// HTML code for the app
  return (
    <div className="App">
      <header className="App-header">
        <h2>Project for Module 2</h2>
      </header>
      {!solanaAcc && (
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={createSolanaAccount}
          >
            Create a new Solana account
          </button>
        )}
      {solanaAcc && provider && !walletKey && (
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={connectWallet}
          >
            Connect Wallet
          </button>
        )}
        {provider && walletKey && (
          <button
          style={{
            fontSize: "16px",
            padding: "15px",
            fontWeight: "bold",
            borderRadius: "5px",
          }}
          onClick={transferToWallet}
        >
          Transfer to new wallet
        </button>
                )}

        {!provider && (
          <p>
            No provider found. Install{" "}
            <a href="https://phantom.app/">Phantom Browser extension</a>
          </p>
        )}
    </div>
  );
}

export default App;
