import { expect } from "vitest";
import { DomainError, type ErrorCode } from "@/lib/errors";

export function expectCode(fn: () => unknown, code: ErrorCode): void {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DomainError);
    expect((e as DomainError).code).toBe(code);
    return;
  }
  expect.fail(`expected DomainError ${code} but nothing was thrown`);
}

export async function expectCodeAsync(promise: Promise<unknown>, code: ErrorCode): Promise<void> {
  try {
    await promise;
  } catch (e) {
    expect(e).toBeInstanceOf(DomainError);
    expect((e as DomainError).code).toBe(code);
    return;
  }
  expect.fail(`expected DomainError ${code} but promise resolved`);
}
