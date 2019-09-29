/*
  Mint additional tokens. Provide the TXID generated by the create-token example.
*/

import SLPSDK from "slp-sdk";

// Set NETWORK to either testnet or mainnet
const NETWORK = process.env.NETWORK

// Used for debugging and investigating JS objects.
const util = require("util")
util.inspect.defaultOptions = { depth: 1 }

// Instantiate SLP based on the network.
let SLP
if (NETWORK === `mainnet`)
  SLP = new SLPSDK({ restURL: `https://rest.bitcoin.com/v2/` })
else SLP = new SLPSDK({ restURL: `https://trest.bitcoin.com/v2/` })

export async function mintToken(walletInfo, { tokenId, quantity, baton }) {
  try {
    const mnemonic = walletInfo.mnemonic

    // root seed buffer
    const rootSeed = SLP.Mnemonic.toSeed(mnemonic)
    // master HDNode
    let masterHDNode
    if (NETWORK === `mainnet`) masterHDNode = SLP.HDNode.fromSeed(rootSeed)
    else masterHDNode = SLP.HDNode.fromSeed(rootSeed, "testnet") // Testnet

    // HDNode of BIP44 account
    const account = SLP.HDNode.derivePath(masterHDNode, "m/44'/145'/0'")

    const change = SLP.HDNode.derivePath(account, "0/0")

    // get the cash address
    const cashAddress = SLP.HDNode.toCashAddress(change)
    const slpAddress = SLP.Address.toSLPAddress(cashAddress)

    const fundingAddress = slpAddress
    const fundingWif = SLP.HDNode.toWIF(change) // <-- compressed WIF format
    const tokenReceiverAddress = slpAddress
    const batonReceiverAddress = baton || slpAddress;
    const bchChangeReceiverAddress = cashAddress

    // Create a config object for minting
    const mintConfig = {
      fundingAddress,
      fundingWif,
      tokenReceiverAddress,
      batonReceiverAddress,
      bchChangeReceiverAddress,
      tokenId,
      additionalTokenQty: quantity
    }

    // Generate, sign, and broadcast a hex-encoded transaction for creating
    // the new token.
    const mintTxId = await SLP.TokenType1.mint(mintConfig)

    console.log(`mintTxId: ${util.inspect(mintTxId)}`)

    console.log(`\nView this transaction on the block explorer:`)
    let link;
    if (NETWORK === `mainnet`) {
      link = `https://explorer.bitcoin.com/bch/tx/${mintTxId}`;
    } else {
      link = `https://explorer.bitcoin.com/tbch/tx/${mintTxId}`;
    }
    console.log(link)

    return link;
  } catch (err) {
    console.error(`Error in mintToken: `, err)
    console.log(`Error message: ${err.message}`)
    throw err
  }
}
