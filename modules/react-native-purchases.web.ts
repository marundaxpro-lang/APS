/**
 * Web stub for react-native-purchases (RevenueCat).
 * All functions are no-ops on web — the SubscriptionContext handles web separately.
 */

export enum LOG_LEVEL {
  VERBOSE = 'VERBOSE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SILENT = 'SILENT',
}

export interface CustomerInfo {
  entitlements: {
    active: Record<string, unknown>;
    all: Record<string, unknown>;
  };
}

export interface PurchasesOfferings {
  current: PurchasesOffering | null;
  all: Record<string, PurchasesOffering>;
}

export interface PurchasesOffering {
  identifier: string;
  serverDescription: string;
  availablePackages: PurchasesPackage[];
  lifetime: PurchasesPackage | null;
  annual: PurchasesPackage | null;
  sixMonth: PurchasesPackage | null;
  threeMonth: PurchasesPackage | null;
  twoMonth: PurchasesPackage | null;
  monthly: PurchasesPackage | null;
  weekly: PurchasesPackage | null;
}

export interface PurchasesStoreProduct {
  productIdentifier: string;
  localizedDescription: string;
  localizedTitle: string;
  price: number;
  priceString: string;
  currencyCode: string;
  title: string;
  description: string;
}

export interface PurchasesPackage {
  identifier: string;
  packageType: string;
  product: PurchasesStoreProduct;
  offeringIdentifier: string;
}

const Purchases = {
  configure: (_options: { apiKey: string }): void => {},
  setLogLevel: (_level: LOG_LEVEL): void => {},
  getOfferings: async (): Promise<PurchasesOfferings> => ({
    current: null,
    all: {},
  }),
  getCustomerInfo: async (): Promise<CustomerInfo> => ({
    entitlements: { active: {}, all: {} },
  }),
  purchasePackage: async (_pkg: PurchasesPackage): Promise<{ customerInfo: CustomerInfo }> => ({
    customerInfo: { entitlements: { active: {}, all: {} } },
  }),
  restorePurchases: async (): Promise<CustomerInfo> => ({
    entitlements: { active: {}, all: {} },
  }),
  logIn: async (_userId: string): Promise<{ customerInfo: CustomerInfo; created: boolean }> => ({
    customerInfo: { entitlements: { active: {}, all: {} } },
    created: false,
  }),
  logOut: async (): Promise<CustomerInfo> => ({
    entitlements: { active: {}, all: {} },
  }),
  addCustomerInfoUpdateListener: (_listener: (info: CustomerInfo) => void): { remove: () => void } => ({
    remove: () => {},
  }),
};

export default Purchases;
