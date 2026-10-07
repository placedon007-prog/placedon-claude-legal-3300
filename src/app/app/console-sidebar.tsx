"use client";

/**
 * The console's navigation.
 *
 * Desktop: an icon rail by default, every icon with a tooltip; the toggle expands it to
 * labelled links with this browser's threads, and the choice is remembered per browser.
 * Below 768px: a top bar whose menu button opens the same content in a left sheet.
 */
import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Archive,
  CalendarDays,
  FileCheck2,
  FileSearch,
  History,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Search,
  SquarePen,
  Table2,
  UserRound,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PlacedonMark } from "@/components/brand/placedon-mark";
import { groupThreads, type LocalThread } from "@/lib/thread";
import {
  forgetActivity,
  useActivity,
  useDisplayName,
  useLocalThreads,
  useNicknamesOn,
  useSidebarExpanded,
} from "./local-store";
import { NameDialog } from "./welcome";
import { PERSONA_NAME, PERSONA_REASON, persona } from "@/lib/greeting";
import { logoutAction } from "./actions";

const LINKS = [
  { href: "/app", label: "Ask", icon: MessageSquare },
  // The route stays /app/vault so links and the backend's vault.* verbs are unchanged.
  { href: "/app/vault", label: "Wall System", icon: Archive },
  { href: "/app/document-check", label: "Document Check", icon: FileCheck2 },
  { href: "/app/contracts", label: "Contracts", icon: FileSearch },
  { href: "/app/tables", label: "Review tables", icon: Table2 },
  { href: "/app/drafts", label: "Drafts", icon: PenLine },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/app/runs", label: "Runs", icon: History },
] as const;

const item =
  "flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-body text-fg-2 transition-colors duration-150 hover:bg-wash-2 hover:text-fg aria-[current=page]:bg-wash-2 aria-[current=page]:font-medium aria-[current=page]:text-fg";
const iconOnly =
  "grid size-11 place-items-center rounded-lg text-fg-2 transition-colors duration-150 hover:bg-wash-2 hover:text-fg aria-[current=page]:bg-wash-2 aria-[current=page]:text-fg";

function Tip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function useCurrent() {
  const path = usePathname();
  return (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));
}

export function ConsoleSidebar({ passcode }: { passcode: boolean }) {
  const [expanded, setExpanded] = useSidebarExpanded();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <>
      {/* phone and small tablet */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-line bg-ground px-2 md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button type="button" className={iconOnly} aria-label="Open navigation">
              <Menu className="size-5" aria-hidden />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[288px] gap-0 bg-wash p-3 pt-14"
            // Following any link inside closes the sheet.
            onClickCapture={(e) => {
              if ((e.target as HTMLElement).closest("a")) setSheetOpen(false);
            }}
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Expanded passcode={passcode} />
          </SheetContent>
        </Sheet>
        <Brand />
        <Link href="/app" aria-label="New question" className={cn(iconOnly, "ml-auto")}>
          <SquarePen className="size-5" aria-hidden />
        </Link>
      </header>

      {/* desktop: the outer column carries the wash and rule down the whole page; the
          inner aside sticks to the viewport. */}
      <div className="hidden flex-none border-r border-line bg-wash md:block">
        <aside
          aria-label="Console"
          className={cn(
            "sticky top-0 flex h-dvh flex-col",
            expanded ? "w-[264px] p-3" : "w-14 items-center px-1.5 py-3",
          )}
        >
          <div className={cn("flex items-center", expanded ? "justify-between pl-1" : "flex-col gap-1")}>
            {expanded ? <Brand /> : <BrandMark />}
            <Tip label={expanded ? "Collapse sidebar" : "Expand sidebar"}>
              <button
                type="button"
                className={iconOnly}
                aria-expanded={expanded}
                aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <PanelLeftClose className="size-[18px]" aria-hidden />
                ) : (
                  <PanelLeftOpen className="size-[18px]" aria-hidden />
                )}
              </button>
            </Tip>
          </div>
          {expanded ? <Expanded passcode={passcode} /> : <Rail passcode={passcode} />}
        </aside>
      </div>
    </>
  );
}

function BrandMark() {
  return <PlacedonMark className="size-7 flex-none text-fg" />;
}

function Brand() {
  return (
    <span className="flex items-center gap-2 text-body font-semibold tracking-[-0.01em]">
      <BrandMark />
      Placedon
    </span>
  );
}

function Rail({ passcode }: { passcode: boolean }) {
  const current = useCurrent();
  return (
    <nav aria-label="Console" className="mt-2 flex flex-1 flex-col items-center gap-0.5">
      <Tip label="New question">
        <Link href="/app" className={iconOnly} aria-label="New question">
          <SquarePen className="size-[18px]" aria-hidden />
        </Link>
      </Tip>
      <span aria-hidden className="my-2 h-px w-6 bg-line" />
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Tip key={href} label={label}>
          <Link href={href} className={iconOnly} aria-label={label} aria-current={current(href) ? "page" : undefined}>
            <Icon className="size-[18px]" aria-hidden />
          </Link>
        </Tip>
      ))}
      <div className="mt-auto">
        <UserMenu passcode={passcode} compact />
      </div>
    </nav>
  );
}

function Expanded({ passcode }: { passcode: boolean }) {
  const current = useCurrent();
  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col">
      <Link href="/app" className="flex min-h-11 items-center gap-2.5 rounded-lg border border-line-2 bg-ground px-3 text-body font-medium text-fg transition-colors duration-150 hover:border-line-control">
        <SquarePen className="size-4" aria-hidden />
        New question
      </Link>
      <Threads />
      <nav aria-label="Console" className="mt-3 flex flex-col gap-0.5 border-t border-line pt-3">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={item} aria-current={current(href) ? "page" : undefined}>
            <Icon className="size-4 flex-none" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-2 border-t border-line pt-2">
        <UserMenu passcode={passcode} />
      </div>
    </div>
  );
}

function Threads() {
  const threads = useLocalThreads();
  const [query, setQuery] = React.useState("");
  const params = useSearchParams();
  const open = params.get("c");
  // The stored list is empty on the server and during hydration, so reading the clock
  // here cannot produce a mismatch.

  const q = query.trim().toLowerCase();
  const shown = q ? threads.filter((t) => t?.title?.toLowerCase().includes(q)) : threads;
  const { today, previous } = groupThreads(shown, new Date());

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col">
      {/* A div, not a label: `.console label` (unlayered) would beat the flex utility. */}
      <div className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-body text-fg-3 focus-within:bg-ground focus-within:outline-2 focus-within:outline-fg">
        <Search className="size-4 flex-none" aria-hidden />
        <input
          type="search"
          aria-label="Search this browser’s threads"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search threads"
          className="bare w-full bg-transparent text-fg outline-none placeholder:text-fg-3"
        />
      </div>
      <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
        <Group title="Today" threads={today} open={open} />
        <Group title="Previous 7 days" threads={previous} open={open} />
        {today.length + previous.length === 0 ? (
          <p className="px-3 py-2 text-caption text-fg-3">
            {q ? "No thread here matches." : "Questions you ask in this browser appear here."}
          </p>
        ) : null}
      </div>
      <p className="px-3 pt-1 text-caption text-fg-3">Only threads started in this browser are listed.</p>
    </div>
  );
}

function Group({ title, threads, open }: { title: string; threads: LocalThread[]; open: string | null }) {
  if (threads.length === 0) return null;
  return (
    <section aria-label={title} className="mt-2">
      <h3 className="px-3 pb-1 text-caption text-fg-3">{title}</h3>
      <ul>
        {threads.map((t) => (
          <li key={t.id}>
            <Link
              href={`/app?c=${encodeURIComponent(t.id)}`}
              aria-current={open === t.id ? "page" : undefined}
              className="flex min-h-10 items-center truncate rounded-lg px-3 text-body text-fg-2 transition-colors duration-150 hover:bg-wash-2 hover:text-fg aria-[current=page]:bg-wash-2 aria-[current=page]:text-fg"
            >
              <span className="truncate">{t.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Initials on ink, like a signature; a neutral outline until a name is set. */
function Avatar({ name }: { name: string | null }) {
  const initials = name
    ? name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]!.toUpperCase())
        .join("")
    : null;
  return initials ? (
    <span aria-hidden className="grid size-7 flex-none place-items-center rounded-full bg-fg text-[11px] font-semibold tracking-[0.02em] text-ground">
      {initials}
    </span>
  ) : (
    <span aria-hidden className="grid size-7 flex-none place-items-center rounded-full border border-line-control text-fg-2">
      <UserRound className="size-4" />
    </span>
  );
}

function UserMenu({ passcode, compact = false }: { passcode: boolean; compact?: boolean }) {
  const [name] = useDisplayName();
  const [nicknames, setNicknames] = useNicknamesOn();
  const earned = persona(useActivity());
  const [naming, setNaming] = React.useState(false);
  const access = passcode ? "Shared passcode" : "No passcode set";
  const trigger = (
    <button
      type="button"
      aria-label={name ? `Account — ${name}` : "Account"}
      className={
        compact
          ? "grid size-11 place-items-center rounded-lg transition-colors duration-150 hover:bg-wash-2"
          : "flex min-h-12 w-full items-center gap-2.5 rounded-lg px-2 text-left transition-colors duration-150 hover:bg-wash-2"
      }
    >
      <Avatar name={name} />
      {compact ? null : (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-body font-medium text-fg">{name ?? "Set your name"}</span>
          <span className="truncate text-caption text-fg-3">{access}</span>
        </span>
      )}
    </button>
  );
  return (
    <>
      <DropdownMenu>
        {compact ? (
          <Tip label="Account">
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          </Tip>
        ) : (
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        )}
        <DropdownMenuContent side={compact ? "right" : "top"} align="start" className="w-72">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar name={name} />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-body font-medium text-fg">{name ?? "No name set"}</span>
              <span className="truncate text-caption text-fg-3">{access}</span>
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="min-h-10" onSelect={() => setNaming(true)}>
            <PenLine className="size-4" aria-hidden />
            {name ? "Change your name" : "What should we call you?"}
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem
            className="min-h-10"
            checked={nicknames}
            onCheckedChange={(on) => setNicknames(on === true)}
            onSelect={(e) => e.preventDefault()}
          >
            Nicknames from when I work
          </DropdownMenuCheckboxItem>
          <DropdownMenuLabel className="text-caption font-normal text-fg-3">
            {nicknames && earned
              ? `You’re a ${PERSONA_NAME[earned]}: ${PERSONA_REASON[earned]}.`
              : "Earned after a few days of questions. Read from this browser only; never sent anywhere."}
          </DropdownMenuLabel>
          <DropdownMenuItem className="min-h-10" onSelect={() => forgetActivity()}>
            <History className="size-4" aria-hidden />
            Forget my pattern
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-caption font-normal text-fg-3">
            {passcode
              ? "There are no personal accounts yet: everyone signs in with the shared passcode."
              : "No passcode is set: anyone who can reach this console can use it."}
          </DropdownMenuLabel>
          <form action={logoutAction}>
            <DropdownMenuItem asChild>
              <button type="submit" className="flex min-h-10 w-full items-center gap-2">
                <LogOut className="size-4" aria-hidden />
                Sign out
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
      <NameDialog open={naming} onOpenChange={setNaming} />
    </>
  );
}
