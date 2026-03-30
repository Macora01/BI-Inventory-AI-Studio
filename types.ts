// types.ts

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

export interface Product {
  id_venta: string;
  price: number;
  cost: number;
  id_fabrica: string;
  description: string;
}

export interface Stock {
  productId: string;
  locationId: string;
  quantity: number;
  criticalStock?: number;
}

export enum MovementType {
  INITIAL_LOAD = 'INITIAL_LOAD',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  SALE = 'SALE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export interface Movement {
  id: string;
  productId: string;
  quantity: number;
  type: MovementType;
  fromLocationId?: string;
  toLocationId?: string;
  timestamp: Date;
  relatedFile?: string;
  price?: number;
  cost?: number;
}

export enum LocationType {
    MAIN_WAREHOUSE = 'MAIN_WAREHOUSE',
    FIXED_STORE_PERMANENT = 'FIXED_STORE_PERMANENT',
    FIXED_STORE_TEMPORARY = 'FIXED_STORE_TEMPORARY',
    INDIRECT_STORE = 'INDIRECT_STORE',
    WEB_STORE = 'WEB_STORE',
}

export const LOCATION_TYPE_MAP: Record<LocationType, string> = {
    [LocationType.MAIN_WAREHOUSE]: 'Bodega Principal',
    [LocationType.FIXED_STORE_PERMANENT]: 'Tienda Fija Permanente',
    [LocationType.FIXED_STORE_TEMPORARY]: 'Tienda Fija Temporal',
    [LocationType.INDIRECT_STORE]: 'Punto de Venta Indirecto',
    [LocationType.WEB_STORE]: 'Tienda Web',
};

export interface Location {
  id: string;
  name: string;
  type: LocationType;
}

export interface ParsedInitialInventory {
  id_venta: string;
  price: number;
  cost: number;
  id_fabrica: string;
  qty: number;
  description: string;
}

export interface ParsedTransfer {
  cod_venta: string;
  description: string;
  precio: number;
  qty: number;
}

export interface ParsedSale {
  timestamp: string;
  lugar: string;
  cod_fabrica: string;
  cod_venta: string;
  description: string;
  precio: number;
}

export interface GeminiInsight {
  title: string;
  insight: string;
  recommendation: string;
}