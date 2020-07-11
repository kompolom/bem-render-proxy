export interface iBEMXJST {
  apply: (object) => unknown;
  BEMContext: () => void;
}

export interface iBEMTREE extends iBEMXJST {
  apply: (object) => Record<string, unknown>;
}

export interface iBEMHTML extends iBEMXJST {
  apply: (object) => string;
}
