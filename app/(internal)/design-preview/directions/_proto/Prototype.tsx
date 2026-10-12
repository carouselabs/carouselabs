"use client"

import { Frame, type Device, type Direction, type Screen } from "./Frame"
import { DestinationStub } from "./shared"
import type { DestinationId } from "./nav"
import { ShellA } from "./a/ShellA"
import { LandingA } from "./a/LandingA"
import { GenerateA } from "./a/GenerateA"
import { CreateA } from "./a/CreateA"
import { ShellB } from "./b/ShellB"
import { LandingB } from "./b/LandingB"
import { GenerateB } from "./b/GenerateB"
import { CreateB } from "./b/CreateB"

function renderA(screen: Screen) {
  if (screen === "landing") return <LandingA />
  if (screen === "create") return <CreateA />
  if (screen === "generate")
    return (
      <ShellA active="generate">
        <GenerateA />
      </ShellA>
    )
  const id = screen.slice(5) as DestinationId
  return (
    <ShellA active={id}>
      <DestinationStub id={id} />
    </ShellA>
  )
}

function renderB(screen: Screen) {
  if (screen === "landing") return <LandingB />
  if (screen === "create") return <CreateB />
  if (screen === "generate") return <GenerateB />
  const id = screen.slice(5) as DestinationId
  return (
    <ShellB active={id}>
      <DestinationStub id={id} />
    </ShellB>
  )
}

export function Prototype({
  direction,
  screen,
  device,
  theme,
}: {
  direction: Direction
  screen: Screen
  device: Device
  theme: "light" | "dark"
}) {
  return (
    <Frame direction={direction} initialScreen={screen} initialDevice={device} initialTheme={theme}>
      {(s) => (direction === "a" ? renderA(s) : renderB(s))}
    </Frame>
  )
}
