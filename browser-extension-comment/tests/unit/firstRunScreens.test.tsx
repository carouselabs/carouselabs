// Sign-in says it is waiting once the sign-in tab is open; onboarding moves
// forward and back and records completion; the Insert warning keeps keyboard
// focus inside itself, gives it back when it closes, and doesn't steal it
// when the screen behind re-renders.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { SignInScreen } from "@/sidepanel/components/SignInScreen";
import { Onboarding, ONBOARDING_DONE_STORAGE_KEY } from "@/sidepanel/components/Onboarding";
import { InsertWarningModal } from "@/sidepanel/components/InsertWarningModal";
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

describe("Insert warning", () => {
  // The Home screen, reduced to what matters: an Insert button that opens the
  // warning, and a parent that re-renders with a new onDismiss each time.
  function Harness({ onDismissSpy }: { onDismissSpy: () => void }) {
    const [open, setOpen] = useState(false);
    const [, setTick] = useState(0);
    return (
      <>
        <button onClick={() => setOpen(true)}>Insert</button>
        <button onClick={() => setTick((n) => n + 1)}>Re-render</button>
        {open && (
          <InsertWarningModal
            onCopyInstead={() => setOpen(false)}
            onInsertAnyway={() => setOpen(false)}
            onDismiss={() => {
              onDismissSpy();
              setOpen(false);
            }}
          />
        )}
      </>
    );
  }

  it("keeps focus inside, gives it back on close, and closes on Escape", () => {
    const onDismiss = vi.fn();
    render(<Harness onDismissSpy={onDismiss} />);
    const insert = screen.getByRole("button", { name: "Insert" });
    insert.focus();
    fireEvent.click(insert);

    const copy = screen.getByRole("button", { name: "Copy instead" });
    const anyway = screen.getByRole("button", { name: "Insert anyway" });
    const dialog = screen.getByRole("dialog");
    expect(document.activeElement).toBe(copy);

    anyway.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("checkbox"));

    screen.getByRole("checkbox").focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(anyway);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(insert);
  });

  it("doesn't pull focus back to Copy when the screen behind re-renders", () => {
    render(<Harness onDismissSpy={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Insert" }));
    const checkbox = screen.getByRole("checkbox");
    checkbox.focus();

    fireEvent.click(screen.getByRole("button", { name: "Re-render", hidden: true }));
    expect(document.activeElement).toBe(checkbox);
  });

  it("closes when the dimmed area outside it is clicked", () => {
    const onDismiss = vi.fn();
    render(<Harness onDismissSpy={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Insert" }));

    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
