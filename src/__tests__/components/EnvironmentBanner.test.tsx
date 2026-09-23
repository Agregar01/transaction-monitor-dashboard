import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EnvironmentBanner from "@/components/EnvironmentBanner";

describe("EnvironmentBanner", () => {
  it.each([["production"], ["Production "], [""], [undefined]])(
    "renders nothing for %j",
    (environment) => {
      const { container } = render(<EnvironmentBanner environment={environment} />);
      expect(container).toBeEmptyDOMElement();
    },
  );

  it.each([["staging"], ["preview"], ["development"]])(
    "labels the %s console so it is not mistaken for live",
    (environment) => {
      render(<EnvironmentBanner environment={environment} />);
      const banner = screen.getByRole("status");
      expect(banner).toHaveTextContent(new RegExp(environment, "i"));
      expect(banner).toHaveTextContent(/test data/i);
    },
  );
});
