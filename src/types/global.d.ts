/// <reference types="svelte" />

declare module '*.svg' {
  const content: unknown;
  export default content;
}

declare global {
  interface Window {
    postMessage<T>(message: T, targetOrigin: string, transfer?: Transferable[]): void;
    postMessage<T>(message: T, options?: WindowPostMessageOptions): void;
  }
}

export const window: Window;
// declare global {
//   interface parent {
//     postMessage<T>(message: T, targetOrigin: string, transfer?: Transferable[]): void;
//     postMessage<T>(message: T, options?: WindowPostMessageOptions): void;
//   }
// }

