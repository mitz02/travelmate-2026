export interface Plan {
  id: string; // unique identifier
  service: string; // e.g. 'mtn-data', 'airtel-data', 'airtime', 'electricity', 'dstv', 'gotv', 'startimes', 'showmax'
  name: string; // human readable name
  variation_code: string;
  price: number; // price in Naira
  apiType?: 'bardetech';
  network?: string;
  mode?: 'sandbox' | 'live';
  volume?: string;
  validity?: string;
  planType?: string;
  sellingPrice?: number;
  apiPrice?: number;
  cashbackType?: 'fixed' | 'percentage';
  cashbackValue?: number;
  externalId?: string; // e.g., Bardetech data_id
  isSaved?: boolean; // indicates if the admin has explicitly configured/saved this plan
}
