"use client"

import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import type { MENUS } from "./Navbar"

/** Loaded on demand from Navbar the first time the menu button is tapped. */
export function MobileMenu({
  open,
  onOpenChange,
  menus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  menus: typeof MENUS
}) {
  const close = () => onOpenChange(false)
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent title="Menu" className="font-ui">
        <div className="flex flex-col gap-6">
          {menus.map((menu) =>
            "items" in menu ? (
              <section key={menu.label} aria-label={menu.label} className="flex flex-col">
                <h2 className="mb-1 text-caption font-medium text-muted-foreground">{menu.label}</h2>
                {menu.items.map((item) => (
                  <a key={item.href} href={item.href} onClick={close} className="flex h-11 items-center text-body text-foreground">
                    {item.label}
                  </a>
                ))}
              </section>
            ) : (
              <a key={menu.label} href={menu.href} onClick={close} className="flex h-11 items-center text-body font-medium text-foreground">
                {menu.label}
              </a>
            )
          )}
          <Link href="/sign-in" className={buttonVariants({ variant: "outline" })}>
            Sign in
          </Link>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
