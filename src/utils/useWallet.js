/* eslint-disable react-hooks/exhaustive-deps */

import React, { useEffect, useState } from "react";
import Paragraph from "antd/lib/typography/Paragraph";
import { notification } from "antd";
import Big from "big.js";
import { getWallet, createWallet } from "./createWallet";
import usePrevious from "./usePrevious";
import withSLP from "./withSLP";
import getSlpBanlancesAndUtxos from "./getSlpBanlancesAndUtxos";

const normalizeSlpBalancesAndUtxos = (SLP, slpBalancesAndUtxos, wallet) => {
  slpBalancesAndUtxos.nonSlpUtxos.forEach(utxo => {
    const derivatedAccount = wallet.Accounts.find(account => account.cashAddress === utxo.address);
    utxo.wif = derivatedAccount.fundingWif;
  });

  return slpBalancesAndUtxos;
};

const normalizeBalance = (SLP, slpBalancesAndUtxos) => {
  const totalBalanceInSatohis = slpBalancesAndUtxos.nonSlpUtxos.reduce(
    (previousBalance, utxo) => previousBalance + utxo.satoshis,
    0
  );
  return {
    totalBalanceInSatohis,
    totalBalance: SLP.BitcoinCash.toBitcoinCash(totalBalanceInSatohis)
  };
};

const update = withSLP(async (SLP, { wallet, setBalances, setTokens, setSlpBalancesAndUtxos }) => {
  try {
    if (!wallet) {
      return;
    }
    const slpBalancesAndUtxos = await getSlpBanlancesAndUtxos(wallet.cashAddresses);
    const { tokens } = slpBalancesAndUtxos;

    setSlpBalancesAndUtxos(normalizeSlpBalancesAndUtxos(SLP, slpBalancesAndUtxos, wallet));
    setBalances(normalizeBalance(SLP, slpBalancesAndUtxos));
    setTokens(tokens);
  } catch (error) {}
});

export const useWallet = () => {
  const [wallet, setWallet] = useState(getWallet());
  const [balances, setBalances] = useState({});
  const [tokens, setTokens] = useState([]);
  const [slpBalancesAndUtxos, setSlpBalancesAndUtxos] = useState([]);
  const [loading, setLoading] = useState(true);

  const previousBalances = usePrevious(balances);

  if (
    previousBalances &&
    balances &&
    "totalBalance" in previousBalances &&
    "totalBalance" in balances &&
    new Big(balances.totalBalance).minus(previousBalances.totalBalance).gt(0)
  ) {
    notification.success({
      message: "BCH",
      description: (
        <Paragraph>
          You received {Number(balances.totalBalance - previousBalances.totalBalance).toFixed(8)}{" "}
          BCH!
        </Paragraph>
      ),
      duration: 2
    });
  }

  useEffect(() => {
    const updateRoutine = () => {
      update({
        wallet: getWallet(),
        setBalances,
        setTokens,
        setSlpBalancesAndUtxos
      }).finally(() => {
        setLoading(false);
        setTimeout(updateRoutine, 5000);
      });
    };

    updateRoutine();
  }, []);

  return {
    wallet,
    slpBalancesAndUtxos,
    balances,
    tokens,
    loading,
    update: () =>
      update({
        wallet: getWallet(),
        setBalances,
        setTokens,
        setLoading,
        setSlpBalancesAndUtxos
      }),
    createWallet: importMnemonic => {
      setLoading(true);
      const newWallet = createWallet(importMnemonic);
      setWallet(newWallet);
      update({
        wallet: newWallet,
        setBalances,
        setTokens,
        setSlpBalancesAndUtxos
      }).finally(() => setLoading(false));
    }
  };
};
