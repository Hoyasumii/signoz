import type { RequestOptions } from "./transport";

/** With `{ raw: true }` the method returns the `Response`; otherwise, the result of the operation's mode. */
export type Result<O extends RequestOptions, T> = O extends { raw: true } ? Response : T;
