import {
  LegacyUiPoolDataProvider,
  ReservesDataHumanized,
  UiPoolDataProvider,
  UserReserveDataHumanized,
} from '@aave/contract-helpers';
import { ReserveDataHumanized } from '@aave/contract-helpers/src/v3-UiPoolDataProvider-contract/types';
import { Provider } from '@ethersproject/providers';
import { MarketDataType } from 'src/ui-config/marketsConfig';

export type UserReservesDataHumanized = {
  userReserves: UserReserveDataHumanized[];
  userEmodeCategoryId: number;
};

export class UiPoolService {
  constructor(private readonly getProvider: (chainId: number) => Provider) {}

  private async getUiPoolDataService(marketData: MarketDataType) {
    const provider = this.getProvider(marketData.chainId);
    if (this.useLegacyUiPoolDataProvider(marketData)) {
      return new LegacyUiPoolDataProvider({
        uiPoolDataProviderAddress: marketData.addresses.UI_POOL_DATA_PROVIDER,
        provider,
        chainId: marketData.chainId,
      });
    } else {
      return new UiPoolDataProvider({
        uiPoolDataProviderAddress: marketData.addresses.UI_POOL_DATA_PROVIDER as string,
        provider,
        chainId: marketData.chainId,
      });
    }
  }

  private useLegacyUiPoolDataProvider(marketData: MarketDataType) {
    if (
      !marketData.v3 ||
      marketData.marketTitle === 'Fantom' ||
      marketData.marketTitle === 'Harmony' ||
      marketData.marketTitle === 'Piccadilly'
    ) {
      // it's a v2 market, or it does not have v3.1 upgrade
      return true;
    }

    return false;
  }

  async getReservesHumanized(marketData: MarketDataType): Promise<ReservesDataHumanized> {
    const uiPoolDataProvider = await this.getUiPoolDataService(marketData);
    const reservesHumanized = await uiPoolDataProvider.getReservesHumanized({
      lendingPoolAddressProvider: marketData.addresses.LENDING_POOL_ADDRESS_PROVIDER,
    });
    const reservesData: ReserveDataHumanized[] = [];
    // Dirty way to display only USDC
    reservesHumanized.reservesData.forEach((key) => {
      if ('USDC' === key.name) {
        reservesData.push(key);
      }
    });
    if ('piccadilly' === marketData.market) {
      reservesHumanized.reservesData = reservesData;
    }

    return reservesHumanized;
  }

  async getUserReservesHumanized(
    marketData: MarketDataType,
    user: string
  ): Promise<UserReservesDataHumanized> {
    const uiPoolDataProvider = await this.getUiPoolDataService(marketData);
    return uiPoolDataProvider.getUserReservesHumanized({
      user,
      lendingPoolAddressProvider: marketData.addresses.LENDING_POOL_ADDRESS_PROVIDER,
    });
  }
}
