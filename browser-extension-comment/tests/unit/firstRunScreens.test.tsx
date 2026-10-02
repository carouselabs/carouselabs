// Sign-in says it is waiting once the sign-in tab is open; onboarding moves
// forward and back and records completion.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SignInScreen } from "@/sidepanel/components/SignInScreen";
import { Onboarding, ONBOARDING_DONE_STORAGE_KEY } from "@/sidepanel/components/Onboarding";
import { chromeMock } from "../setup/chrome";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Sign-in screen", () => {
  it("opens sign-in in a tab and then says it is waiting", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    render(<SignInScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(chromeMock().tabs.create).toHaveBeenCalledWith({ url: expect.stringMatching(/\/extension-connect$/) }),
    );
    expect(await screen.findByText("Waiting for sign-in")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open sign-in again" })).toBeTruthy();
  });
});

describe("Onboarding", () => {
  it("steps forward and back, then records completion", async () => {
    const onFinish = vi.fn();
    const onCreateProfile = vi.fn();
    render(<Onboarding onFinish={onFinish} onCreateProfile={onCreateProfile} />);

    expect(screen.getByRole("img", { name: "Step 1 of 3" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("img", { name: "Step 2 of 3" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Click Comment, then Generate")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("How do you want to start?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Create my profile now/ }));
    expect(onCreateProfile).toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalled();
    await waitFor(() => expect(chromeMock().__store[ONBOARDING_DONE_STORAGE_KEY]).toBe(true));
  });
});
