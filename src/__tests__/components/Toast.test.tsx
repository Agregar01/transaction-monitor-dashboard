import { render, screen, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ToastContainer, { showToast } from "@/components/Toast";

describe("ToastContainer", () => {
  it("renders nothing when no toasts", () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it("renders toast when showToast is called", () => {
    render(<ToastContainer />);
    act(() => {
      showToast({ type: "success", title: "Done", message: "Operation successful" });
    });
    expect(screen.getByText("Operation successful")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders error toast", () => {
    render(<ToastContainer />);
    act(() => {
      showToast({ type: "error", title: "Error", message: "Something failed" });
    });
    expect(screen.getByText("Something failed")).toBeInTheDocument();
  });

  it("has dismiss button with aria-label after adding toast", () => {
    render(<ToastContainer />);
    act(() => {
      showToast({ type: "success", title: "Test", message: "Test message" });
    });
    const dismissBtn = screen.getByLabelText("Dismiss");
    expect(dismissBtn).toBeInTheDocument();
  });
});
