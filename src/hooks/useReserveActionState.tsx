import { ExternalLinkIcon } from '@heroicons/react/solid';
import { Trans } from '@lingui/macro';
import { Button, Stack, SvgIcon, Typography } from '@mui/material';
import { Link, ROUTES } from 'src/components/primitives/Link';
import { Warning } from 'src/components/primitives/Warning';
import { getEmodeMessage } from 'src/components/transactions/Emode/EmodeNaming';
import {
  ComputedReserveData,
  useAppDataContext,
} from 'src/hooks/app-data-provider/useAppDataProvider';
import { useAssetCaps } from 'src/hooks/useAssetCaps';
import { WalletEmptyInfo } from 'src/modules/dashboard/lists/SupplyAssetsList/WalletEmptyInfo';
import { useRootStore } from 'src/store/root';
import { assetCanBeBorrowedByUser } from 'src/utils/getMaxAmountAvailableToBorrow';
import { displayGhoForMintableMarket } from 'src/utils/ghoUtilities';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';

import { useModalContext } from './useModal';
const contractABI = [
  {
    "constant": false,
    "inputs": [
      {
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "mint",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "name": "",
        "type": "uint8"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];
interface ReserveActionStateProps {
  balance: string;
  maxAmountToSupply: string;
  maxAmountToBorrow: string;
  reserve: ComputedReserveData;
}
const mintTokens = async (library: ethers.providers.Web3Provider, underlyingAsset: string) => {
  try {
    const signer = library.getSigner();
    const contract = new ethers.Contract(underlyingAsset, contractABI, signer);

    const decimals = await contract.decimals();
    const amount = ethers.utils.parseUnits('100', decimals);

    const tx = await contract.mint(amount);
    await tx.wait();
    console.log('Mint successful');
    window.location.reload();
  } catch (error) {
    console.error('Error minting tokens', error);
  }
};
export const useReserveActionState = ({
  balance,
  maxAmountToSupply,
  maxAmountToBorrow,
  reserve,
}: ReserveActionStateProps) => {
  const { library } = useWeb3React<ethers.providers.Web3Provider>();
  const { user, eModes } = useAppDataContext();
  const { supplyCap, borrowCap, debtCeiling } = useAssetCaps();
  const [currentMarket, currentNetworkConfig, currentChainId, currentMarketData] = useRootStore(
    (store) => [
      store.currentMarket,
      store.currentNetworkConfig,
      store.currentChainId,
      store.currentMarketData,
    ]
  );
  const { openFaucet } = useModalContext();

  const { bridge, name: networkName } = currentNetworkConfig;

  const assetCanBeBorrowedFromPool = user ? assetCanBeBorrowedByUser(reserve, user) : false;
  const userHasNoCollateralSupplied = user?.totalCollateralMarketReferenceCurrency === '0';
  const isolationModeBorrowDisabled = user?.isInIsolationMode && !reserve.borrowableInIsolation;
  const eModeBorrowDisabled =
    user?.isInEmode && reserve.eModeCategoryId !== user.userEmodeCategoryId;

  const isGho = displayGhoForMintableMarket({ symbol: reserve.symbol, currentMarket });

  return {
    disableSupplyButton: balance === '0' || maxAmountToSupply === '0' || isGho,
    disableBorrowButton:
      !assetCanBeBorrowedFromPool ||
      userHasNoCollateralSupplied ||
      isolationModeBorrowDisabled ||
      eModeBorrowDisabled ||
      maxAmountToBorrow === '0',
    alerts: (
      <Stack gap={3}>
        {balance === '0' && !isGho && (
          <>
            {currentNetworkConfig.isTestnet ? (
              <Warning sx={{ mb: 0 }} severity="info" icon={false}>
                {currentMarketData.addresses.FAUCET ? (
                  <Button
                    variant="text"
                    href="https://faucet.circle.com/"
                    component={Link}
                    sx={{ verticalAlign: 'top' }}
                    disableRipple
                    endIcon={
                      <SvgIcon sx={{ width: 14, height: 14 }}>
                        <ExternalLinkIcon />
                      </SvgIcon>
                    }
                  >
                    <Typography variant="caption">
                      <Trans>{networkName} Faucet</Trans>
                    </Typography>
                  </Button>
                ) : (
                  <Button
                    variant="text"
                    sx={{ verticalAlign: 'top' }}
                    // onClick={() => openFaucet(reserve.underlyingAsset)}
                    onClick={() => library && mintTokens(library, reserve.underlyingAsset)}
                    disableRipple
                  >
                    <Typography variant="caption">
                      <Trans> Get free tokens from Faucet</Trans>
                    </Typography>
                  </Button>
                )}
              </Warning>
            ) : (
              <WalletEmptyInfo
                sx={{ mb: 0 }}
                name={networkName}
                bridge={bridge}
                icon={false}
                chainId={currentChainId}
              />
            )}
          </>
        )}

        {(balance !== '0' || isGho) && user?.totalCollateralMarketReferenceCurrency === '0' && (
          <Warning sx={{ mb: 0 }} severity="info" icon={false}>
            <Trans>To borrow you need to supply any asset to be used as collateral.</Trans>
          </Warning>
        )}

        {isolationModeBorrowDisabled && (
          <Warning sx={{ mb: 0 }} severity="warning" icon={false}>
            <Trans>Collateral usage is limited because of Isolation mode.</Trans>
          </Warning>
        )}

        {eModeBorrowDisabled && isolationModeBorrowDisabled && (
          <Warning sx={{ mb: 0 }} severity="info" icon={false}>
            <Trans>
              Borrowing is unavailable because you’ve enabled Efficiency Mode (E-Mode) and Isolation
              mode. To manage E-Mode and Isolation mode visit your{' '}
              <Link href={ROUTES.dashboard}>Dashboard</Link>.
            </Trans>
          </Warning>
        )}

        {eModeBorrowDisabled && !isolationModeBorrowDisabled && (
          <Warning sx={{ mb: 0 }} severity="info" icon={false}>
            <Trans>
              Borrowing is unavailable because you’ve enabled Efficiency Mode (E-Mode) for{' '}
              {getEmodeMessage(eModes[user.userEmodeCategoryId].label)} category. To manage E-Mode
              categories visit your <Link href={ROUTES.dashboard}>Dashboard</Link>.
            </Trans>
          </Warning>
        )}

        {!eModeBorrowDisabled && isolationModeBorrowDisabled && (
          <Warning sx={{ mb: 0 }} severity="info" icon={false}>
            <Trans>
              Borrowing is unavailable because you’re using Isolation mode. To manage Isolation mode
              visit your <Link href={ROUTES.dashboard}>Dashboard</Link>.
            </Trans>
          </Warning>
        )}

        {maxAmountToSupply === '0' &&
          supplyCap?.determineWarningDisplay({ supplyCap, icon: false, sx: { mb: 0 } })}
        {maxAmountToBorrow === '0' &&
          borrowCap?.determineWarningDisplay({ borrowCap, icon: false, sx: { mb: 0 } })}
        {reserve.isIsolated &&
          balance !== '0' &&
          user?.totalCollateralUSD !== '0' &&
          debtCeiling?.determineWarningDisplay({ debtCeiling, icon: false, sx: { mb: 0 } })}
      </Stack>
    ),
  };
};
