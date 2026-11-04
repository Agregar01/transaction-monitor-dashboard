import { describe, it, expect } from "vitest";
import { errorMessage } from "@/lib/errors";

describe("errorMessage", () => {
  it("falls back for nullish input", () => {
    expect(errorMessage(null)).toBe("Request failed");
    expect(errorMessage(undefined, "Custom fallback")).toBe("Custom fallback");
  });

  it("returns a plain string error as-is", () => {
    expect(errorMessage("boom")).toBe("boom");
  });

  it("returns an Error's message", () => {
    expect(errorMessage(new Error("network down"))).toBe("network down");
  });

  it("extracts FastAPI's { detail: string } shape", () => {
    expect(errorMessage({ status: 400, data: { detail: "Bad request" } })).toBe("Bad request");
  });

  it("extracts the first message from pydantic validation errors", () => {
    expect(
      errorMessage({
        status: 422,
        data: { detail: [{ msg: "Field required", loc: ["body", "email"] }] },
      }),
    ).toBe("Field required");
  });

  it("extracts a custom exception shape { detail: { message } }", () => {
    expect(
      errorMessage({ status: 400, data: { detail: { message: "Simulation failed", errors: [] } } }),
    ).toBe("Simulation failed");
  });

  it("extracts the global exception-handler shape { error: { message, request_id } }, appending a short ref", () => {
    expect(
      errorMessage({
        status: 500,
        data: {
          error: {
            message: "Internal server error",
            category: "system",
            request_id: "4a922f5e-d850-4eea-b79e-c95746ad741e",
          },
        },
      }),
    ).toBe("Internal server error (ref 4a922f5e)");
  });

  it("extracts { error: { message } } without a request_id", () => {
    expect(errorMessage({ data: { error: { message: "Service unavailable" } } })).toBe(
      "Service unavailable",
    );
  });

  it("extracts a plain string data.error", () => {
    expect(errorMessage({ data: { error: "Not allowed" } })).toBe("Not allowed");
  });

  it("falls back to the generic message for an unrecognized shape", () => {
    expect(errorMessage({ status: 500, data: { foo: "bar" } })).toBe("Request failed");
  });
});
